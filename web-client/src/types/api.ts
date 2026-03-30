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

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  port: number;
}

export interface SettingsResponse {
  auth_mode: "api_key" | "claude_cli" | "agent_sdk";
  model: string;
  max_tokens: number;
  memory_enabled: boolean;
  has_api_key: boolean;
  temperature: number;
  effort: "low" | "medium" | "high" | "max";
  thinking: "disabled" | "adaptive";
  tool_choice: "auto" | "any" | "none";
  system_prompt_extra: string;
}

export interface KeyStatus {
  configured: boolean;
  source: "env" | "config" | "none";
}

export interface KeysResponse {
  services: Record<string, KeyStatus>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCallLog[];
  timestamp: number;
}

export interface StreamEvent {
  type: "text" | "tool_use" | "tool_result" | "error" | "done" | "confirm";
  content?: string;
  name?: string;
  status?: string;
  id?: string;
  tool?: string;
  args?: Record<string, unknown>;
  risk?: string;
}
