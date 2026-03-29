import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { TOOLS, EDITOR_TOOLS } from "./tools.js";
import { BLENDER_TOOLS, blenderHandlerName } from "./blender-tools.js";
import { blenderToGodot, blenderToGodotAnimated, syncCollision, batchImport } from "./pipeline.js";
import { ConfigManager } from "./config.js";
import { ensureBlenderDocs, searchBlenderDocs, getBlenderClassReference } from "./docs/blender-docs.js";
import { handleSearchPolyHaven, handleDownloadPolyHaven, handleSearchSketchfab, handleDownloadSketchfab, handleSearchOpenGameArt, handleDownloadAsset, handleListLocalAssets } from "./assets/handlers.js";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";
import { ensureDocsReady, detectGodotVersion } from "./docs/indexer.js";
import { searchDocs, getClassReference } from "./docs/search.js";
import { readMemory, appendMemory, getMemorySize } from "./memory/store.js";
import { ensureMemoryDb, indexMemoryEntry, searchMemory as searchMemoryDb, getMemoryStats } from "./memory/search.js";
import { buildContext } from "./context/builder.js";

export function createServer(projectRoot?: string, blenderBridge?: BlenderBridge, configManager?: ConfigManager): McpServer {
  const bridge = new GodotBridge(projectRoot);
  const blender = blenderBridge || new BlenderBridge(projectRoot);
  const root = projectRoot || process.cwd();
  const config = configManager || new ConfigManager(root);

  const server = new McpServer({
    name: "godotforge",
    version: "0.2.0",
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

  server.tool(
    "open_scene",
    "Open a scene file in the Godot editor for editing.",
    {
      path: z.string().describe("Scene file path (e.g. 'res://scenes/player.tscn')"),
    },
    async (args) => editorTool(bridge, "open_scene", args)
  );

  server.tool(
    "remove_node",
    "Remove a node from the currently edited scene in Godot.",
    {
      node_path: z.string().describe("NodePath to the node to remove"),
    },
    async (args) => editorTool(bridge, "remove_node", args)
  );

  server.tool(
    "rename_node",
    "Rename a node in the currently edited scene in Godot.",
    {
      node_path: z.string().describe("NodePath to the node"),
      new_name: z.string().describe("New name"),
    },
    async (args) => editorTool(bridge, "rename_node", args)
  );

  server.tool(
    "duplicate_node",
    "Duplicate a node (and its children) in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to duplicate"),
      new_name: z.string().optional().describe("Name for the copy"),
    },
    async (args) => editorTool(bridge, "duplicate_node", args)
  );

  server.tool(
    "move_node",
    "Move a node to a new parent in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to move"),
      new_parent_path: z.string().describe("NodePath to the new parent"),
    },
    async (args) => editorTool(bridge, "move_node", args)
  );

  server.tool(
    "edit_script",
    "Edit a GDScript file. Use 'content' for full rewrite, or 'old_text'+'new_text' for find-and-replace.",
    {
      path: z.string().describe("File path of the script"),
      content: z.string().optional().describe("Full new content (complete rewrite)"),
      old_text: z.string().optional().describe("Text to find (partial edit)"),
      new_text: z.string().optional().describe("Replacement text (partial edit)"),
    },
    async (args) => editorTool(bridge, "edit_script", args)
  );

  // --- Advanced editor tools ---

  server.tool(
    "execute_editor_script",
    "Execute arbitrary GDScript in the Godot editor context. Has access to EditorInterface, ClassDB, ResourceSaver, etc. Use for operations not covered by other tools.",
    {
      code: z.string().describe("GDScript code to execute. Use _result = 'text' to return output."),
    },
    async (args) => editorTool(bridge, "execute_editor_script", args)
  );

  server.tool(
    "add_resource",
    "Create and assign a Resource to a node property (e.g., RectangleShape2D to CollisionShape2D.shape, CircleShape2D, etc.).",
    {
      node_path: z.string().describe("NodePath to target node"),
      property: z.string().describe("Property name (e.g. 'shape', 'texture', 'material')"),
      resource_type: z.string().describe("Resource class (e.g. 'RectangleShape2D', 'CircleShape2D', 'ImageTexture')"),
      resource_properties: z.record(z.string(), z.any()).optional().describe("Optional properties to set on the resource"),
    },
    async (args) => editorTool(bridge, "add_resource", args)
  );

  server.tool(
    "add_scene_instance",
    "Instance an existing .tscn scene as a child node in the current scene.",
    {
      scene_path: z.string().describe("Path to scene file (e.g. 'res://scenes/player.tscn')"),
      parent_path: z.string().optional().describe("Parent NodePath (default: root '.')"),
      name: z.string().optional().describe("Name for the instance"),
    },
    async (args) => editorTool(bridge, "add_scene_instance", args)
  );

  server.tool(
    "save_scene",
    "Save the currently edited scene to disk.",
    {},
    async () => editorTool(bridge, "save_scene", {})
  );

  server.tool(
    "get_node_properties",
    "Get all properties and values of a node in the current scene.",
    {
      node_path: z.string().describe("NodePath to the node"),
      filter: z.string().optional().describe("Filter property names (e.g. 'position', 'collision')"),
    },
    async (args) => editorTool(bridge, "get_node_properties", args)
  );

  server.tool(
    "connect_signal",
    "Connect a signal from one node to a method on another node.",
    {
      source_path: z.string().describe("NodePath to the signal source"),
      signal_name: z.string().describe("Signal name (e.g. 'pressed', 'body_entered')"),
      target_path: z.string().describe("NodePath to the target node"),
      method_name: z.string().describe("Method name to call"),
    },
    async (args) => editorTool(bridge, "connect_signal", args)
  );

  server.tool(
    "set_project_setting",
    "Set a Godot project setting (window size, physics, main scene, input actions, etc.).",
    {
      key: z.string().describe("Setting key (e.g. 'display/window/size/viewport_width', 'application/run/main_scene')"),
      value: z.any().describe("Setting value"),
    },
    async (args) => editorTool(bridge, "set_project_setting", args)
  );

  server.tool(
    "get_editor_errors",
    "Get recent errors and warnings from the Godot editor log.",
    {},
    async () => editorTool(bridge, "get_editor_errors", {})
  );

  // --- Runtime tools (delegated to Godot plugin) ---

  server.tool(
    "run_scene",
    "Run a scene in the Godot editor. If no path given, runs current or main scene.",
    {
      scene_path: z.string().optional().describe("Scene path (e.g. 'res://scenes/main.tscn')"),
    },
    async (args) => editorTool(bridge, "run_scene", args)
  );

  server.tool(
    "stop_scene",
    "Stop the currently running scene in the Godot editor.",
    {},
    async () => editorTool(bridge, "stop_scene", {})
  );

  server.tool(
    "get_game_status",
    "Check if a scene is running in Godot and which scene it is.",
    {},
    async () => editorTool(bridge, "get_game_status", {})
  );

  server.tool(
    "take_screenshot",
    "Take a screenshot. If a game is running, captures the game window; otherwise captures the editor viewport.",
    {
      output_path: z.string().optional().describe("Save path (default: res://.godotforge/screenshot.png)"),
    },
    async (args) => editorTool(bridge, "take_screenshot", args)
  );

  server.tool(
    "take_game_screenshot",
    "Take a screenshot of the RUNNING game window (not editor). Requires a scene to be playing via run_scene.",
    {
      output_path: z.string().optional().describe("Save path (default: res://.godotforge/game_screenshot.png)"),
    },
    async (args) => editorTool(bridge, "take_game_screenshot", args)
  );

  server.tool(
    "get_runtime_state",
    "Get runtime scene tree state of the running game: node types, positions, visibility, text values, velocities.",
    {
      node_path: z.string().optional().describe("Filter results to nodes matching this path substring"),
    },
    async (args) => editorTool(bridge, "get_runtime_state", args)
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

  // --- Memory tools ---

  server.tool(
    "save_memory",
    "Save a fact, convention, pattern, or decision to the project's persistent memory.",
    {
      category: z.enum(["Conventions", "Patterns", "Decisions", "Architecture"]).describe("Memory category"),
      content: z.string().describe("What to remember (e.g. 'We use snake_case for all GDScript functions')"),
    },
    async ({ category, content }) => {
      try {
        appendMemory(root, category, content);
        const timestamp = new Date().toISOString();
        const db = ensureMemoryDb(root);
        indexMemoryEntry(db, timestamp, category, content);
        return {
          content: [{ type: "text" as const, text: `Saved to ${category}: "${content}"` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to save memory: ${error instanceof Error ? error.message : error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "search_memory",
    "Search the project's persistent memory for facts, conventions, patterns, or decisions.",
    {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async ({ query, limit }) => {
      try {
        const db = ensureMemoryDb(root);
        const results = searchMemoryDb(db, query, limit || 10);

        if (results.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No memory entries found for "${query}".` }],
          };
        }

        const formatted = results
          .map((r) => `[${r.category}] ${r.content}`)
          .join("\n\n");

        return {
          content: [{ type: "text" as const, text: `${results.length} memory entries:\n\n${formatted}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Memory search failed: ${error instanceof Error ? error.message : error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_project_memory",
    "Get the full project memory contents and stats.",
    {},
    async () => {
      try {
        const memory = readMemory(root);
        const db = ensureMemoryDb(root);
        const stats = getMemoryStats(db);
        const sizeKB = (getMemorySize(root) / 1024).toFixed(1);

        const header = `Memory stats: ${stats.total_entries} entries, ${sizeKB}KB, categories: ${stats.categories.join(", ") || "none"}`;

        return {
          content: [{ type: "text" as const, text: `${header}\n\n${memory}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to read memory: ${error instanceof Error ? error.message : error}` }],
          isError: true,
        };
      }
    }
  );

  // --- Config tools ---

  server.tool(
    "get_service_status",
    "Check which external services have API keys configured (Sketchfab, Stability, OpenAI, ElevenLabs, etc.). Never returns actual keys.",
    {},
    async () => {
      const status = config.getStatus();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }],
      };
    }
  );

  // --- Asset tools ---

  server.tool(
    "assets.search_polyhaven",
    "Search Poly Haven for free textures, 3D models, and HDRIs. No API key needed.",
    {
      type: z.enum(["hdris", "textures", "models", "all"]).optional().describe("Asset type (default: all)"),
      categories: z.string().optional().describe("Filter by categories (comma-separated)"),
    },
    async (args) => handleSearchPolyHaven(args)
  );

  server.tool(
    "assets.download_polyhaven",
    "Download a Poly Haven asset (texture, model, or HDRI) into the project.",
    {
      asset_id: z.string().describe("Asset ID from search results"),
      resolution: z.string().optional().describe("Resolution (1k, 2k, 4k — default: 1k)"),
      format: z.string().optional().describe("File format (jpg, png, exr, gltf — default: jpg)"),
      target_dir: z.string().optional().describe("Target directory (default: assets/textures)"),
    },
    async (args) => handleDownloadPolyHaven(args, root)
  );

  server.tool(
    "assets.search_sketchfab",
    "Search Sketchfab for downloadable 3D models.",
    {
      query: z.string().describe("Search query"),
      downloadable: z.boolean().optional().describe("Only downloadable models (default: true)"),
      animated: z.boolean().optional().describe("Only animated models"),
      count: z.number().optional().describe("Results count (default: 10)"),
    },
    async (args) => handleSearchSketchfab(args)
  );

  server.tool(
    "assets.download_sketchfab",
    "Download a Sketchfab model (GLTF) into the project. Requires Sketchfab API token.",
    {
      uid: z.string().describe("Model UID from search results"),
      target_dir: z.string().optional().describe("Target directory (default: assets/models)"),
    },
    async (args) => handleDownloadSketchfab(args, root, config)
  );

  server.tool(
    "assets.search_opengameart",
    "Search OpenGameArt.org for free sprites, 3D models, sounds, and music.",
    {
      query: z.string().describe("Search query"),
      type: z.enum(["2d", "3d", "music", "sound"]).optional().describe("Filter by asset type"),
    },
    async (args) => handleSearchOpenGameArt(args)
  );

  server.tool(
    "assets.download_asset",
    "Download any asset from a URL into the project. Triggers Godot filesystem rescan.",
    {
      url: z.string().describe("Direct download URL"),
      target_dir: z.string().optional().describe("Target directory (default: assets/downloads)"),
      file_name: z.string().optional().describe("Override filename"),
    },
    async (args) => handleDownloadAsset(args, root)
  );

  server.tool(
    "assets.list_local",
    "List downloaded assets in the project with type and size.",
    {
      directory: z.string().optional().describe("Directory to scan (default: assets)"),
      type: z.enum(["texture", "model", "audio", "scene", "script", "material"]).optional().describe("Filter by asset type"),
    },
    async (args) => handleListLocalAssets(args, root)
  );

  // --- Blender docs tools ---

  server.tool(
    "search_blender_docs",
    "Search Blender bpy API documentation for classes, methods, properties, or operators.",
    {
      query: z.string().describe("Search query (e.g. 'Mesh', 'modifier', 'keyframe')"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async ({ query, limit }) => {
      try {
        const db = await ensureBlenderDocs(blender);
        const results = searchBlenderDocs(db, query, limit || 10);
        if (results.length === 0) {
          return { content: [{ type: "text" as const, text: `No Blender docs found for "${query}".` }] };
        }
        const formatted = results.map((r) => `[${r.kind}] ${r.class_name}.${r.symbol_name}\n  ${r.description}`).join("\n\n");
        return { content: [{ type: "text" as const, text: `Blender API — ${results.length} results:\n\n${formatted}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Blender docs search failed: ${error instanceof Error ? error.message : error}` }], isError: true };
      }
    }
  );

  server.tool(
    "get_blender_class",
    "Get the full bpy.types class reference including properties and methods.",
    {
      class_name: z.string().describe("Class name (e.g. 'Object', 'Mesh', 'Material')"),
    },
    async ({ class_name }) => {
      try {
        const db = await ensureBlenderDocs(blender);
        const ref = getBlenderClassReference(db, class_name);
        if (!ref) {
          return { content: [{ type: "text" as const, text: `Blender class "${class_name}" not found.` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(ref, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Failed: ${error instanceof Error ? error.message : error}` }], isError: true };
      }
    }
  );

  // --- Blender tools (delegate to Blender addon via socket) ---

  for (const tool of BLENDER_TOOLS) {
    server.tool(
      tool.name,
      tool.description,
      tool.schema,
      async (args) => blenderTool(blender, blenderHandlerName(tool.name), args)
    );
  }

  // --- Pipeline tools ---

  server.tool(
    "pipeline.blender_to_godot",
    "Export from Blender as GLB and import into the Godot project. Handles path conversion and filesystem rescan.",
    {
      target_dir: z.string().optional().describe("Target directory in project (default: 'assets/models')"),
      file_name: z.string().optional().describe("Output filename (default: 'export.glb')"),
    },
    async (args) => blenderToGodot(blender, bridge, root, args)
  );

  server.tool(
    "pipeline.blender_to_godot_animated",
    "Export from Blender with animations and armatures as GLB into the Godot project.",
    {
      target_dir: z.string().optional().describe("Target directory in project (default: 'assets/models')"),
      file_name: z.string().optional().describe("Output filename (default: 'export.glb')"),
    },
    async (args) => blenderToGodotAnimated(blender, bridge, root, args)
  );

  server.tool(
    "pipeline.sync_collision",
    "Generate collision shape hints in Blender for Godot import. Creates -col/-colonly/-trimesh suffixed duplicates that Godot auto-detects on GLTF import.",
    {
      object_name: z.string().describe("Object to create collision for"),
      collision_type: z.enum(["convex", "collision_only", "convex_only", "trimesh"]).optional().describe("Collision type (default: convex)"),
    },
    async (args) => syncCollision(blender, bridge, root, args)
  );

  server.tool(
    "pipeline.batch_import",
    "Batch import multiple 3D asset files (GLB, GLTF, FBX, OBJ) from a directory into the Godot project.",
    {
      source_dir: z.string().describe("Source directory (relative to project root)"),
      target_dir: z.string().optional().describe("Target directory (default: 'assets/models')"),
    },
    async (args) => batchImport(bridge, root, args)
  );

  return server;
}

async function blenderTool(
  blender: BlenderBridge,
  handlerName: string,
  input: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const result = await blender.executeTool(handlerName, input);
    return {
      content: [{ type: "text" as const, text: result.result }],
      isError: result.is_error || false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
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
