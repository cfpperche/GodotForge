import { GodotBridge } from "./bridge.js";
import { executeTool, type ToolResult } from "./tool-handlers.js";
import { buildContext } from "./context/builder.js";
import { appendSessionLog } from "./memory/store.js";

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

interface ChatSettings {
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
    api_key: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    memory_enabled: true,
  };
  private root: string;
  private bridge: GodotBridge;

  constructor(root: string, bridge: GodotBridge) {
    this.root = root;
    this.bridge = bridge;
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
    if (!this.settings.api_key) {
      return { response: "", tool_calls: [], error: "No API key configured. POST to /settings with {\"api_key\": \"sk-ant-...\"}" };
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
