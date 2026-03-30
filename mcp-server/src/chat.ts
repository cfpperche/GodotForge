import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { ConfigManager } from "./config.js";
import { executeTool, type ToolResult } from "./tool-handlers.js";
import { buildContext } from "./context/builder.js";
import { appendSessionLog } from "./memory/store.js";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { loadSkills, resolveSkill, type SkillInfo } from "./studio/skills.js";
import { loadAgents, resolveAgent, type AgentInfo } from "./studio/agents.js";
import { loadTemplates, resolveTemplate, type TemplateInfo } from "./studio/templates.js";
import { getAllToolDefinitions } from "./tool-registry.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const MAX_TOOL_LOOPS = 10;
const MAX_OUTPUT_TOKENS = 16384;
const MAX_CONTINUATION_ROUNDS = 3;
const COMPACTION_THRESHOLD = 20;
const COMPACTION_KEEP_RECENT = 6;

const BASE_SYSTEM_PROMPT =
  "You are GodotForge, an AI game development hub that orchestrates Godot Engine and Blender. " +
  "You help developers create games using AI — modeling in Blender, building in Godot, and piping assets between them. " +
  "You have tools for: Godot (scenes, nodes, scripts, runtime), Blender (meshes, materials, UV, export), " +
  "Pipeline (Blender→Godot asset flow), docs search (912 Godot + 3800 Blender classes), and project memory. " +
  "Use tools to take action — don't just describe what to do. " +
  "Be concise. Always use GDScript (not C#). Always use Godot 4.x API. " +
  "For 3D modeling, use blender.* tools. For Blender→Godot transfer, use pipeline.blender_to_godot. " +
  "IMPORTANT: ALWAYS use search_docs or get_class_reference BEFORE writing GDScript that uses Godot classes you're not 100% sure about. " +
  "The docs RAG has 4712 classes indexed — use it to verify method signatures, property names, and signal parameters. " +
  "Never guess API — look it up first. Relevant class docs may be pre-loaded in <godot-docs> or <blender-docs> below.";

interface ToolCallLog {
  name: string;
  result: string;
  is_error: boolean;
}

interface ChatResponse {
  response: string;
  tool_calls: ToolCallLog[];
  error?: string;
}

export interface StreamEvent {
  type: "text" | "tool_use" | "tool_result" | "error" | "done";
  content?: string;
  name?: string;
  status?: string;
}

export type StreamCallback = (event: StreamEvent) => void;

type AuthMode = "api_key" | "agent_sdk";

interface ChatSettings {
  auth_mode: AuthMode;
  api_key: string;
  model: string;
  max_tokens: number;
  memory_enabled: boolean;
  temperature: number;
  effort: "low" | "medium" | "high" | "max";
  thinking: "disabled" | "adaptive";
  tool_choice: "auto" | "any" | "none";
  guardrail_mode: "yolo" | "normal" | "strict";
  system_prompt_extra: string;
}

interface Message {
  role: string;
  content: unknown;
}

export class ChatEngine {
  private sessions = new Map<string, Message[]>();
  /** Agent SDK session IDs for resume — keyed by chat sessionId */
  private sdkSessionIds = new Map<string, string>();
  private settings: ChatSettings = {
    auth_mode: "agent_sdk",
    api_key: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-sonnet-4-20250514",
    max_tokens: MAX_OUTPUT_TOKENS,
    memory_enabled: true,
    temperature: 1.0,
    effort: "high",
    thinking: "disabled",
    tool_choice: "auto",
    guardrail_mode: "normal",
    system_prompt_extra: "",
  };
  private root: string;
  private repoRoot: string;
  private bridge: GodotBridge;
  private blenderBridge: BlenderBridge;
  private configManager: ConfigManager;

