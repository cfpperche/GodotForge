import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { ConfigManager } from "./config.js";
import { join } from "path";
import { loadSkills, type SkillInfo } from "./studio/skills.js";
import { loadAgents, type AgentInfo } from "./studio/agents.js";
import { loadTemplates, type TemplateInfo } from "./studio/templates.js";

import {
  MAX_OUTPUT_TOKENS,
  type ChatSettings,
  type ChatResponse,
  type Message,
} from "./chat/types.js";
import { chatViaApi, type ApiModeContext } from "./chat/api-mode.js";
import {
  chatViaAgentSdk,
  streamViaAgentSdk,
  chatAsAgent as _chatAsAgent,
  type AgentSdkContext,
} from "./chat/agent-sdk.js";
import { getBundledClaudeDir } from "./chat/studio.js";

export type { StreamEvent, StreamCallback, ChatResponse } from "./chat/types.js";

export class ChatEngine {
  private sessions = new Map<string, Message[]>();
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
  onProjectSwitch: ((newRoot: string) => void) | null = null;
  private bridge: GodotBridge;
  private blenderBridge: BlenderBridge;
  private configManager: ConfigManager;

  constructor(root: string, bridge: GodotBridge, blenderBridge?: BlenderBridge, repoRoot?: string) {
    this.root = root;
    this.repoRoot = repoRoot || root;
    this.bridge = bridge;
    this.blenderBridge = blenderBridge || new BlenderBridge(root);
    this.configManager = new ConfigManager(root);

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

    if (this.settings.api_key) {
      this.settings.auth_mode = "api_key";
    } else {
      this.settings.auth_mode = "agent_sdk";
    }

    console.error(`[GodotForge Chat] Auth: ${this.settings.auth_mode}, Model: ${this.settings.model}, Effort: ${this.settings.effort}`);
  }

  updateSettings(partial: Partial<ChatSettings>): void {
    Object.assign(this.settings, partial);

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

  getProjectRoot(): string {
    return this.root;
  }

  switchProject(newRoot: string): void {
    this.configManager.addRecentProject(this.root);
    this.root = newRoot;
    this.sessions.clear();
    this.sdkSessionIds.clear();
    this.configManager.addRecentProject(newRoot);
    this.onProjectSwitch?.(newRoot);
    console.error(`[GodotForge Chat] Switched project to: ${newRoot}`);
  }

  private get sdkCtx(): AgentSdkContext {
    return {
      settings: this.settings,
      root: this.root,
      repoRoot: this.repoRoot,
      bridge: this.bridge,
      blenderBridge: this.blenderBridge,
      configManager: this.configManager,
      sessions: this.sessions,
      sdkSessionIds: this.sdkSessionIds,
    };
  }

  private get apiCtx(): ApiModeContext {
    return {
      settings: this.settings,
      root: this.root,
      repoRoot: this.repoRoot,
      bridge: this.bridge,
      blenderBridge: this.blenderBridge,
      configManager: this.configManager,
      sessions: this.sessions,
    };
  }

  async chat(message: string, sessionId: string = "default"): Promise<ChatResponse> {
    if (this.settings.auth_mode === "agent_sdk") {
      return chatViaAgentSdk(message, sessionId, this.sdkCtx);
    }
    return chatViaApi(message, sessionId, this.apiCtx);
  }

  async chatStream(message: string, sessionId: string, onEvent: import("./chat/types.js").StreamCallback): Promise<void> {
    if (this.settings.auth_mode === "agent_sdk") {
      return streamViaAgentSdk(message, sessionId, onEvent, this.sdkCtx);
    }
    const result = await chatViaApi(message, sessionId, this.apiCtx);
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

  async chatAsAgent(agentName: string, task: string, sessionId: string): Promise<ChatResponse> {
    return _chatAsAgent(agentName, task, sessionId, this.sdkCtx);
  }

  getSkills(): SkillInfo[] {
    const bundledDir = getBundledClaudeDir(this.root, this.repoRoot);
    return loadSkills(join(this.root, ".claude"), bundledDir);
  }

  getAgents(): AgentInfo[] {
    const bundledDir = getBundledClaudeDir(this.root, this.repoRoot);
    return loadAgents(join(this.root, ".claude"), bundledDir);
  }

  getTemplates(): TemplateInfo[] {
    const bundledDir = getBundledClaudeDir(this.root, this.repoRoot);
    return loadTemplates(join(this.root, ".claude"), bundledDir);
  }
}
