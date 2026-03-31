// All shared types, interfaces, and constants for the chat subsystem.
// Zero dependencies on other project modules.

export const API_URL = "https://api.anthropic.com/v1/messages";
export const API_VERSION = "2023-06-01";
export const MAX_TOOL_LOOPS = 10;
export const MAX_OUTPUT_TOKENS = 16384;
export const MAX_CONTINUATION_ROUNDS = 3;
export const COMPACTION_THRESHOLD = 20;
export const COMPACTION_KEEP_RECENT = 6;

export const BASE_SYSTEM_PROMPT =
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

export interface ToolCallLog {
  name: string;
  result: string;
  is_error: boolean;
}

export interface ChatResponse {
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

export type AuthMode = "api_key" | "agent_sdk";

export interface ChatSettings {
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

export interface Message {
  role: string;
  content: unknown;
}
