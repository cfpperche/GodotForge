import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GodotBridge } from "./bridge.js";
import { TOOLS, EDITOR_TOOLS } from "./tools.js";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";
import { ensureDocsReady, detectGodotVersion } from "./docs/indexer.js";
import { searchDocs, getClassReference } from "./docs/search.js";

export function createServer(projectRoot?: string): McpServer {
  const bridge = new GodotBridge(projectRoot);
  const root = projectRoot || process.cwd();

  const server = new McpServer({
    name: "godotforge",
    version: "0.1.0",
  });

  // --- Editor tools (delegate to Godot plugin) ---

  server.tool(
    "create_scene",
    "Create a new scene with a root node and save it as a .tscn file.",
    {
      path: z.string().describe("File path (e.g. 'res://scenes/player.tscn')"),
      root_type: z.string().describe("Node type for root (e.g. 'CharacterBody2D')"),
      root_name: z.string().optional().describe("Name for the root node"),
    },
    async (args) => editorTool(bridge, "create_scene", args)
  );

  server.tool(
    "get_scene_tree",
    "Get the node hierarchy of the currently edited scene.",
    {},
    async () => editorTool(bridge, "get_scene_tree", {})
  );

  server.tool(
    "add_node",
    "Add a child node to a node in the currently edited scene.",
    {
      parent_path: z.string().describe("NodePath to parent (e.g. '.' for root)"),
      type: z.string().describe("Node type (e.g. 'Sprite2D')"),
      name: z.string().describe("Name for the new node"),
    },
    async (args) => editorTool(bridge, "add_node", args)
  );

  server.tool(
    "set_property",
    "Set a property on a node in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to target node"),
      property: z.string().describe("Property name"),
      value: z.any().describe("Value to set"),
    },
    async (args) => editorTool(bridge, "set_property", args)
  );

  server.tool(
    "create_script",
    "Create a new GDScript file with the given content.",
    {
      path: z.string().describe("File path (e.g. 'res://scripts/player.gd')"),
      content: z.string().describe("Full GDScript source code"),
      attach_to: z.string().optional().describe("NodePath to attach script to"),
    },
    async (args) => editorTool(bridge, "create_script", args)
  );

  server.tool(
    "read_script",
    "Read the content of a GDScript file.",
    {
      path: z.string().describe("File path (e.g. 'res://scripts/player.gd')"),
    },
    async (args) => editorTool(bridge, "read_script", args)
  );

  // --- Local tools ---

  server.tool(
    "get_project_context",
    "Get project metadata: name, Godot version, scenes, scripts, current scene.",
    {},
    async () => {
      try {
        const ctx = await bridge.getProjectContext();
        return { content: [{ type: "text" as const, text: JSON.stringify(ctx, null, 2) }] };
      } catch {
        // Fallback: read project.godot directly
        const projectFile = join(root, "project.godot");
        if (existsSync(projectFile)) {
          const content = readFileSync(projectFile, "utf-8");
          return {
            content: [
              {
                type: "text" as const,
                text: `[Godot not running — reading project.godot directly]\n\n${content}`,
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: "No Godot project found in current directory." }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "read_file",
    "Read any file from the Godot project directory.",
    {
      path: z.string().describe("Relative path from project root"),
    },
    async ({ path }) => {
      const fullPath = resolve(root, path);
      // Security: ensure path is within project root
      if (!fullPath.startsWith(resolve(root))) {
        return {
          content: [{ type: "text" as const, text: "Error: path must be within project root." }],
          isError: true,
        };
      }
      if (!existsSync(fullPath)) {
        return {
          content: [{ type: "text" as const, text: `File not found: ${path}` }],
          isError: true,
        };
      }
      const content = readFileSync(fullPath, "utf-8");
      return { content: [{ type: "text" as const, text: content }] };
    }
  );

  server.tool(
    "list_files",
    "List files in a project directory with optional pattern filtering.",
    {
      directory: z.string().optional().describe("Directory relative to root"),
      pattern: z.string().optional().describe("Glob pattern (e.g. '*.gd')"),
    },
    async ({ directory, pattern }) => {
      const dir = resolve(root, directory || ".");
      if (!dir.startsWith(resolve(root))) {
        return {
          content: [{ type: "text" as const, text: "Error: path must be within project root." }],
          isError: true,
        };
      }
      if (!existsSync(dir)) {
        return {
          content: [{ type: "text" as const, text: `Directory not found: ${directory}` }],
          isError: true,
        };
      }

      const entries = readdirSync(dir);
      let files = entries.map((name) => {
        const full = join(dir, name);
        const isDir = statSync(full).isDirectory();
        return isDir ? `${name}/` : name;
      });

      if (pattern) {
        const regex = new RegExp(
          "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
        );
        files = files.filter((f) => regex.test(f.replace("/", "")));
      }

      return {
        content: [{ type: "text" as const, text: files.join("\n") || "(empty directory)" }],
      };
    }
  );

  // --- Docs tools ---

  server.tool(
    "search_docs",
    "Search Godot documentation for classes, methods, properties, or signals. Uses version-aware FTS5 index.",
    {
      query: z.string().describe("Search query (e.g. 'CharacterBody2D', 'move_and_slide', 'velocity')"),
      version: z.string().optional().describe("Godot version (e.g. '4.6'). Auto-detected if omitted."),
      kind: z.enum(["class", "method", "property", "signal", "constant", "all"]).optional().describe("Filter by type"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async ({ query, version, kind, limit }) => {
      try {
        const ver = version || detectGodotVersion(root) || "4.3";
        const db = await ensureDocsReady(ver);
        const results = searchDocs(db, query, kind || "all", limit || 10);

        if (results.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No results found for "${query}" in Godot ${ver} docs.` }],
          };
        }

        const formatted = results
          .map((r) => `[${r.kind}] ${r.class_name}.${r.symbol_name}\n  ${r.description}`)
          .join("\n\n");

        return {
          content: [{ type: "text" as const, text: `Godot ${ver} docs — ${results.length} results:\n\n${formatted}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Docs search failed: ${error instanceof Error ? error.message : error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_class_reference",
    "Get the full Godot class reference including methods, properties, signals, and constants.",
    {
      class_name: z.string().describe("Class name (e.g. 'Node2D', 'CharacterBody2D')"),
      version: z.string().optional().describe("Godot version. Auto-detected if omitted."),
    },
    async ({ class_name, version }) => {
      try {
        const ver = version || detectGodotVersion(root) || "4.3";
        const db = await ensureDocsReady(ver);
        const ref = getClassReference(db, class_name);

        if (!ref) {
          return {
            content: [{ type: "text" as const, text: `Class "${class_name}" not found in Godot ${ver} docs.` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(ref, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get class reference: ${error instanceof Error ? error.message : error}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

async function editorTool(
  bridge: GodotBridge,
  toolName: string,
  input: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const result = await bridge.executeTool(toolName, input);
    return {
      content: [{ type: "text" as const, text: result.result }],
      isError: result.is_error || false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
}