  constructor(root: string, bridge: GodotBridge, blenderBridge?: BlenderBridge, repoRoot?: string) {
    this.root = root;
    this.repoRoot = repoRoot || root;
    this.bridge = bridge;
    this.blenderBridge = blenderBridge || new BlenderBridge(root);
    this.configManager = new ConfigManager(root);

    // Load persisted settings from config.json
    const persisted = this.configManager.getChatSettings();
    if (persisted.model) this.settings.model = persisted.model;
    if (persisted.max_tokens) this.settings.max_tokens = persisted.max_tokens;
    if (persisted.temperature !== undefined) this.settings.temperature = persisted.temperature;
    if (persisted.effort) this.settings.effort = persisted.effort;
    if (persisted.thinking) this.settings.thinking = persisted.thinking;
    if (persisted.tool_choice) this.settings.tool_choice = persisted.tool_choice;
    if (persisted.memory_enabled !== undefined) this.settings.memory_enabled = persisted.memory_enabled;
    if (persisted.system_prompt_extra) this.settings.system_prompt_extra = persisted.system_prompt_extra;
    if (persisted.guardrail_mode) this.settings.guardrail_mode = persisted.guardrail_mode;

    // Auto-detect auth mode
    if (this.settings.api_key) {
      this.settings.auth_mode = "api_key";
    } else {
      this.settings.auth_mode = "agent_sdk";
    }

    console.error(`[GodotForge Chat] Auth: ${this.settings.auth_mode}, Model: ${this.settings.model}, Effort: ${this.settings.effort}`);
  }

  updateSettings(partial: Partial<ChatSettings>): void {
    Object.assign(this.settings, partial);

    // Persist to config.json
    const toPersist: Record<string, unknown> = {};
    const persistKeys = ["model", "max_tokens", "temperature", "effort", "thinking", "tool_choice", "guardrail_mode", "memory_enabled", "system_prompt_extra"];
    for (const key of persistKeys) {
      if (key in partial) {
        toPersist[key] = (partial as Record<string, unknown>)[key];
      }
    }
    if (Object.keys(toPersist).length > 0) {
      this.configManager.saveChatSettings(toPersist);
    }
  }

  getSettings(): ChatSettings {
    return { ...this.settings };
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sdkSessionIds.delete(sessionId);
  }

  /** Get current project root. */
  getProjectRoot(): string {
    return this.root;
  }

  /** Switch to a different game project directory. Clears all sessions. */
  switchProject(newRoot: string): void {
    // Save current project to recents before switching
    this.configManager.addRecentProject(this.root);
    this.root = newRoot;
    this.sessions.clear();
    this.sdkSessionIds.clear();
    this.configManager.addRecentProject(newRoot);
    console.error(`[GodotForge Chat] Switched project to: ${newRoot}`);
  }

  async chat(message: string, sessionId: string = "default"): Promise<ChatResponse> {
    if (this.settings.auth_mode === "agent_sdk") {
      return this.chatViaAgentSdk(message, sessionId);
    }
    return this.chatViaApi(message, sessionId);
  }

  /** Streaming chat — emits events via callback as they arrive. */
  async chatStream(message: string, sessionId: string, onEvent: StreamCallback): Promise<void> {
    if (this.settings.auth_mode === "agent_sdk") {
      return this.streamViaAgentSdk(message, sessionId, onEvent);
    }
    // Fallback: non-streaming API mode, emit result as single event
    const result = await this.chatViaApi(message, sessionId);
    if (result.error) {
      onEvent({ type: "error", content: result.error });
    } else {
      for (const tc of result.tool_calls) {
        onEvent({ type: "tool_use", name: tc.name, status: "done" });
      }
      onEvent({ type: "text", content: result.response });
    }
    onEvent({ type: "done" });
  }

