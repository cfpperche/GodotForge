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
import { executeTool, setEventLog, setWebhookDispatcher, setConfirmationManager, setGuardrailMode } from "./tool-handlers.js";
import { EventLog } from "./events.js";
import { WebhookDispatcher } from "./webhooks.js";
import { ConfirmationManager } from "./confirmations.js";

export function createServer(projectRoot?: string, blenderBridge?: BlenderBridge, configManager?: ConfigManager): McpServer {
  const bridge = new GodotBridge(projectRoot);
  const blender = blenderBridge || new BlenderBridge(projectRoot);
  const root = projectRoot || process.cwd();
  const config = configManager || new ConfigManager(root);

  // Initialize guardrails, event log, webhooks, confirmations for MCP subprocess
  const eventLog = new EventLog(root);
  const webhooks = new WebhookDispatcher(config);
  const confirmations = new ConfirmationManager();
  confirmations.setWebhooks(webhooks);
  setEventLog(eventLog);
  setWebhookDispatcher(webhooks);
  setConfirmationManager(confirmations);
  // Load guardrail mode from persisted settings
  const chatSettings = config.getChatSettings();
  setGuardrailMode((chatSettings.guardrail_mode as "yolo" | "normal" | "strict") || "normal");

  // Wrapper to bridge ToolResult type with MCP SDK's expected return type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runTool = async (name: string, args: Record<string, unknown>): Promise<any> => {
    const result = await executeTool(name, args, root, bridge, blender);
    return { content: result.content, isError: result.isError };
  };

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
    async (args) => runTool("create_scene", args)
  );

  server.tool(
    "get_scene_tree",
    "Get the node hierarchy of the currently edited scene.",
    {},
    async () => runTool("get_scene_tree", {})
  );

  server.tool(
    "add_node",
    "Add a child node to a node in the currently edited scene.",
    {
      parent_path: z.string().describe("NodePath to parent (e.g. '.' for root)"),
      type: z.string().describe("Node type (e.g. 'Sprite2D')"),
      name: z.string().describe("Name for the new node"),
    },
    async (args) => runTool("add_node", args)
  );

  server.tool(
    "set_property",
    "Set a property on a node in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to target node"),
      property: z.string().describe("Property name"),
      value: z.any().describe("Value to set"),
    },
    async (args) => runTool("set_property", args)
  );

  server.tool(
    "create_script",
    "Create a new GDScript file with the given content.",
    {
      path: z.string().describe("File path (e.g. 'res://scripts/player.gd')"),
      content: z.string().describe("Full GDScript source code"),
      attach_to: z.string().optional().describe("NodePath to attach script to"),
    },
    async (args) => runTool("create_script", args)
  );

  server.tool(
    "read_script",
    "Read the content of a GDScript file.",
    {
      path: z.string().describe("File path (e.g. 'res://scripts/player.gd')"),
    },
    async (args) => runTool("read_script", args)
  );

  server.tool(
    "open_scene",
    "Open a scene file in the Godot editor for editing.",
    {
      path: z.string().describe("Scene file path (e.g. 'res://scenes/player.tscn')"),
    },
    async (args) => runTool("open_scene", args)
  );

  server.tool(
    "remove_node",
    "Remove a node from the currently edited scene in Godot.",
    {
      node_path: z.string().describe("NodePath to the node to remove"),
    },
    async (args) => runTool("remove_node", args)
  );

  server.tool(
    "rename_node",
    "Rename a node in the currently edited scene in Godot.",
    {
      node_path: z.string().describe("NodePath to the node"),
      new_name: z.string().describe("New name"),
    },
    async (args) => runTool("rename_node", args)
  );

  server.tool(
    "duplicate_node",
    "Duplicate a node (and its children) in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to duplicate"),
      new_name: z.string().optional().describe("Name for the copy"),
    },
    async (args) => runTool("duplicate_node", args)
  );

  server.tool(
    "move_node",
    "Move a node to a new parent in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to move"),
      new_parent_path: z.string().describe("NodePath to the new parent"),
    },
    async (args) => runTool("move_node", args)
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
    async (args) => runTool("edit_script", args)
  );

  // --- Advanced editor tools ---

  server.tool(
    "execute_editor_script",
    "Execute arbitrary GDScript in the Godot editor context. Has access to EditorInterface, ClassDB, ResourceSaver, etc. Use for operations not covered by other tools.",
    {
      code: z.string().describe("GDScript code to execute. Use _result = 'text' to return output."),
    },
    async (args) => runTool("execute_editor_script", args)
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
    async (args) => runTool("add_resource", args)
  );

  server.tool(
    "add_scene_instance",
    "Instance an existing .tscn scene as a child node in the current scene.",
    {
      scene_path: z.string().describe("Path to scene file (e.g. 'res://scenes/player.tscn')"),
      parent_path: z.string().optional().describe("Parent NodePath (default: root '.')"),
      name: z.string().optional().describe("Name for the instance"),
    },
    async (args) => runTool("add_scene_instance", args)
  );

  server.tool(
    "save_scene",
    "Save the currently edited scene to disk.",
    {},
    async () => runTool("save_scene", {})
  );

  server.tool(
    "get_node_properties",
    "Get all properties and values of a node in the current scene.",
    {
      node_path: z.string().describe("NodePath to the node"),
      filter: z.string().optional().describe("Filter property names (e.g. 'position', 'collision')"),
    },
    async (args) => runTool("get_node_properties", args)
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
    async (args) => runTool("connect_signal", args)
  );

  server.tool(
    "set_project_setting",
    "Set a Godot project setting (window size, physics, main scene, input actions, etc.).",
    {
      key: z.string().describe("Setting key (e.g. 'display/window/size/viewport_width', 'application/run/main_scene')"),
      value: z.any().describe("Setting value"),
    },
    async (args) => runTool("set_project_setting", args)
  );

  server.tool(
    "get_editor_errors",
    "Get recent errors and warnings from the Godot editor log.",
    {},
    async () => runTool("get_editor_errors", {})
  );

  // --- Runtime tools (delegated to Godot plugin) ---

  server.tool(
    "run_scene",
    "Run a scene in the Godot editor. If no path given, runs current or main scene.",
    {
      scene_path: z.string().optional().describe("Scene path (e.g. 'res://scenes/main.tscn')"),
    },
    async (args) => runTool("run_scene", args)
  );

  server.tool(
    "stop_scene",
    "Stop the currently running scene in the Godot editor.",
    {},
    async () => runTool("stop_scene", {})
  );

  server.tool(
    "get_game_status",
    "Check if a scene is running in Godot and which scene it is.",
    {},
    async () => runTool("get_game_status", {})
  );

  server.tool(
    "take_screenshot",
    "Take a screenshot. If a game is running, captures the game window; otherwise captures the editor viewport.",
    {
      output_path: z.string().optional().describe("Save path (default: res://.godotforge/screenshot.png)"),
    },
    async (args) => runTool("take_screenshot", args)
  );

  server.tool(
    "take_game_screenshot",
    "Take a screenshot of the RUNNING game window (not editor). Requires a scene to be playing via run_scene.",
    {
      output_path: z.string().optional().describe("Save path (default: res://.godotforge/game_screenshot.png)"),
    },
    async (args) => runTool("take_game_screenshot", args)
  );

  server.tool(
    "get_runtime_state",
    "Get runtime scene tree state of the running game: node types, positions, visibility, text values, velocities.",
    {
      node_path: z.string().optional().describe("Filter results to nodes matching this path substring"),
    },
    async (args) => runTool("get_runtime_state", args)
  );

  server.tool(
    "simulate_input",
    "Simulate an input action in the running game (press + release). Use to play-test games autonomously.",
    {
      action: z.string().describe("Input action name (e.g. 'flap', 'jump', 'ui_accept')"),
      duration_ms: z.number().optional().describe("How long to hold the action in ms (default: 100)"),
    },
    async (args) => runTool("simulate_input", args)
  );

  server.tool(
    "simulate_input_sequence",
    "Execute a timed sequence of input actions in the running game. Single HTTP call, game-side timing.",
    {
      sequence: z.array(z.object({
        action: z.string().describe("Input action name"),
        delay_ms: z.number().describe("Delay before this action in ms (0 = immediate)"),
      })).describe("Array of timed input actions"),
    },
    async (args) => runTool("simulate_input_sequence", args)
  );

  // --- Local tools ---

  server.tool(
    "get_project_context",
    "Get project metadata: name, Godot version, scenes, scripts, current scene.",
    {},
    async () => runTool("get_project_context", {})
  );

  server.tool(
    "read_file",
    "Read any file from the Godot project directory.",
    { path: z.string().describe("Relative path from project root") },
    async (args) => runTool("read_file", args)
  );

  server.tool(
    "list_files",
    "List files in a project directory with optional pattern filtering.",
    {
      directory: z.string().optional().describe("Directory relative to root"),
      pattern: z.string().optional().describe("Glob pattern (e.g. '*.gd')"),
    },
    async (args) => runTool("list_files", args)
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
    async (args) => runTool("search_docs", args)
  );

  server.tool(
    "get_class_reference",
    "Get the full Godot class reference including methods, properties, signals, and constants.",
    {
      class_name: z.string().describe("Class name (e.g. 'Node2D', 'CharacterBody2D')"),
      version: z.string().optional().describe("Godot version. Auto-detected if omitted."),
    },
    async (args) => runTool("get_class_reference", args)
  );

  // --- Memory tools ---

  server.tool(
    "save_memory",
    "Save a fact, convention, pattern, or decision to the project's persistent memory.",
    {
      category: z.enum(["Conventions", "Patterns", "Decisions", "Architecture"]).describe("Memory category"),
      content: z.string().describe("What to remember (e.g. 'We use snake_case for all GDScript functions')"),
    },
    async (args) => runTool("save_memory", args)
  );

  server.tool(
    "search_memory",
    "Search the project's persistent memory for facts, conventions, patterns, or decisions.",
    {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async (args) => runTool("search_memory", args)
  );

  server.tool(
    "get_project_memory",
    "Get the full project memory contents and stats.",
    {},
    async () => runTool("get_project_memory", {})
  );

  // --- Config tools ---

  server.tool(
    "get_service_status",
    "Check which external services have API keys configured (Sketchfab, Stability, OpenAI, ElevenLabs, etc.). Never returns actual keys.",
    {},
    async () => runTool("get_service_status", {})
  );

  // --- Asset tools ---

  server.tool(
    "assets.search_polyhaven",
    "Search Poly Haven for free textures, 3D models, and HDRIs. No API key needed.",
    {
      type: z.enum(["hdris", "textures", "models", "all"]).optional().describe("Asset type (default: all)"),
      categories: z.string().optional().describe("Filter by categories (comma-separated)"),
    },
    async (args) => runTool("assets.search_polyhaven", args)
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
    async (args) => runTool("assets.download_polyhaven", args)
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
    async (args) => runTool("assets.search_sketchfab", args)
  );

  server.tool(
    "assets.download_sketchfab",
    "Download a Sketchfab model (GLTF) into the project. Requires Sketchfab API token.",
    {
      uid: z.string().describe("Model UID from search results"),
      target_dir: z.string().optional().describe("Target directory (default: assets/models)"),
    },
    async (args) => runTool("assets.download_sketchfab", args)
  );

  server.tool(
    "assets.search_opengameart",
    "Search OpenGameArt.org for free sprites, 3D models, sounds, and music.",
    {
      query: z.string().describe("Search query"),
      type: z.enum(["2d", "3d", "music", "sound"]).optional().describe("Filter by asset type"),
    },
    async (args) => runTool("assets.search_opengameart", args)
  );

  server.tool(
    "assets.download_asset",
    "Download any asset from a URL into the project. Triggers Godot filesystem rescan.",
    {
      url: z.string().describe("Direct download URL"),
      target_dir: z.string().optional().describe("Target directory (default: assets/downloads)"),
      file_name: z.string().optional().describe("Override filename"),
    },
    async (args) => runTool("assets.download_asset", args)
  );

  server.tool(
    "assets.list_local",
    "List downloaded assets in the project with type and size.",
    {
      directory: z.string().optional().describe("Directory to scan (default: assets)"),
      type: z.enum(["texture", "model", "audio", "scene", "script", "material"]).optional().describe("Filter by asset type"),
    },
    async (args) => runTool("assets.list_local", args)
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
      async (args) => executeTool(tool.name, args, root, bridge, blender)
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
    async (args) => runTool("pipeline.blender_to_godot", args)
  );

  server.tool(
    "pipeline.blender_to_godot_animated",
    "Export from Blender with animations and armatures as GLB into the Godot project.",
    {
      target_dir: z.string().optional().describe("Target directory in project (default: 'assets/models')"),
      file_name: z.string().optional().describe("Output filename (default: 'export.glb')"),
    },
    async (args) => runTool("pipeline.blender_to_godot_animated", args)
  );

  server.tool(
    "pipeline.sync_collision",
    "Generate collision shape hints in Blender for Godot import. Creates -col/-colonly/-trimesh suffixed duplicates that Godot auto-detects on GLTF import.",
    {
      object_name: z.string().describe("Object to create collision for"),
      collision_type: z.enum(["convex", "collision_only", "convex_only", "trimesh"]).optional().describe("Collision type (default: convex)"),
    },
    async (args) => runTool("pipeline.sync_collision", args)
  );

  server.tool(
    "pipeline.batch_import",
    "Batch import multiple 3D asset files (GLB, GLTF, FBX, OBJ) from a directory into the Godot project.",
    {
      source_dir: z.string().describe("Source directory (relative to project root)"),
      target_dir: z.string().optional().describe("Target directory (default: 'assets/models')"),
    },
    async (args) => runTool("pipeline.batch_import", args)
  );

  // --- AI generation tools (Meshy.ai — full API coverage) ---

  const meshyFormats = z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz"])).optional().describe("Output formats (default: [glb])");
  const meshyAiModel = z.enum(["meshy-5", "meshy-6", "latest"]).optional().describe("AI model (default: latest)");
  const meshyTopology = z.enum(["quad", "triangle"]).optional().describe("Mesh topology (default: triangle)");
  const meshyPolycount = z.number().min(100).max(300000).optional().describe("Target polygon count (100-300000, default: 30000)");
  const meshyOrigin = z.enum(["bottom", "center"]).optional().describe("Model origin point (default: bottom)");

  server.tool(
    "ai.meshy_text_to_3d",
    "Generate a 3D mesh from a text description using Meshy AI (preview mode). Returns a GLB file. Takes 1-5 minutes. Use ai.meshy_refine to add textures afterwards.",
    {
      prompt: z.string().max(600).describe("Text description of the 3D model to generate (max 600 chars)"),
      model_type: z.enum(["standard", "lowpoly"]).optional().describe("Model type (default: standard)"),
      ai_model: meshyAiModel,
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      should_remesh: z.boolean().optional().describe("Enable remesh phase (default: false for meshy-6, true for others)"),
      symmetry_mode: z.enum(["off", "auto", "on"]).optional().describe("Symmetry mode (default: auto)"),
      pose_mode: z.enum(["a-pose", "t-pose", ""]).optional().describe("Character pose mode (empty for non-characters)"),
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_text_to_3d", args)
  );

  server.tool(
    "ai.meshy_refine",
    "Apply AI texture to a completed text-to-3D preview task. Costs 10 credits. Takes 1-3 minutes.",
    {
      preview_task_id: z.string().describe("Task ID of a completed text-to-3D preview"),
      enable_pbr: z.boolean().optional().describe("Generate metallic, roughness, normal maps (default: false)"),
      texture_prompt: z.string().max(600).optional().describe("Text description for texture (mutually exclusive with texture_image_url)"),
      texture_image_url: z.string().optional().describe("Reference image URL for texture (mutually exclusive with texture_prompt)"),
      ai_model: meshyAiModel,
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      remove_lighting: z.boolean().optional().describe("Remove highlights/shadows from texture (default: true, meshy-6 only)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_refine", args)
  );

  server.tool(
    "ai.meshy_image_to_3d",
    "Generate a 3D model from a single image using Meshy AI. Returns a GLB file. Takes 1-5 minutes.",
    {
      image_url: z.string().describe("Public image URL or base64 data URI (.jpg, .png)"),
      model_type: z.enum(["standard", "lowpoly"]).optional().describe("Model type (default: standard)"),
      ai_model: meshyAiModel,
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      symmetry_mode: z.enum(["off", "auto", "on"]).optional().describe("Symmetry mode (default: auto)"),
      should_remesh: z.boolean().optional().describe("Enable remesh phase"),
      save_pre_remeshed_model: z.boolean().optional().describe("Save model before remesh (default: false)"),
      should_texture: z.boolean().optional().describe("Generate texture (default: true)"),
      enable_pbr: z.boolean().optional().describe("Generate PBR maps (default: false)"),
      pose_mode: z.enum(["a-pose", "t-pose", ""]).optional().describe("Character pose mode"),
      texture_prompt: z.string().max(600).optional().describe("Text description for texture"),
      texture_image_url: z.string().optional().describe("Reference image URL for texture"),
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      image_enhancement: z.boolean().optional().describe("Enhance input image (default: true, meshy-6 only)"),
      remove_lighting: z.boolean().optional().describe("Remove lighting from texture (default: true, meshy-6 only)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_image_to_3d", args)
  );

  server.tool(
    "ai.meshy_multi_image_to_3d",
    "Generate a 3D model from 1-4 images of the same object (different angles) using Meshy AI. Takes 1-5 minutes.",
    {
      image_urls: z.array(z.string()).min(1).max(4).describe("1-4 image URLs of the same object from different angles"),
      model_type: z.enum(["standard", "lowpoly"]).optional().describe("Model type (default: standard)"),
      ai_model: meshyAiModel,
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      symmetry_mode: z.enum(["off", "auto", "on"]).optional().describe("Symmetry mode (default: auto)"),
      should_remesh: z.boolean().optional().describe("Enable remesh phase"),
      should_texture: z.boolean().optional().describe("Generate texture (default: true)"),
      enable_pbr: z.boolean().optional().describe("Generate PBR maps (default: false)"),
      pose_mode: z.enum(["a-pose", "t-pose", ""]).optional().describe("Character pose mode"),
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_multi_image_to_3d", args)
  );

  server.tool(
    "ai.meshy_remesh",
    "Remesh/retopologize an existing 3D model. Can change topology, polycount, format, or resize. 5 credits.",
    {
      input_task_id: z.string().optional().describe("Completed Meshy task ID (provide this OR model_url)"),
      model_url: z.string().optional().describe("Public 3D model URL (.glb, .gltf, .obj, .fbx, .stl) (provide this OR input_task_id)"),
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      resize_height: z.number().optional().describe("Target height in meters (0 = no resize, mutually exclusive with auto_size)"),
      auto_size: z.boolean().optional().describe("AI estimates real-world height (mutually exclusive with resize_height)"),
      origin_at: meshyOrigin,
      convert_format_only: z.boolean().optional().describe("Skip remeshing, only convert format (default: false)"),
      target_formats: z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz", "blend"])).optional().describe("Output formats (default: [glb])"),
    },
    async (args) => runTool("ai.meshy_remesh", args)
  );

  server.tool(
    "ai.meshy_retexture",
    "Apply new AI-generated texture to an existing 3D model. Describe the style with text or provide a reference image. 10 credits.",
    {
      input_task_id: z.string().optional().describe("Completed Meshy task ID (provide this OR model_url)"),
      model_url: z.string().optional().describe("Public 3D model URL (.glb, .gltf, .obj, .fbx, .stl) (provide this OR input_task_id)"),
      text_style_prompt: z.string().max(600).optional().describe("Texture description (provide this OR image_style_url)"),
      image_style_url: z.string().optional().describe("Reference image URL for texture style (provide this OR text_style_prompt)"),
      ai_model: meshyAiModel,
      enable_original_uv: z.boolean().optional().describe("Preserve original UV mapping (default: true)"),
      enable_pbr: z.boolean().optional().describe("Generate PBR maps (default: false)"),
      remove_lighting: z.boolean().optional().describe("Remove lighting from texture (default: true, meshy-6 only)"),
      target_formats: meshyFormats,
    },
    async (args) => runTool("ai.meshy_retexture", args)
  );

  server.tool(
    "ai.meshy_check_task",
    "Check the status and progress of any Meshy AI generation task.",
    {
      task_id: z.string().describe("Meshy task ID to check"),
      endpoint: z.enum(["text-to-3d", "image-to-3d", "multi-image-to-3d", "remesh", "retexture"]).optional().describe("Task type (default: text-to-3d)"),
    },
    async (args) => runTool("ai.meshy_check_task", args)
  );

  server.tool(
    "ai.meshy_balance",
    "Check remaining Meshy AI credit balance.",
    {},
    async (args) => runTool("ai.meshy_balance", args)
  );

  return server;
}
