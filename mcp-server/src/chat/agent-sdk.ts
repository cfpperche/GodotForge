import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { existsSync } from "fs";
import { join } from "path";
import type { GodotBridge } from "../bridge.js";
import type { BlenderBridge } from "../blender-bridge.js";
import type { ConfigManager } from "../config.js";
import { buildContext } from "../context/builder.js";
import { appendSessionLog } from "../memory/store.js";
import { loadAgents, resolveAgent } from "../studio/agents.js";
import { callClaudeApi } from "./api-client.js";
import { loadCopilotRules, resolveStudioContext } from "./studio.js";
import {
  BASE_SYSTEM_PROMPT,
  type ChatSettings,
  type ChatResponse,
  type Message,
  type StreamCallback,
  type ToolCallLog,
} from "./types.js";

export interface AgentSdkContext {
  settings: ChatSettings;
  root: string;
  repoRoot: string;
  bridge: GodotBridge;
  blenderBridge: BlenderBridge;
  configManager: ConfigManager;
  sessions: Map<string, Message[]>;
  sdkSessionIds: Map<string, string>;
  persistSession?: (sessionId: string) => void;
  getOrLoadSession?: (sessionId: string) => Message[];
}

function resolveMcpDistPath(root: string): string {
  let mcpDistPath = join(root, "mcp-server", "dist", "index.js");
  if (!existsSync(mcpDistPath)) {
    const parentRoot = join(root, "..");
    mcpDistPath = join(parentRoot, "mcp-server", "dist", "index.js");
    if (!existsSync(mcpDistPath)) {
      mcpDistPath = join(import.meta.dirname || ".", "..", "dist", "index.js");
    }
  }
  return mcpDistPath;
}

function buildBaseSystemPrompt(message: string, ctx: AgentSdkContext): string {
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
  return systemPrompt;
}

function rewriteSkillMessage(message: string): string {
  const skillMatch = message.match(/^\/([a-z][\w-]*)\s*(.*)/);
  if (skillMatch) {
    return `[Skill: ${skillMatch[1]}] ${skillMatch[2] || ""}`.trim();
  }
  return message;
}

/** Run an isolated agent via Agent SDK. */
export async function runAgentSdk(
  systemPrompt: string,
  task: string,
  sessionId: string,
  ctx: AgentSdkContext
): Promise<ChatResponse> {
  const mcpDistPath = resolveMcpDistPath(ctx.root);

  const queryOptions: Record<string, unknown> = {
    model: ctx.settings.model,
    effort: ctx.settings.effort,
    maxTurns: 15,
    systemPrompt,
    cwd: ctx.root,
    permissionMode: "bypassPermissions",
    allowedTools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
    mcpServers: {
      godotforge: { command: "node", args: [mcpDistPath, "--project-root", ctx.root] },
    },
  };

  let response = "";
  const toolCalls: ToolCallLog[] = [];

  try {
    for await (const msg of query({
      prompt: task,
      options: queryOptions as Parameters<typeof query>[0]["options"],
    })) {
      if (msg.type === "assistant") {
        const content = (msg as SDKMessage & { message: { content: Array<Record<string, unknown>> } }).message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              toolCalls.push({ name: block.name as string, result: "", is_error: false });
            }
            if (block.type === "text" && typeof block.text === "string") {
              response = block.text;
            }
          }
        }
      }
      if (msg.type === "result") {
        const resultMsg = msg as SDKMessage & { result?: string; subtype?: string };
        if (resultMsg.subtype === "success") {
          response = resultMsg.result || response;
        }
      }
    }

    return { response, tool_calls: toolCalls };
  } catch (error) {
    return { response: "", tool_calls: toolCalls, error: `Agent error: ${error instanceof Error ? error.message : error}` };
  }
}

/** Run an isolated agent via direct API. */
export async function runAgentApi(
  systemPrompt: string,
  task: string,
  _sessionId: string,
  ctx: AgentSdkContext
): Promise<ChatResponse> {
  const messages: Message[] = [{ role: "user", content: task }];
  const apiResponse = await callClaudeApi(systemPrompt, messages, ctx.settings);

  if (apiResponse.error) {
    return { response: "", tool_calls: [], error: apiResponse.error };
  }

  const textBlocks = apiResponse.content
    .filter((b: Record<string, unknown>) => b.type === "text")
    .map((b: Record<string, unknown>) => b.text as string);

  return { response: textBlocks.join("\n\n"), tool_calls: [] };
}