  /**
   * Chat as a specific agent — isolated LLM call with agent's system prompt.
   * Used by team orchestration skills for true agent delegation.
   */
  async chatAsAgent(agentName: string, task: string, sessionId: string): Promise<ChatResponse> {
    const claudeDir = join(this.root, ".claude");
    const agents = loadAgents(claudeDir, this.getBundledClaudeDir());
    const agent = resolveAgent(agents, agentName);

    if (!agent) {
      return { response: "", tool_calls: [], error: `Agent not found: ${agentName}` };
    }

    // Build agent-specific system prompt
    let systemPrompt = `You are ${agent.name}. ${agent.description}\n\n${agent.content}`;

    // Inject relevant rules
    const rules = this.loadRules();
    if (rules) {
      systemPrompt += "\n\n<rules>\n" + rules + "\n</rules>";
    }

    // Inject project context
    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge, task);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch { /* non-critical */ }
    }

    if (this.settings.auth_mode === "agent_sdk") {
      return this.runAgentSdk(systemPrompt, task, sessionId + "-" + agentName);
    }
    return this.runAgentApi(systemPrompt, task, sessionId + "-" + agentName);
  }

  /** Run an isolated agent via Agent SDK */
  private async runAgentSdk(systemPrompt: string, task: string, sessionId: string): Promise<ChatResponse> {
    let mcpDistPath = join(this.root, "mcp-server", "dist", "index.js");
    if (!existsSync(mcpDistPath)) {
      const parentRoot = join(this.root, "..");
      mcpDistPath = join(parentRoot, "mcp-server", "dist", "index.js");
      if (!existsSync(mcpDistPath)) {
        mcpDistPath = join(import.meta.dirname || ".", "..", "dist", "index.js");
      }
    }

    const queryOptions: Record<string, unknown> = {
      model: this.settings.model,
      effort: this.settings.effort,
      maxTurns: 15,
      systemPrompt,
      cwd: this.root,
      permissionMode: "bypassPermissions",
      allowedTools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
      mcpServers: {
        godotforge: { command: "node", args: [mcpDistPath, "--project-root", this.root] },
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

  /** Run an isolated agent via direct API */
  private async runAgentApi(systemPrompt: string, task: string, _sessionId: string): Promise<ChatResponse> {
    const messages: Message[] = [{ role: "user", content: task }];
    const apiResponse = await this.callClaudeApi(systemPrompt, messages);

    if (apiResponse.error) {
      return { response: "", tool_calls: [], error: apiResponse.error };
    }

    const textBlocks = apiResponse.content
      .filter((b: Record<string, unknown>) => b.type === "text")
      .map((b: Record<string, unknown>) => b.text as string);

    return { response: textBlocks.join("\n\n"), tool_calls: [] };
  }

  private async streamViaAgentSdk(message: string, sessionId: string, onEvent: StreamCallback): Promise<void> {
    appendSessionLog(this.root, "user", message);

    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (this.settings.system_prompt_extra) {
      systemPrompt += "\n\n" + this.settings.system_prompt_extra;
    }
    const rules = this.loadRules();
    if (rules) {
      systemPrompt += "\n\n<rules>\n" + rules + "\n</rules>";
    }
    const studioCtx = this.resolveStudioContext(message);
    if (studioCtx) {
      systemPrompt += "\n\n" + studioCtx;
    }
    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge, message);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch { /* non-critical */ }
    }

    let prompt = message;
    const skillMatch = message.match(/^\/([a-z][\w-]*)\s*(.*)/);
    if (skillMatch) {
      prompt = `[Skill: ${skillMatch[1]}] ${skillMatch[2] || ""}`.trim();
    }

    let mcpDistPath = join(this.root, "mcp-server", "dist", "index.js");
    if (!existsSync(mcpDistPath)) {
      const parentRoot = join(this.root, "..");
      mcpDistPath = join(parentRoot, "mcp-server", "dist", "index.js");
      if (!existsSync(mcpDistPath)) {
        mcpDistPath = join(import.meta.dirname || ".", "..", "dist", "index.js");
      }
    }

    const existingSdkSession = this.sdkSessionIds.get(sessionId);
    const queryOptions: Record<string, unknown> = {
      model: this.settings.model,
      effort: this.settings.effort,
      maxTurns: 30,
      systemPrompt,
      cwd: this.root,
      permissionMode: "bypassPermissions",
      allowedTools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
      mcpServers: {
        godotforge: { command: "node", args: [mcpDistPath, "--project-root", this.root] },
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
        this.sdkSessionIds.set(sessionId, newSdkSessionId);
      }
      appendSessionLog(this.root, "assistant", response.slice(0, 500));
    } catch (error) {
      onEvent({ type: "error", content: error instanceof Error ? error.message : String(error) });
    }

    onEvent({ type: "done" });
  }

  /**
   * Chat via Claude Agent SDK — full tool loop, streaming, rules/skills injection.
   */
  private async chatViaAgentSdk(message: string, sessionId: string): Promise<ChatResponse> {
    appendSessionLog(this.root, "user", message);

    // Build system prompt with context + auto-RAG
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (this.settings.system_prompt_extra) {
      systemPrompt += "\n\n" + this.settings.system_prompt_extra;
    }

    // Inject rules from project's .claude/rules/ (not GodotForge's)
    const rules = this.loadRules();
    if (rules) {
      systemPrompt += "\n\n<rules>\n" + rules + "\n</rules>";
    }

    // Inject studio context (skills, agents, templates)
    const studioCtx = this.resolveStudioContext(message);
    if (studioCtx) {
      systemPrompt += "\n\n" + studioCtx;
    }

    // Rewrite /skill-name messages to avoid Agent SDK intercepting them as built-in skills.
    // The skill instructions are already in the system prompt via resolveStudioContext.
    let prompt = message;
    const skillMatch = message.match(/^\/([a-z][\w-]*)\s*(.*)/);
    if (skillMatch) {
      const skillName = skillMatch[1];
      const skillArgs = skillMatch[2] || "";
      prompt = `[Skill: ${skillName}] ${skillArgs}`.trim();
    }

    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge, message);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch { /* non-critical */ }
    }

    const toolCalls: ToolCallLog[] = [];

    try {
      // Build MCP server config pointing to our own MCP server
      let mcpDistPath = join(this.root, "mcp-server", "dist", "index.js");
      if (!existsSync(mcpDistPath)) {
        // MCP server might be installed globally or in parent
        const parentRoot = join(this.root, "..");
        mcpDistPath = join(parentRoot, "mcp-server", "dist", "index.js");
        if (!existsSync(mcpDistPath)) {
          // Fallback: use the one relative to this file
          mcpDistPath = join(import.meta.dirname || ".", "..", "dist", "index.js");
        }
      }

      // Check for existing SDK session to resume
      const existingSdkSession = this.sdkSessionIds.get(sessionId);

      let response = "";
      let newSdkSessionId: string | undefined;

      const queryOptions: Record<string, unknown> = {
        model: this.settings.model,
        effort: this.settings.effort,
        maxTurns: 30,
        systemPrompt: systemPrompt,
        cwd: this.root,
        permissionMode: "bypassPermissions",
        allowedTools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
        mcpServers: {
          godotforge: {
            command: "node",
            args: [mcpDistPath, "--project-root", this.root],
          },
        },
      };

      // Resume existing session if available (maintains full context)
      if (existingSdkSession) {
        queryOptions.resume = existingSdkSession;
      }

      for await (const msg of query({
        prompt: prompt,
        options: queryOptions as Parameters<typeof query>[0]["options"],
      })) {
        // Capture SDK session ID for resume
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

      // Save SDK session ID for future resume
      if (newSdkSessionId) {
        this.sdkSessionIds.set(sessionId, newSdkSessionId);
      }

      appendSessionLog(this.root, "assistant", response.slice(0, 500));

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

  /**
   * Chat via direct Anthropic API — fallback when API key is set.
   * Handles tool_use loop manually.
   */
  private async chatViaApi(message: string, sessionId: string): Promise<ChatResponse> {
    if (!this.settings.api_key) {
      return {
        response: "",
        tool_calls: [],
        error: "No API key configured. The Agent SDK (Claude Max/Pro) is the default mode. " +
          "Set ANTHROPIC_API_KEY env var to use API key mode instead.",
      };
    }

    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    const messages = this.sessions.get(sessionId)!;
    messages.push({ role: "user", content: message });
    appendSessionLog(this.root, "user", message);

    // Build system prompt
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (this.settings.system_prompt_extra) {
      systemPrompt += "\n\n" + this.settings.system_prompt_extra;
    }
    const rules = this.loadRules();
    if (rules) {
      systemPrompt += "\n\n<rules>\n" + rules + "\n</rules>";
    }

    // Inject studio context (skills, agents, templates)
    const studioCtx = this.resolveStudioContext(message);
    if (studioCtx) {
      systemPrompt += "\n\n" + studioCtx;
    }

    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge, message);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch { /* non-critical */ }
    }

    const toolCalls: ToolCallLog[] = [];
    let loops = 0;

    while (loops < MAX_TOOL_LOOPS) {
      loops++;
      let apiResponse = await this.callClaudeApi(systemPrompt, messages);

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

        // Continuation: if truncated by max_tokens, ask LLM to continue (max 3 times)
        let continuations = 0;
        while (apiResponse.stop_reason === "max_tokens" && continuations < MAX_CONTINUATION_ROUNDS) {
          continuations++;
          messages.push({ role: "user", content: "continue" });
          const contResponse = await this.callClaudeApi(systemPrompt, messages);
          if (contResponse.error) break;
          messages.push({ role: "assistant", content: contResponse.content });
          const contText = contResponse.content
            .filter((b: Record<string, unknown>) => b.type === "text")
            .map((b: Record<string, unknown>) => b.text as string)
            .join("\n\n");
          responseText += contText;
          apiResponse = contResponse;
        }

        appendSessionLog(this.root, "assistant", responseText.slice(0, 500));

        if (messages.length > COMPACTION_THRESHOLD) {
          this.compactSession(sessionId, messages);
        }

        return { response: responseText, tool_calls: toolCalls };
      }

      const toolResults: Array<Record<string, unknown>> = [];

      for (const block of toolUseBlocks) {
        const toolName = block.name as string;
        const toolInput = (block.input || {}) as Record<string, unknown>;
        const toolId = block.id as string;

        const result = await executeTool(toolName, toolInput, this.root, this.bridge, this.blenderBridge, this.configManager);
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

  /**
   * Load rules from bundled game-dev kit + user's project .claude/rules/.
   * Bundled rules with audience: internal are excluded.
   * User rules always included (override bundled by filename).
   */
  private loadRules(): string | null {
    const bundledDir = join(this.repoRoot, ".claude", "rules");
    const userDir = join(this.root, ".claude", "rules");
      const isSameProject = resolve(bundledDir) === resolve(userDir);

    const ruleMap = new Map<string, string>();

    try {
      // Load bundled game-dev rules first (skip internal-only rules)
      if (!isSameProject && existsSync(bundledDir)) {
        for (const file of readdirSync(bundledDir).filter((f) => f.endsWith(".md"))) {
          const raw = readFileSync(join(bundledDir, file), "utf-8").trim();
          if (!raw) continue;
          if (parseAudience(raw) === "internal") continue;
          ruleMap.set(file, raw);
        }
      }

      // Load user's project rules (always included, override by filename)
      if (existsSync(userDir)) {
        for (const file of readdirSync(userDir).filter((f) => f.endsWith(".md"))) {
          const raw = readFileSync(join(userDir, file), "utf-8").trim();
          if (raw) ruleMap.set(file, raw);
        }
      }
    } catch {
      return null;
    }

    if (ruleMap.size === 0) return null;
    return Array.from(ruleMap.values()).join("\n\n---\n\n");
  }

  /**
   * Resolve skill, agent, and template context for a message.
   * Detects /skill-name commands, matches agents by task, and injects templates.
   */
  private resolveStudioContext(message: string): string {
    const claudeDir = join(this.root, ".claude");
    const bundledDir = claudeDir !== join(this.repoRoot, ".claude") ? join(this.repoRoot, ".claude") : undefined;
    const parts: string[] = [];

    // 1. Skill routing: detect /command messages
    const skillMatch = message.match(/^\/([a-z][\w-]*)/);
    if (skillMatch) {
      const skills = loadSkills(claudeDir, bundledDir);
      const skill = resolveSkill(skills, skillMatch[1]);
      if (skill) {
        parts.push(`<active-skill name="${skill.name}">\n${skill.content}\n</active-skill>`);

        // If skill references agents (@agent-name), inject their profiles
        const agentRefs = skill.content.match(/@([a-z][\w-]+)/g);
        if (agentRefs) {
          const agents = loadAgents(claudeDir, bundledDir);
          const injected = new Set<string>();
          for (const ref of agentRefs) {
            const agentName = ref.slice(1); // remove @
            const agent = resolveAgent(agents, agentName);
            if (agent && !injected.has(agent.name)) {
              injected.add(agent.name);
              parts.push(`<agent-profile name="${agent.name}">\n${agent.content}\n</agent-profile>`);
            }
          }
        }

        // If skill references templates, inject them
        const templateRefs = skill.content.match(/`([a-z][\w-]+\.md)`/g);
        if (templateRefs) {
          const templates = loadTemplates(claudeDir, bundledDir);
          for (const ref of templateRefs) {
            const tplName = ref.replace(/`/g, "").replace(".md", "");
            const tpl = resolveTemplate(templates, tplName);
            if (tpl) {
              parts.push(`<template name="${tpl.name}">\n${tpl.content}\n</template>`);
            }
          }
        }
      }
    }

    // 2. Available skills list (always inject so LLM knows what's available)
    if (!skillMatch) {
      const skills = loadSkills(claudeDir, bundledDir);
      if (skills.length > 0) {
        const list = skills.map((s) => `- /${s.name}: ${s.description}`).join("\n");
        parts.push(`<available-skills>\nUsers can invoke these skills by typing the command:\n${list}\n</available-skills>`);
      }
    }

    return parts.length > 0 ? parts.join("\n\n") : "";
  }

  /** List available skills for HTTP API */
  getSkills(): SkillInfo[] {
    const bundledDir = this.getBundledClaudeDir();
    return loadSkills(join(this.root, ".claude"), bundledDir);
  }

  /** List available agents for HTTP API */
  getAgents(): AgentInfo[] {
    const bundledDir = this.getBundledClaudeDir();
    return loadAgents(join(this.root, ".claude"), bundledDir);
  }

  /** List available templates for HTTP API */
  getTemplates(): TemplateInfo[] {
    const bundledDir = this.getBundledClaudeDir();
    return loadTemplates(join(this.root, ".claude"), bundledDir);
  }

  /** Get bundled .claude dir from GodotForge install (undefined if same as project) */
  private getBundledClaudeDir(): string | undefined {
    const bundled = join(this.repoRoot, ".claude");
    return bundled !== join(this.root, ".claude") ? bundled : undefined;
  }

  /**
   * Compaction: summarize old messages, keep 6 most recent.
   */
  private compactSession(sessionId: string, messages: Message[]): void {
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

  private async callClaudeApi(
    systemPrompt: string,
    messages: Message[]
  ): Promise<{ content: Array<Record<string, unknown>>; stop_reason?: string; error?: string }> {
    const body: Record<string, unknown> = {
      model: this.settings.model,
      max_tokens: this.settings.max_tokens,
      system: systemPrompt,
      messages,
      tools: getToolDefinitions(),
    };

    if (this.settings.temperature !== 1.0) {
      body.temperature = this.settings.temperature;
    }
    if (this.settings.tool_choice !== "auto") {
      body.tool_choice = { type: this.settings.tool_choice };
    }
    if (this.settings.thinking === "adaptive") {
      body.thinking = { type: "adaptive" };
    }
    if (this.settings.effort !== "high") {
      body.output_config = { effort: this.settings.effort };
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.settings.api_key,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errMsg = (errBody.error as Record<string, unknown>)?.message || `HTTP ${response.status}`;
        return { content: [], error: String(errMsg) };
      }

      const data = (await response.json()) as Record<string, unknown>;
      return { content: data.content as Array<Record<string, unknown>>, stop_reason: data.stop_reason as string };
    } catch (error) {
      return {
        content: [],
        error: `API call failed: ${error instanceof Error ? error.message : error}`,
      };
    }
  }
}

/** Extract audience field from rule frontmatter. */
function parseAudience(raw: string): string | null {
  const match = raw.match(/^---\r?\n[\s\S]*?audience:\s*(\S+)[\s\S]*?\r?\n---/);
  return match ? match[1] : null;
}

// Tool definitions for direct API mode — derived from the shared tool-registry.
// The registry is populated by server.ts via regTool() during MCP server setup.
// This ensures API-key mode has access to ALL tools (editor, blender, AI, assets, pipeline).
function getToolDefinitions(): Array<Record<string, unknown>> {
  const defs = getAllToolDefinitions();
  if (defs.length > 0) return defs as unknown as Array<Record<string, unknown>>;

  // Fallback: minimal set if registry is empty (shouldn't happen in normal flow)
  return [
    { name: "get_project_context", description: "Get project metadata.", input_schema: { type: "object", properties: {} } },
    { name: "search_docs", description: "Search Godot documentation.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  ];
}
