import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { ConfigManager } from "./config.js";
import { checkGuardrails } from "./guardrails.js";
import { EventLog } from "./events.js";
import { WebhookDispatcher } from "./webhooks.js";
import { ConfirmationManager } from "./confirmations.js";
import { executeToolInner } from "./tool-handlers/dispatch.js";
import { broadcastFileChange } from "./http/files.js";
import { join } from "path";

// Shared instances — set once from index.ts or http.ts
let _eventLog: EventLog | null = null;
let _webhooks: WebhookDispatcher | null = null;
let _confirmations: ConfirmationManager | null = null;
let _guardrailMode: "yolo" | "normal" | "strict" = "normal";

export function setEventLog(log: EventLog): void { _eventLog = log; }
export function setWebhookDispatcher(wh: WebhookDispatcher): void { _webhooks = wh; }
export function setConfirmationManager(cm: ConfirmationManager): void { _confirmations = cm; }
export function setGuardrailMode(mode: "yolo" | "normal" | "strict"): void { _guardrailMode = mode; }

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export const EDITOR_TOOL_NAMES = new Set([
  "create_scene", "get_scene_tree", "open_scene",
  "add_node", "set_property", "remove_node", "rename_node",
  "duplicate_node", "move_node",
  "create_script", "read_script", "edit_script",
  "run_scene", "stop_scene", "get_game_status", "take_screenshot",
  "take_game_screenshot", "get_runtime_state", "simulate_input", "simulate_input_sequence",
  "execute_editor_script", "add_resource", "add_scene_instance",
  "save_scene", "get_node_properties", "connect_signal",
  "set_project_setting", "get_editor_errors",
]);

export async function editorTool(
  bridge: GodotBridge,
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const result = await bridge.executeTool(toolName, input);
    return {
      content: [{ type: "text" as const, text: result.result }],
      isError: result.is_error || false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    };
  }
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  root: string,
  bridge: GodotBridge,
  blenderBridge?: BlenderBridge,
  config?: ConfigManager
): Promise<ToolResult> {
  // Guardrails check
  const guard = checkGuardrails(toolName, args);
  if (!guard.allowed) {
    _eventLog?.emit({ type: "guardrail", tool: toolName, action: "blocked", reason: guard.reason, risk: guard.risk });
    _webhooks?.notify("guardrail.blocked", { tool: toolName, reason: guard.reason, risk: guard.risk });
    return { content: [{ type: "text" as const, text: `🛡️ Guardrail: ${guard.reason}` }], isError: true };
  }

  // Interactive confirmation based on guardrail mode
  const needsConfirm =
    _guardrailMode === "strict" ? guard.risk !== "safe" :
    _guardrailMode === "normal" ? guard.risk === "destructive" || guard.risk === "critical" :
    false; // yolo = never confirm
  if (needsConfirm && _confirmations) {
    const confirmed = await _confirmations.requestConfirmation(toolName, args, guard.risk);
    if (!confirmed) {
      _eventLog?.emit({ type: "guardrail", tool: toolName, action: "denied", risk: guard.risk });
      return { content: [{ type: "text" as const, text: `🛡️ Action denied by user: ${toolName}` }], isError: true };
    }
    _eventLog?.emit({ type: "guardrail", tool: toolName, action: "approved", risk: guard.risk });
  }

  // Log tool call
  const startTime = Date.now();
  _eventLog?.emit({ type: "tool_call", tool: toolName, args: sanitizeArgs(args), risk: guard.risk });

  const result = await executeToolInner(toolName, args, root, bridge, blenderBridge, config);

  // Log result
  const duration = Date.now() - startTime;
  _eventLog?.emit({
    type: "tool_result",
    tool: toolName,
    success: !result.isError,
    duration_ms: duration,
    result_preview: result.content[0]?.text?.slice(0, 200),
  });
  _webhooks?.notify(`tool_call.${toolName}`, { tool: toolName, success: !result.isError, duration_ms: duration });

  // Broadcast file changes to WebSocket clients for live file browser updates
  if (!result.isError) {
    const text = result.content[0]?.text || "";
    const resPathMatches = text.matchAll(/res:\/\/([^\s\n"]+)/g);
    for (const match of resPathMatches) {
      const filePath = join(root, match[1]);
      broadcastFileChange(root, filePath, "created");
    }
  }

  return result;
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (key.toLowerCase().includes("key") || key.toLowerCase().includes("token") || key.toLowerCase().includes("secret")) {
      sanitized[key] = "***";
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + "...[truncated]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
