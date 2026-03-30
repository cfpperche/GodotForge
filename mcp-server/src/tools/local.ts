import { z } from "zod";
import { ToolContext } from "./types.js";

export function registerLocalTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  // --- Local tools ---

  regTool(
    "get_project_context",
    "Get project metadata: name, Godot version, scenes, scripts, current scene.",
    {},
    async () => runTool("get_project_context", {})
  );

  regTool(
    "read_file",
    "Read any file from the Godot project directory.",
    { path: z.string().describe("Relative path from project root") },
    async (args) => runTool("read_file", args)
  );

  regTool(
    "list_files",
    "List files in a project directory with optional pattern filtering.",
    {
      directory: z.string().optional().describe("Directory relative to root"),
      pattern: z.string().optional().describe("Glob pattern (e.g. '*.gd')"),
    },
    async (args) => runTool("list_files", args)
  );

  // --- Docs tools ---

  regTool(
    "search_docs",
    "Search Godot documentation for classes, methods, properties, or signals. Uses version-aware FTS5 index.",
    {
      query: z.string().describe("Search query (e.g. 'CharacterBody2D', 'move_and_slide', 'velocity')"),
      version: z.string().optional().describe("Godot version (e.g. '4.6'). Auto-detected if omitted."),
      kind: z.enum(["class", "method", "property", "signal", "constant", "all"]).optional().describe("Filter by type"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async (args) => runTool("search_docs", args)
  );

  regTool(
    "get_class_reference",
    "Get the full Godot class reference including methods, properties, signals, and constants.",
    {
      class_name: z.string().describe("Class name (e.g. 'Node2D', 'CharacterBody2D')"),
      version: z.string().optional().describe("Godot version. Auto-detected if omitted."),
    },
    async (args) => runTool("get_class_reference", args)
  );

  // --- Memory tools ---

  regTool(
    "save_memory",
    "Save a fact, convention, pattern, or decision to the project's persistent memory.",
    {
      category: z.enum(["Conventions", "Patterns", "Decisions", "Architecture"]).describe("Memory category"),
      content: z.string().describe("What to remember (e.g. 'We use snake_case for all GDScript functions')"),
    },
    async (args) => runTool("save_memory", args)
  );

  regTool(
    "search_memory",
    "Search the project's persistent memory for facts, conventions, patterns, or decisions.",
    {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async (args) => runTool("search_memory", args)
  );

  regTool(
    "get_project_memory",
    "Get the full project memory contents and stats.",
    {},
    async () => runTool("get_project_memory", {})
  );

  // --- Config tools ---

  regTool(
    "get_service_status",
    "Check which external services have API keys configured (Sketchfab, Stability, OpenAI, ElevenLabs, etc.). Never returns actual keys.",
    {},
    async () => runTool("get_service_status", {})
  );
}