/**
 * Chat as a specific agent — isolated LLM call with agent's system prompt.
 * Used by team orchestration skills for true agent delegation.
 */
export async function chatAsAgent(
  agentName: string,
  task: string,
  sessionId: string,
  ctx: AgentSdkContext
): Promise<ChatResponse> {
  const { join: pathJoin } = await import("path");
  const claudeDir = pathJoin(ctx.root, ".claude");
  const agents = loadAgents(claudeDir, ctx.repoRoot !== ctx.root ? pathJoin(ctx.repoRoot, ".claude") : undefined);
  const agent = resolveAgent(agents, agentName);

  if (!agent) {
    return { response: "", tool_calls: [], error: `Agent not found: ${agentName}` };
  }

  let systemPrompt = `You are ${agent.name}. ${agent.description}\n\n${agent.content}`;

  const rules = loadCopilotRules(ctx.root, ctx.repoRoot);
  if (rules) {
    systemPrompt += "\n\n<rules>\n" + rules + "\n</rules>";
  }

  if (ctx.settings.memory_enabled) {
    try {
      const context = await buildContext(ctx.root, ctx.bridge, task);
      if (context) systemPrompt += "\n\n" + context;
    } catch { /* non-critical */ }
  }

  if (ctx.settings.auth_mode === "agent_sdk") {
    return runAgentSdk(systemPrompt, task, sessionId + "-" + agentName, ctx);
  }
  return runAgentApi(systemPrompt, task, sessionId + "-" + agentName, ctx);
}

/** Chat via Agent SDK with streaming events. */
export async function streamViaAgentSdk(
  message: string,
  sessionId: string,
  onEvent: StreamCallback,
  ctx: AgentSdkContext
): Promise<void> {
  appendSessionLog(ctx.root, "user", message);

  let systemPrompt = await buildBaseSystemPrompt(message, ctx);
  if (ctx.settings.memory_enabled) {
    try {
      const context = await buildContext(ctx.root, ctx.bridge, message);
      if (context) systemPrompt += "\n\n" + context;
    } catch { /* non-critical */ }
  }

  const prompt = rewriteSkillMessage(message);
  const mcpDistPath = resolveMcpDistPath(ctx.root);
  const existingSdkSession = ctx.sdkSessionIds.get(sessionId);

  const queryOptions: Record<string, unknown> = {
    model: ctx.settings.model,
    effort: ctx.settings.effort,
    maxTurns: 30,
    systemPrompt,
    cwd: ctx.root,
    permissionMode: "bypassPermissions",
    allowedTools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
    mcpServers: {
      godotforge: { command: "node", args: [mcpDistPath, "--project-root", ctx.root] },
    },
  };
  if (existingSdkSession) {
    queryOptions.resume = existingSdkSession;
  }

  let response = "";
  let newSdkSessionId: string | undefined;

  try {
    for await (const msg of query({
      prompt,
      options: queryOptions as Parameters<typeof query>[0]["options"],
    })) {
      if (msg.type === "system") {
        const sysMsg = msg as SDKMessage & { session_id?: string; subtype?: string };
        if (sysMsg.subtype === "init" && sysMsg.session_id) {
          newSdkSessionId = sysMsg.session_id;
        }
      }

      if (msg.type === "assistant") {
        const content = (msg as SDKMessage & { message: { content: Array<Record<string, unknown>> } }).message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              onEvent({ type: "tool_use", name: block.name as string, status: "started" });
            }
            if (block.type === "text" && typeof block.text === "string") {
              onEvent({ type: "text", content: block.text });
              response = block.text;
            }
          }
        }
      }

      if (msg.type === "result") {
        const resultMsg = msg as SDKMessage & { result?: string; subtype?: string; num_turns?: number; total_cost_usd?: number };
        if (resultMsg.subtype === "success") {
          if (resultMsg.result && resultMsg.result !== response) {
            onEvent({ type: "text", content: resultMsg.result });
            response = resultMsg.result;
          }
        } else {
          onEvent({ type: "error", content: `Agent SDK: ${resultMsg.subtype}` });
        }
      }
    }

    if (newSdkSessionId) {
      ctx.sdkSessionIds.set(sessionId, newSdkSessionId);
    }
    appendSessionLog(ctx.root, "assistant", response.slice(0, 500));

    // Persist session for crash recovery
    if (!ctx.sessions.has(sessionId)) ctx.sessions.set(sessionId, []);
    const msgs = ctx.sessions.get(sessionId)!;
    msgs.push({ role: "user", content: message });
    msgs.push({ role: "assistant", content: response });
    ctx.persistSession?.(sessionId);
  } catch (error) {
    onEvent({ type: "error", content: error instanceof Error ? error.message : String(error) });
  }

  onEvent({ type: "done" });
}

