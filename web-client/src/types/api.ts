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
  auth_mode: "api_key" | "claude_cli";
  model: string;
  max_tokens: number;
  memory_enabled: boolean;
  has_api_key: boolean;
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
