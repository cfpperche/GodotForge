import { getAllToolDefinitions } from "../tool-registry.js";
import {
  API_URL,
  API_VERSION,
  type ChatSettings,
  type Message,
} from "./types.js";

export async function callClaudeApi(
  systemPrompt: string,
  messages: Message[],
  settings: ChatSettings
): Promise<{ content: Array<Record<string, unknown>>; stop_reason?: string; error?: string }> {
  const body: Record<string, unknown> = {
    model: settings.model,
    max_tokens: settings.max_tokens,
    system: systemPrompt,
    messages,
    tools: getToolDefinitions(),
  };

  if (settings.temperature !== 1.0) {
    body.temperature = settings.temperature;
  }
  if (settings.tool_choice !== "auto") {
    body.tool_choice = { type: settings.tool_choice };
  }
  if (settings.thinking === "adaptive") {
    body.thinking = { type: "adaptive" };
  }
  if (settings.effort !== "high") {
    body.output_config = { effort: settings.effort };
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.api_key,
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

/** Tool definitions for direct API mode — derived from the shared tool-registry. */
export function getToolDefinitions(): Array<Record<string, unknown>> {
  const defs = getAllToolDefinitions();
  if (defs.length > 0) return defs as unknown as Array<Record<string, unknown>>;

  // Fallback: minimal set if registry is empty (shouldn't happen in normal flow)
  return [
    { name: "get_project_context", description: "Get project metadata.", input_schema: { type: "object", properties: {} } },
    { name: "search_docs", description: "Search Godot documentation.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  ];
}
