/**
 * Central tool registry — single source of truth for all tool definitions.
 * server.ts populates this as it registers tools with the MCP SDK.
 * chat.ts reads from it for Claude API mode (getToolDefinitions).
 *
 * This eliminates the duplication between server.ts (zod schemas) and
 * chat.ts (hand-coded JSON schemas) that caused AI tools to be invisible
 * in API-key mode.
 */
import { z } from "zod";

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const registry: ToolDef[] = [];

/**
 * Register a tool definition. Called by server.ts during MCP server setup.
 * Converts the Zod schema to JSON Schema for Claude API compatibility.
 */
export function registerTool(
  name: string,
  description: string,
  zodSchema: Record<string, z.ZodTypeAny>
): void {
  // Build a zod object from the flat schema record
  const shape = z.object(zodSchema);
  let jsonSchema: Record<string, unknown>;
  try {
    jsonSchema = z.toJSONSchema(shape) as Record<string, unknown>;
  } catch {
    // Fallback: build minimal schema from keys
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, val] of Object.entries(zodSchema)) {
      properties[key] = { type: "string" };
      if (!val.isOptional()) {
        required.push(key);
      }
    }
    jsonSchema = { type: "object", properties, required };
  }
  // Dedup: skip if already registered (prevents accumulation on hot-reload)
  if (registry.some((t) => t.name === name)) return;
  registry.push({ name, description, input_schema: jsonSchema });
}

/**
 * Get all registered tool definitions as Claude API-compatible format.
 * Used by chat.ts for API-key auth mode.
 */
export function getAllToolDefinitions(): ToolDef[] {
  return [...registry];
}

/**
 * Get tool count for diagnostics.
 */
export function getToolCount(): number {
  return registry.length;
}

/**
 * Clear registry (for testing only — avoids cross-test contamination).
 */
export function clearRegistry(): void {
  registry.length = 0;
}
