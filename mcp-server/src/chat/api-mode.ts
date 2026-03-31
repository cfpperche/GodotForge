import type { GodotBridge } from "../bridge.js";
import type { BlenderBridge } from "../blender-bridge.js";
import type { ConfigManager } from "../config.js";
import { executeTool } from "../tool-handlers.js";
import { buildContext } from "../context/builder.js";
import { appendSessionLog } from "../memory/store.js";
import { callClaudeApi } from "./api-client.js";
import { loadCopilotRules, resolveStudioContext } from "./studio.js";
import {
  BASE_SYSTEM_PROMPT,
  COMPACTION_KEEP_RECENT,
  COMPACTION_THRESHOLD,
  MAX_CONTINUATION_ROUNDS,
  MAX_TOOL_LOOPS,
  type ChatResponse,
  type ChatSettings,
  type Message,
  type ToolCallLog,
} from "./types.js";

export interface ApiModeContext {
  settings: ChatSettings;
  root: string;
  repoRoot: string;
  bridge: GodotBridge;
  blenderBridge: BlenderBridge;
  configManager: ConfigManager;
  sessions: Map<string, Message[]>;
}

/** Summarize old messages, keep COMPACTION_KEEP_RECENT most recent. */
export function compactSession(sessionId: string, messages: Message[]): void {
  const keepCount = COMPACTION_KEEP_RECENT;
  if (messages.length <= keepCount) return;

  const oldMessages = messages.slice(0, messages.length - keepCount);
  const recentMessages = messages.slice(messages.length - keepCount);

  const summaryParts: string[] = [];
  for (const msg of oldMessages) {
    if (typeof msg.content === "string" && msg.content.length > 0) {
      summaryParts.push(`${msg.role}: ${msg.content.slice(0, 200)}`);
    }
  }

  const summaryText = summaryParts.join("\n").slice(0, 2000);
  const compactedMessage: Message = {
    role: "user",
    content: `[Previous conversation summary]\n${summaryText}\n[End summary]`,
  };

  messages.length = 0;
  messages.push(compactedMessage, ...recentMessages);

  console.error(`[GodotForge Chat] Compacted session '${sessionId}': ${oldMessages.length} msgs → 1 summary + ${keepCount} recent`);
}

/** Chat via direct Anthropic API — handles tool_use loop manually. */
export async function chatViaApi(
  message: string,
  sessionId: string,
  ctx: ApiModeContext
): Promise<ChatResponse> {
  if (!ctx.settings.api_key) {
    return {
      response: "",
      tool_calls: [],
      error: "No API key configured. The Agent SDK (Claude Max/Pro) is the default mode. " +
        "Set ANTHROPIC_API_KEY env var to use API key mode instead.",
    };
  }

  if (!ctx.sessions.has(sessionId)) {
    ctx.sessions.set(sessionId, []);
  }
  const messages = ctx.sessions.get(sessionId)!;
  messages.push({ role: "user", content: message });
  appendSessionLog(ctx.root, "user", message);

  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (ctx.settings.system_prompt_extra) {
    systemPrompt += "\n\n" + ctx.settings.system_prompt_extra;
  }
  const rules = loadCopilotRules(ctx.root, ctx.repoRoot);
  if (rules) {
    systemPrompt += "\n\n<rules>\n" + rules + "\n</rules>";
  }

  const studioCtx = resolveStudioContext(message, ctx.root, ctx.repoRoot);
  if (studioCtx) {
    systemPrompt += "\n\n" + studioCtx;
  }

  if (ctx.settings.memory_enabled) {
    try {
      const context = await buildContext(ctx.root, ctx.bridge, message);
      if (context) systemPrompt += "\n\n" + context;
    } catch { /* non-critical */ }
  }

  const toolCalls: ToolCallLog[] = [];
  let loops = 0;

  while (loops < MAX_TOOL_LOOPS) {
    loops++;
    let apiResponse = await callClaudeApi(systemPrompt, messages, ctx.settings);

    if (apiResponse.error) {
      return { response: "", tool_calls: toolCalls, error: apiResponse.error };
    }

    const content = apiResponse.content;
    messages.push({ role: "assistant", content });

    const toolUseBlocks = content.filter(
      (b: Record<string, unknown>) => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      let responseText = content
        .filter((b: Record<string, unknown>) => b.type === "text")
        .map((b: Record<string, unknown>) => b.text as string)
        .join("\n\n");

      let continuations = 0;
      while (apiResponse.stop_reason === "max_tokens" && continuations < MAX_CONTINUATION_ROUNDS) {
        continuations++;
        messages.push({ role: "user", content: "continue" });
        const contResponse = await callClaudeApi(systemPrompt, messages, ctx.settings);
        if (contResponse.error) break;
        messages.push({ role: "assistant", content: contResponse.content });
        const contText = contResponse.content
          .filter((b: Record<string, unknown>) => b.type === "text")
          .map((b: Record<string, unknown>) => b.text as string)
          .join("\n\n");
        responseText += contText;
        apiResponse = contResponse;
      }

      appendSessionLog(ctx.root, "assistant", responseText.slice(0, 500));

      if (messages.length > COMPACTION_THRESHOLD) {
        compactSession(sessionId, messages);
      }

      return { response: responseText, tool_calls: toolCalls };
    }

    const toolResults: Array<Record<string, unknown>> = [];

    for (const block of toolUseBlocks) {
      const toolName = block.name as string;
      const toolInput = (block.input || {}) as Record<string, unknown>;
      const toolId = block.id as string;

      const result = await executeTool(toolName, toolInput, ctx.root, ctx.bridge, ctx.blenderBridge, ctx.configManager);
      const resultText = result.content[0]?.text || "";
      const isError = result.isError || false;

      toolCalls.push({ name: toolName, result: resultText.slice(0, 200), is_error: isError });

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolId,
        content: resultText,
        ...(isError ? { is_error: true } : {}),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    response: "Tool execution limit reached.",
    tool_calls: toolCalls,
    error: "Max tool loops exceeded",
  };
}
