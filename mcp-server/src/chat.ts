import { GodotBridge } from "./bridge.js";
import { executeTool, type ToolResult } from "./tool-handlers.js";
import { buildContext } from "./context/builder.js";
import { appendSessionLog } from "./memory/store.js";
import { execSync, execFileSync } from "child_process";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const MAX_TOOL_LOOPS = 10;

const BASE_SYSTEM_PROMPT =
  "You are GodotForge, an AI assistant for the Godot game engine. " +
  "You help developers create games without leaving the editor. " +
  "You have tools to create scenes, add nodes, set properties, write GDScript, " +
  "search Godot documentation, manage project memory, and run games. " +
  "Use tools to take action — don't just describe what to do. " +
  "Be concise. Always use GDScript (not C#). Always use Godot 4.x API.";

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

type AuthMode = "api_key" | "claude_cli";

interface ChatSettings {
  auth_mode: AuthMode;
  api_key: string;
  model: string;
  max_tokens: number;
  memory_enabled: boolean;
}

interface Message {
  role: string;
  content: unknown;
}

// Tool definitions for Claude API (JSON schema format)
function getToolDefinitions(): Array<Record<string, unknown>> {
  return [
    { name: "create_scene", description: "Create a new scene with a root node.", input_schema: { type: "object", properties: { path: { type: "string" }, root_type: { type: "string" }, root_name: { type: "string" } }, required: ["path", "root_type"] } },
    { name: "open_scene", description: "Open a scene in the editor.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "get_scene_tree", description: "Get the node hierarchy of the current scene.", input_schema: { type: "object", properties: {} } },
    { name: "add_node", description: "Add a child node to the scene.", input_schema: { type: "object", properties: { parent_path: { type: "string" }, type: { type: "string" }, name: { type: "string" } }, required: ["parent_path", "type", "name"] } },
    { name: "set_property", description: "Set a property on a node.", input_schema: { type: "object", properties: { node_path: { type: "string" }, property: { type: "string" }, value: {} }, required: ["node_path", "property", "value"] } },
    { name: "remove_node", description: "Remove a node from the scene.", input_schema: { type: "object", properties: { node_path: { type: "string" } }, required: ["node_path"] } },
    { name: "rename_node", description: "Rename a node.", input_schema: { type: "object", properties: { node_path: { type: "string" }, new_name: { type: "string" } }, required: ["node_path", "new_name"] } },
    { name: "duplicate_node", description: "Duplicate a node and its children.", input_schema: { type: "object", properties: { node_path: { type: "string" }, new_name: { type: "string" } }, required: ["node_path"] } },
    { name: "move_node", description: "Move a node to a new parent.", input_schema: { type: "object", properties: { node_path: { type: "string" }, new_parent_path: { type: "string" } }, required: ["node_path", "new_parent_path"] } },
    { name: "create_script", description: "Create a GDScript file.", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, attach_to: { type: "string" } }, required: ["path", "content"] } },
    { name: "read_script", description: "Read a GDScript file.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "edit_script", description: "Edit a GDScript file. Use content for full rewrite, or old_text+new_text for find-replace.", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, old_text: { type: "string" }, new_text: { type: "string" } }, required: ["path"] } },
    { name: "run_scene", description: "Run a scene in Godot.", input_schema: { type: "object", properties: { scene_path: { type: "string" } } } },
    { name: "stop_scene", description: "Stop the running scene.", input_schema: { type: "object", properties: {} } },
    { name: "get_game_status", description: "Check if a scene is running.", input_schema: { type: "object", properties: {} } },
    { name: "take_screenshot", description: "Take a screenshot of the editor.", input_schema: { type: "object", properties: { output_path: { type: "string" } } } },
    { name: "execute_editor_script", description: "Execute GDScript in the editor. Use _result = 'text' to return output.", input_schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } },
    { name: "add_resource", description: "Create and assign a Resource to a node property (e.g., RectangleShape2D to shape).", input_schema: { type: "object", properties: { node_path: { type: "string" }, property: { type: "string" }, resource_type: { type: "string" }, resource_properties: { type: "object" } }, required: ["node_path", "property", "resource_type"] } },
    { name: "add_scene_instance", description: "Instance a .tscn scene as child node.", input_schema: { type: "object", properties: { scene_path: { type: "string" }, parent_path: { type: "string" }, name: { type: "string" } }, required: ["scene_path"] } },
    { name: "save_scene", description: "Save the current scene to disk.", input_schema: { type: "object", properties: {} } },
    { name: "get_node_properties", description: "Get all properties of a node.", input_schema: { type: "object", properties: { node_path: { type: "string" }, filter: { type: "string" } }, required: ["node_path"] } },
    { name: "connect_signal", description: "Connect a signal to a method.", input_schema: { type: "object", properties: { source_path: { type: "string" }, signal_name: { type: "string" }, target_path: { type: "string" }, method_name: { type: "string" } }, required: ["source_path", "signal_name", "target_path", "method_name"] } },
    { name: "set_project_setting", description: "Set a Godot project setting.", input_schema: { type: "object", properties: { key: { type: "string" }, value: {} }, required: ["key", "value"] } },
    { name: "get_editor_errors", description: "Get recent editor errors and warnings.", input_schema: { type: "object", properties: {} } },
    { name: "get_project_context", description: "Get project metadata.", input_schema: { type: "object", properties: {} } },
    { name: "read_file", description: "Read any file from the project.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "list_files", description: "List files in a directory.", input_schema: { type: "object", properties: { directory: { type: "string" }, pattern: { type: "string" } } } },
    { name: "search_docs", description: "Search Godot documentation.", input_schema: { type: "object", properties: { query: { type: "string" }, version: { type: "string" }, kind: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
    { name: "get_class_reference", description: "Get full Godot class reference.", input_schema: { type: "object", properties: { class_name: { type: "string" }, version: { type: "string" } }, required: ["class_name"] } },
    { name: "save_memory", description: "Save a fact to project memory.", input_schema: { type: "object", properties: { category: { type: "string" }, content: { type: "string" } }, required: ["category", "content"] } },
    { name: "search_memory", description: "Search project memory.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "get_project_memory", description: "Get full project memory.", input_schema: { type: "object", properties: {} } },
  ];
}

export class ChatEngine {
  private sessions = new Map<string, Message[]>();
  private settings: ChatSettings = {
    auth_mode: "claude_cli",
    api_key: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    memory_enabled: true,
  };
  private root: string;
  private bridge: GodotBridge;
  private claudeCliPath: string = "";

  constructor(root: string, bridge: GodotBridge) {
    this.root = root;
    this.bridge = bridge;
    this.claudeCliPath = this.detectClaudeCli();

    // Auto-detect auth mode
    if (this.settings.api_key) {
      this.settings.auth_mode = "api_key";
    } else if (this.claudeCliPath) {
      this.settings.auth_mode = "claude_cli";
    }

    console.error(`[GodotForge Chat] Auth: ${this.settings.auth_mode}, CLI: ${this.claudeCliPath || "not found"}`);
  }

  private detectClaudeCli(): string {
    // Try common paths
    const candidates = [
      "/usr/local/bin/claude",
      "/usr/bin/claude",
      `${process.env.HOME}/.local/bin/claude`,
      `${process.env.HOME}/.npm-global/bin/claude`,
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    // Try which
    try {
      return execSync("which claude 2>/dev/null", { encoding: "utf-8" }).trim();
    } catch {
      return "";
    }
  }

  updateSettings(partial: Partial<ChatSettings>): void {
    Object.assign(this.settings, partial);
  }

  getSettings(): ChatSettings {
    return { ...this.settings };
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async chat(message: string, sessionId: string = "default"): Promise<ChatResponse> {
    // Route by auth mode
    if (this.settings.auth_mode === "claude_cli") {
      return this.chatViaCli(message, sessionId);
    }

    if (!this.settings.api_key) {
      return {
        response: "",
        tool_calls: [],
        error: "No API key and Claude CLI not found. Either:\n- Set ANTHROPIC_API_KEY env var\n- Install Claude Code: npm i -g @anthropic-ai/claude-code && claude login",
      };
    }

    // Get or create session
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    const messages = this.sessions.get(sessionId)!;

    // Add user message
    messages.push({ role: "user", content: message });

    // Log session
    appendSessionLog(this.root, "user", message);

    // Build system prompt with context
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch {
        // Context build failure is non-critical
      }
    }

    // Tool use loop
    const toolCalls: ToolCallLog[] = [];
    let loops = 0;

    while (loops < MAX_TOOL_LOOPS) {
      loops++;

      const apiResponse = await this.callClaudeApi(systemPrompt, messages);

      if (apiResponse.error) {
        return { response: "", tool_calls: toolCalls, error: apiResponse.error };
      }

      const content = apiResponse.content;
      messages.push({ role: "assistant", content });

      // Check for tool_use blocks
      const toolUseBlocks = content.filter(
        (b: Record<string, unknown>) => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        // No more tools — extract text response
        const textBlocks = content
          .filter((b: Record<string, unknown>) => b.type === "text")
          .map((b: Record<string, unknown>) => b.text as string);

        const response = textBlocks.join("\n\n");
        appendSessionLog(this.root, "assistant", response.slice(0, 500));

        // Trim session if too long
        if (messages.length > 40) {
          messages.splice(0, messages.length - 20);
        }

        return { response, tool_calls: toolCalls };
      }

      // Execute tools
      const toolResults: Array<Record<string, unknown>> = [];

      for (const block of toolUseBlocks) {
        const toolName = block.name as string;
        const toolInput = (block.input || {}) as Record<string, unknown>;
        const toolId = block.id as string;

        const result = await executeTool(toolName, toolInput, this.root, this.bridge);
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

  private async chatViaCli(message: string, sessionId: string): Promise<ChatResponse> {
    if (!this.claudeCliPath) {
      return {
        response: "",
        tool_calls: [],
        error: "Claude CLI not found. Install: npm i -g @anthropic-ai/claude-code && claude login",
      };
    }

    appendSessionLog(this.root, "user", message);

    // Build context-enhanced prompt
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch { /* non-critical */ }
    }

    // Build conversation context from session
    const messages = this.sessions.get(sessionId) || [];
    let conversationContext = "";
    const recentMsgs = messages.slice(-6);
    for (const msg of recentMsgs) {
      if (typeof msg.content === "string") {
        conversationContext += `${msg.role}: ${msg.content}\n\n`;
      }
    }

    const fullPrompt = conversationContext
      ? `${conversationContext}user: ${message}`
      : message;

    try {
      // Write temp files for CLI
      const gfDir = join(this.root, ".godotforge");
      mkdirSync(gfDir, { recursive: true });

      const systemPromptPath = join(gfDir, "system-prompt.txt");
      writeFileSync(systemPromptPath, systemPrompt);

      // Write MCP config so CLI has access to GodotForge tools
      const mcpConfigPath = join(gfDir, "mcp-cli-config.json");
      // Find the MCP server dist — check project root and parent
      let mcpDistPath = join(this.root, "mcp-server", "dist", "index.js");
      if (!existsSync(mcpDistPath)) {
        const parentRoot = join(this.root, "..");
        mcpDistPath = join(parentRoot, "mcp-server", "dist", "index.js");
      }

      writeFileSync(mcpConfigPath, JSON.stringify({
        mcpServers: {
          godotforge: {
            command: "node",
            args: [mcpDistPath, "--project-root", this.root],
          },
        },
      }));

      const args = [
        "--print",
        "--output-format", "text",
        "--model", this.settings.model,
        "--system-prompt-file", systemPromptPath,
        "--mcp-config", mcpConfigPath,
        "-p", "-",
      ];

      const output = execFileSync(this.claudeCliPath, args, {
        input: fullPrompt,
        encoding: "utf-8",
        timeout: 300_000,
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env },
      });

      const response = output.trim();

      // Store in session
      if (!this.sessions.has(sessionId)) this.sessions.set(sessionId, []);
      const sess = this.sessions.get(sessionId)!;
      sess.push({ role: "user", content: message });
      sess.push({ role: "assistant", content: response });
      if (sess.length > 40) sess.splice(0, sess.length - 20);

      appendSessionLog(this.root, "assistant", response.slice(0, 500));

      return { response, tool_calls: [] };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        response: "",
        tool_calls: [],
        error: `Claude CLI error: ${errMsg.slice(0, 500)}`,
      };
    }
  }

  private async callClaudeApi(
    systemPrompt: string,
    messages: Message[]
  ): Promise<{ content: Array<Record<string, unknown>>; error?: string }> {
    const body = {
      model: this.settings.model,
      max_tokens: this.settings.max_tokens,
      system: systemPrompt,
      messages,
      tools: getToolDefinitions(),
    };

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
      return { content: data.content as Array<Record<string, unknown>> };
    } catch (error) {
      return {
        content: [],
        error: `API call failed: ${error instanceof Error ? error.message : error}`,
      };
    }
  }
}