/** Chat via Agent SDK — full tool loop with session resume. */
export async function chatViaAgentSdk(
  message: string,
  sessionId: string,
  ctx: AgentSdkContext
): Promise<ChatResponse> {
  appendSessionLog(ctx.root, "user", message);

  let systemPrompt = await buildBaseSystemPrompt(message, ctx);

  const prompt = rewriteSkillMessage(message);

  if (ctx.settings.memory_enabled) {
    try {
      const context = await buildContext(ctx.root, ctx.bridge, message);
      if (context) systemPrompt += "\n\n" + context;
    } catch { /* non-critical */ }
  }

  const toolCalls: ToolCallLog[] = [];

  try {
    const mcpDistPath = resolveMcpDistPath(ctx.root);
    const existingSdkSession = ctx.sdkSessionIds.get(sessionId);

    let response = "";
    let newSdkSessionId: string | undefined;

    const queryOptions: Record<string, unknown> = {
      model: ctx.settings.model,
      effort: ctx.settings.effort,
      maxTurns: 30,
      systemPrompt: systemPrompt,
      cwd: ctx.root,
      permissionMode: "bypassPermissions",
      allowedTools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
      mcpServers: {
        godotforge: {
          command: "node",
          args: [mcpDistPath, "--project-root", ctx.root],
        },
      },
    };

    if (existingSdkSession) {
      queryOptions.resume = existingSdkSession;
    }

    for await (const msg of query({
      prompt: prompt,
      options: queryOptions as Parameters<typeof query>[0]["options"],
    })) {
      if (msg.type === "system") {
        const sysMsg = msg as SDKMessage & { session_id?: string; subtype?: string };
        if (sysMsg.subtype === "init" && sysMsg.session_id) {
          newSdkSessionId = sysMsg.session_id;
        }
      }

      if (msg.type === "assistant") {
        const content = (msg as SDKMessage & { message: { content: Array<Record<string, unknown>> } }).message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              toolCalls.push({
                name: block.name as string,
                result: "",
                is_error: false,
              });
            }
            if (block.type === "text" && typeof block.text === "string") {
              response = block.text;
            }
          }
        }
      }

      if (msg.type === "result") {
        const resultMsg = msg as SDKMessage & { result?: string; subtype?: string; num_turns?: number; total_cost_usd?: number };
        if (resultMsg.subtype === "success") {
          response = resultMsg.result || response;
        } else {
          return {
            response: "",
            tool_calls: toolCalls,
            error: `Agent SDK error: ${resultMsg.subtype}`,
          };
        }

        if (resultMsg.num_turns && resultMsg.num_turns > 1) {
          console.error(`[GodotForge Chat] Agent SDK: ${resultMsg.num_turns} turns, $${(resultMsg.total_cost_usd || 0).toFixed(4)}, session: ${newSdkSessionId || existingSdkSession || "new"}`);
        }
      }
    }

    if (newSdkSessionId) {
      ctx.sdkSessionIds.set(sessionId, newSdkSessionId);
    }

    appendSessionLog(ctx.root, "assistant", response.slice(0, 500));

    // Persist session for crash recovery
    if (!ctx.sessions.has(sessionId)) ctx.sessions.set(sessionId, []);
    const msgs = ctx.sessions.get(sessionId)!;
    msgs.push({ role: "user", content: message });
    msgs.push({ role: "assistant", content: response });
    ctx.persistSession?.(sessionId);

    return { response, tool_calls: toolCalls };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      response: "",
      tool_calls: toolCalls,
      error: `Agent SDK error: ${errMsg.slice(0, 500)}`,
    };
  }
}
