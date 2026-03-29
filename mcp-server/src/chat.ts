import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { ConfigManager } from "./config.js";
import { executeTool, type ToolResult } from "./tool-handlers.js";
import { buildContext } from "./context/builder.js";
import { appendSessionLog } from "./memory/store.js";
import { execSync, execFileSync } from "child_process";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const MAX_TOOL_LOOPS = 10;

const BASE_SYSTEM_PROMPT =
  "You are GodotForge, an AI game development hub that orchestrates Godot Engine and Blender. " +
  "You help developers create games using AI — modeling in Blender, building in Godot, and piping assets between them. " +
  "You have tools for: Godot (scenes, nodes, scripts, runtime), Blender (meshes, materials, UV, export), " +
  "Pipeline (Blender→Godot asset flow), docs search (912 Godot classes), and project memory. " +
  "Use tools to take action — don't just describe what to do. " +
  "Be concise. Always use GDScript (not C#). Always use Godot 4.x API. " +
  "For 3D modeling, use blender.* tools. For Blender→Godot transfer, use pipeline.blender_to_godot. " +
  "IMPORTANT: ALWAYS use search_docs or get_class_reference BEFORE writing GDScript that uses Godot classes you're not 100% sure about. " +
  "The docs RAG has 912 classes indexed — use it to verify method signatures, property names, and signal parameters. " +
  "Never guess API — look it up first. Relevant class docs may be pre-loaded in <godot-docs> below.";

interface ToolCallLog {
  name: string;
  result: string;
  is_error: boolean;
}

interface ChatResponse {
  response: string;
  tool_calls: ToolCallLog[];
  error?: string;
}

type AuthMode = "api_key" | "claude_cli";

interface ChatSettings {
  auth_mode: AuthMode;
  api_key: string;
  model: string;
  max_tokens: number;
  memory_enabled: boolean;
  // Advanced LLM parameters
  temperature: number;
  effort: "low" | "medium" | "high" | "max";
  thinking: "disabled" | "adaptive";
  tool_choice: "auto" | "any" | "none";
  system_prompt_extra: string;
}

interface Message {
  role: string;
  content: unknown;
}

// Tool definitions for Claude API (JSON schema format)
function getToolDefinitions(): Array<Record<string, unknown>> {
  return [
    { name: "create_scene", description: "Create a new scene with a root node.", input_schema: { type: "object", properties: { path: { type: "string" }, root_type: { type: "string" }, root_name: { type: "string" } }, required: ["path", "root_type"] } },
    { name: "open_scene", description: "Open a scene in the editor.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "get_scene_tree", description: "Get the node hierarchy of the current scene.", input_schema: { type: "object", properties: {} } },
    { name: "add_node", description: "Add a child node to the scene.", input_schema: { type: "object", properties: { parent_path: { type: "string" }, type: { type: "string" }, name: { type: "string" } }, required: ["parent_path", "type", "name"] } },
    { name: "set_property", description: "Set a property on a node.", input_schema: { type: "object", properties: { node_path: { type: "string" }, property: { type: "string" }, value: {} }, required: ["node_path", "property", "value"] } },
    { name: "remove_node", description: "Remove a node from the scene.", input_schema: { type: "object", properties: { node_path: { type: "string" } }, required: ["node_path"] } },
    { name: "rename_node", description: "Rename a node.", input_schema: { type: "object", properties: { node_path: { type: "string" }, new_name: { type: "string" } }, required: ["node_path", "new_name"] } },
    { name: "duplicate_node", description: "Duplicate a node and its children.", input_schema: { type: "object", properties: { node_path: { type: "string" }, new_name: { type: "string" } }, required: ["node_path"] } },
    { name: "move_node", description: "Move a node to a new parent.", input_schema: { type: "object", properties: { node_path: { type: "string" }, new_parent_path: { type: "string" } }, required: ["node_path", "new_parent_path"] } },
    { name: "create_script", description: "Create a GDScript file.", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, attach_to: { type: "string" } }, required: ["path", "content"] } },
    { name: "read_script", description: "Read a GDScript file.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "edit_script", description: "Edit a GDScript file. Use content for full rewrite, or old_text+new_text for find-replace.", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, old_text: { type: "string" }, new_text: { type: "string" } }, required: ["path"] } },
    { name: "run_scene", description: "Run a scene in Godot.", input_schema: { type: "object", properties: { scene_path: { type: "string" } } } },
    { name: "stop_scene", description: "Stop the running scene.", input_schema: { type: "object", properties: {} } },
    { name: "get_game_status", description: "Check if a scene is running.", input_schema: { type: "object", properties: {} } },
    { name: "take_screenshot", description: "Take a screenshot of the editor.", input_schema: { type: "object", properties: { output_path: { type: "string" } } } },
    { name: "execute_editor_script", description: "Execute GDScript in the editor. Use _result = 'text' to return output.", input_schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } },
    { name: "add_resource", description: "Create and assign a Resource to a node property (e.g., RectangleShape2D to shape).", input_schema: { type: "object", properties: { node_path: { type: "string" }, property: { type: "string" }, resource_type: { type: "string" }, resource_properties: { type: "object" } }, required: ["node_path", "property", "resource_type"] } },
    { name: "add_scene_instance", description: "Instance a .tscn scene as child node.", input_schema: { type: "object", properties: { scene_path: { type: "string" }, parent_path: { type: "string" }, name: { type: "string" } }, required: ["scene_path"] } },
    { name: "save_scene", description: "Save the current scene to disk.", input_schema: { type: "object", properties: {} } },
    { name: "get_node_properties", description: "Get all properties of a node.", input_schema: { type: "object", properties: { node_path: { type: "string" }, filter: { type: "string" } }, required: ["node_path"] } },
    { name: "connect_signal", description: "Connect a signal to a method.", input_schema: { type: "object", properties: { source_path: { type: "string" }, signal_name: { type: "string" }, target_path: { type: "string" }, method_name: { type: "string" } }, required: ["source_path", "signal_name", "target_path", "method_name"] } },
    { name: "set_project_setting", description: "Set a Godot project setting.", input_schema: { type: "object", properties: { key: { type: "string" }, value: {} }, required: ["key", "value"] } },
    { name: "get_editor_errors", description: "Get recent editor errors and warnings.", input_schema: { type: "object", properties: {} } },
    { name: "get_project_context", description: "Get project metadata.", input_schema: { type: "object", properties: {} } },
    { name: "read_file", description: "Read any file from the project.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "list_files", description: "List files in a directory.", input_schema: { type: "object", properties: { directory: { type: "string" }, pattern: { type: "string" } } } },
    { name: "search_docs", description: "Search Godot documentation.", input_schema: { type: "object", properties: { query: { type: "string" }, version: { type: "string" }, kind: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
    { name: "get_class_reference", description: "Get full Godot class reference.", input_schema: { type: "object", properties: { class_name: { type: "string" }, version: { type: "string" } }, required: ["class_name"] } },
    { name: "save_memory", description: "Save a fact to project memory.", input_schema: { type: "object", properties: { category: { type: "string" }, content: { type: "string" } }, required: ["category", "content"] } },
    { name: "search_memory", description: "Search project memory.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "get_project_memory", description: "Get full project memory.", input_schema: { type: "object", properties: {} } },
    { name: "get_service_status", description: "Check which external services have API keys configured.", input_schema: { type: "object", properties: {} } },
    // Asset tools
    { name: "search_blender_docs", description: "Search Blender bpy API docs for classes, methods, properties.", input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
    { name: "get_blender_class", description: "Get full bpy.types class reference.", input_schema: { type: "object", properties: { class_name: { type: "string" } }, required: ["class_name"] } },
    { name: "assets.search_polyhaven", description: "Search Poly Haven for free textures, models, HDRIs.", input_schema: { type: "object", properties: { type: { type: "string", enum: ["hdris", "textures", "models", "all"] }, categories: { type: "string" } } } },
    { name: "assets.download_polyhaven", description: "Download Poly Haven asset into project.", input_schema: { type: "object", properties: { asset_id: { type: "string" }, resolution: { type: "string" }, format: { type: "string" }, target_dir: { type: "string" } }, required: ["asset_id"] } },
    { name: "assets.search_sketchfab", description: "Search Sketchfab for 3D models.", input_schema: { type: "object", properties: { query: { type: "string" }, downloadable: { type: "boolean" }, animated: { type: "boolean" }, count: { type: "number" } }, required: ["query"] } },
    { name: "assets.download_sketchfab", description: "Download Sketchfab model (requires API token).", input_schema: { type: "object", properties: { uid: { type: "string" }, target_dir: { type: "string" } }, required: ["uid"] } },
    { name: "assets.search_opengameart", description: "Search OpenGameArt for free sprites, sounds, music, 3D models.", input_schema: { type: "object", properties: { query: { type: "string" }, type: { type: "string", enum: ["2d", "3d", "music", "sound"] } }, required: ["query"] } },
    { name: "assets.download_asset", description: "Download any asset from URL into project.", input_schema: { type: "object", properties: { url: { type: "string" }, target_dir: { type: "string" }, file_name: { type: "string" } }, required: ["url"] } },
    { name: "assets.list_local", description: "List downloaded assets in project.", input_schema: { type: "object", properties: { directory: { type: "string" }, type: { type: "string", enum: ["texture", "model", "audio", "scene", "script", "material"] } } } },
    // Blender tools
    { name: "blender.create_mesh", description: "Create a mesh primitive in Blender (cube, sphere, cylinder, plane, cone, torus).", input_schema: { type: "object", properties: { type: { type: "string", enum: ["cube", "sphere", "uv_sphere", "ico_sphere", "cylinder", "plane", "cone", "torus"] }, name: { type: "string" }, location: { type: "array", items: { type: "number" } }, scale: { type: "array", items: { type: "number" } } }, required: ["type"] } },
    { name: "blender.delete_object", description: "Delete an object from Blender scene.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
    { name: "blender.duplicate_object", description: "Duplicate a Blender object.", input_schema: { type: "object", properties: { name: { type: "string" }, new_name: { type: "string" } }, required: ["name"] } },
    { name: "blender.transform", description: "Move/rotate/scale a Blender object. Rotation in degrees.", input_schema: { type: "object", properties: { name: { type: "string" }, location: { type: "array", items: { type: "number" } }, rotation: { type: "array", items: { type: "number" } }, scale: { type: "array", items: { type: "number" } } }, required: ["name"] } },
    { name: "blender.modify", description: "Apply modifier to Blender object (MIRROR, ARRAY, SOLIDIFY, BEVEL, SUBSURF, BOOLEAN, DECIMATE).", input_schema: { type: "object", properties: { name: { type: "string" }, modifier: { type: "string" }, properties: { type: "object" } }, required: ["name", "modifier"] } },
    { name: "blender.boolean", description: "Boolean operation between two Blender objects.", input_schema: { type: "object", properties: { name: { type: "string" }, target: { type: "string" }, operation: { type: "string", enum: ["UNION", "DIFFERENCE", "INTERSECT"] } }, required: ["name", "target"] } },
    { name: "blender.join_objects", description: "Join multiple Blender objects into one.", input_schema: { type: "object", properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] } },
    { name: "blender.create_material", description: "Create a PBR material in Blender.", input_schema: { type: "object", properties: { name: { type: "string" }, color: { type: "array", items: { type: "number" } }, metallic: { type: "number" }, roughness: { type: "number" } }, required: ["name"] } },
    { name: "blender.assign_material", description: "Assign material to Blender object.", input_schema: { type: "object", properties: { object: { type: "string" }, material: { type: "string" } }, required: ["object", "material"] } },
    { name: "blender.list_materials", description: "List all materials in Blender scene.", input_schema: { type: "object", properties: {} } },
    { name: "blender.get_scene_objects", description: "List all objects in Blender scene.", input_schema: { type: "object", properties: {} } },
    { name: "blender.get_object_properties", description: "Get properties of a Blender object.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
    { name: "blender.get_blender_info", description: "Get Blender version and scene info.", input_schema: { type: "object", properties: {} } },
    { name: "blender.export_gltf", description: "Export Blender scene as GLTF/GLB.", input_schema: { type: "object", properties: { filepath: { type: "string" }, selected_only: { type: "boolean" } }, required: ["filepath"] } },
    { name: "blender.export_for_godot", description: "Export Blender scene optimized for Godot (GLB, Y-up).", input_schema: { type: "object", properties: { filepath: { type: "string" } }, required: ["filepath"] } },
    { name: "blender.export_with_animations", description: "Export GLB with animations and armatures.", input_schema: { type: "object", properties: { filepath: { type: "string" } }, required: ["filepath"] } },
    { name: "blender.export_fbx", description: "Export as FBX.", input_schema: { type: "object", properties: { filepath: { type: "string" }, selected_only: { type: "boolean" } }, required: ["filepath"] } },
    { name: "blender.unwrap_uv", description: "UV unwrap a Blender mesh.", input_schema: { type: "object", properties: { name: { type: "string" }, method: { type: "string", enum: ["smart", "unwrap"] } }, required: ["name"] } },
    { name: "blender.execute_python", description: "Execute arbitrary Python/bpy code in Blender.", input_schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } },
    // Animation tools
    { name: "blender.create_armature", description: "Create an armature (skeleton).", input_schema: { type: "object", properties: { name: { type: "string" }, location: { type: "array", items: { type: "number" } } } } },
    { name: "blender.add_bone", description: "Add a bone to an armature.", input_schema: { type: "object", properties: { armature: { type: "string" }, name: { type: "string" }, head: { type: "array", items: { type: "number" } }, tail: { type: "array", items: { type: "number" } }, parent: { type: "string" } }, required: ["armature", "name"] } },
    { name: "blender.parent_to_armature", description: "Parent mesh to armature with auto weights.", input_schema: { type: "object", properties: { mesh: { type: "string" }, armature: { type: "string" } }, required: ["mesh", "armature"] } },
    { name: "blender.insert_keyframe", description: "Insert keyframe on object.", input_schema: { type: "object", properties: { name: { type: "string" }, data_path: { type: "string", enum: ["location", "rotation_euler", "scale"] }, frame: { type: "number" }, value: { type: "array", items: { type: "number" } } }, required: ["name", "data_path", "frame"] } },
    { name: "blender.create_animation", description: "Create animation action.", input_schema: { type: "object", properties: { object: { type: "string" }, name: { type: "string" }, frame_start: { type: "number" }, frame_end: { type: "number" } }, required: ["object", "name"] } },
    { name: "blender.set_animation_range", description: "Set scene frame range.", input_schema: { type: "object", properties: { frame_start: { type: "number" }, frame_end: { type: "number" } }, required: ["frame_start", "frame_end"] } },
    { name: "blender.auto_weight_paint", description: "Auto weight paint mesh to armature.", input_schema: { type: "object", properties: { mesh: { type: "string" } }, required: ["mesh"] } },
    { name: "blender.list_animations", description: "List all animation actions.", input_schema: { type: "object", properties: {} } },
    // Scene & Render
    { name: "blender.set_camera", description: "Add/configure camera.", input_schema: { type: "object", properties: { name: { type: "string" }, location: { type: "array", items: { type: "number" } }, rotation: { type: "array", items: { type: "number" } }, focal_length: { type: "number" } } } },
    { name: "blender.set_light", description: "Add/configure light.", input_schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string", enum: ["SUN", "POINT", "SPOT", "AREA"] }, location: { type: "array", items: { type: "number" } }, energy: { type: "number" }, color: { type: "array", items: { type: "number" } } } } },
    { name: "blender.render_image", description: "Render image from camera.", input_schema: { type: "object", properties: { filepath: { type: "string" }, resolution_x: { type: "number" }, resolution_y: { type: "number" }, samples: { type: "number" } } } },
    { name: "blender.set_render_settings", description: "Configure render engine and resolution.", input_schema: { type: "object", properties: { engine: { type: "string", enum: ["EEVEE", "CYCLES", "WORKBENCH"] }, resolution_x: { type: "number" }, resolution_y: { type: "number" }, samples: { type: "number" } } } },
    // Extra modeling
    { name: "blender.extrude", description: "Extrude mesh faces.", input_schema: { type: "object", properties: { name: { type: "string" }, offset: { type: "number" } }, required: ["name"] } },
    { name: "blender.subdivide", description: "Subdivide mesh.", input_schema: { type: "object", properties: { name: { type: "string" }, cuts: { type: "number" } }, required: ["name"] } },
    { name: "blender.set_origin", description: "Set object origin.", input_schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string" } }, required: ["name"] } },
    { name: "blender.separate_mesh", description: "Separate mesh by loose parts or material.", input_schema: { type: "object", properties: { name: { type: "string" }, method: { type: "string", enum: ["LOOSE", "MATERIAL"] } }, required: ["name"] } },
    // Materials extra
    { name: "blender.set_material_texture", description: "Assign texture to material channel.", input_schema: { type: "object", properties: { material: { type: "string" }, channel: { type: "string" }, filepath: { type: "string" } }, required: ["material", "channel", "filepath"] } },
    { name: "blender.bake_textures", description: "Bake textures for mesh.", input_schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string" }, resolution: { type: "number" }, filepath: { type: "string" } }, required: ["name"] } },
    { name: "blender.delete_material", description: "Delete a material.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
    // Collision
    { name: "blender.generate_collision_hints", description: "Create collision hint objects for Godot import.", input_schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string", enum: ["convex", "collision_only", "convex_only", "trimesh"] } }, required: ["name"] } },
    // Pipeline tools
    { name: "pipeline.blender_to_godot", description: "Export from Blender as GLB and import into Godot project.", input_schema: { type: "object", properties: { target_dir: { type: "string" }, file_name: { type: "string" } } } },
    { name: "pipeline.blender_to_godot_animated", description: "Export from Blender with animations into Godot.", input_schema: { type: "object", properties: { target_dir: { type: "string" }, file_name: { type: "string" } } } },
    { name: "pipeline.sync_collision", description: "Generate collision shapes for Godot import.", input_schema: { type: "object", properties: { object_name: { type: "string" }, collision_type: { type: "string" } }, required: ["object_name"] } },
    { name: "pipeline.batch_import", description: "Batch import 3D files into Godot project.", input_schema: { type: "object", properties: { source_dir: { type: "string" }, target_dir: { type: "string" } }, required: ["source_dir"] } },
  ];
}

export class ChatEngine {
  private sessions = new Map<string, Message[]>();
  private settings: ChatSettings = {
    auth_mode: "claude_cli",
    api_key: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    memory_enabled: true,
    temperature: 1.0,
    effort: "high",
    thinking: "disabled",
    tool_choice: "auto",
    system_prompt_extra: "",
  };
  private root: string;
  private bridge: GodotBridge;
  private blenderBridge: BlenderBridge;
  private configManager: ConfigManager;
  private claudeCliPath: string = "";

  constructor(root: string, bridge: GodotBridge, blenderBridge?: BlenderBridge) {
    this.root = root;
    this.bridge = bridge;
    this.blenderBridge = blenderBridge || new BlenderBridge(root);
    this.configManager = new ConfigManager(root);
    this.claudeCliPath = this.detectClaudeCli();

    // Load persisted settings from config.json
    const persisted = this.configManager.getChatSettings();
    if (persisted.model) this.settings.model = persisted.model;
    if (persisted.max_tokens) this.settings.max_tokens = persisted.max_tokens;
    if (persisted.temperature !== undefined) this.settings.temperature = persisted.temperature;
    if (persisted.effort) this.settings.effort = persisted.effort;
    if (persisted.thinking) this.settings.thinking = persisted.thinking;
    if (persisted.tool_choice) this.settings.tool_choice = persisted.tool_choice;
    if (persisted.memory_enabled !== undefined) this.settings.memory_enabled = persisted.memory_enabled;
    if (persisted.system_prompt_extra) this.settings.system_prompt_extra = persisted.system_prompt_extra;

    // Auto-detect auth mode
    if (this.settings.api_key) {
      this.settings.auth_mode = "api_key";
    } else if (this.claudeCliPath) {
      this.settings.auth_mode = "claude_cli";
    }

    console.error(`[GodotForge Chat] Auth: ${this.settings.auth_mode}, Model: ${this.settings.model}, Effort: ${this.settings.effort}`);
  }

  private detectClaudeCli(): string {
    // Try common paths
    const candidates = [
      "/usr/local/bin/claude",
      "/usr/bin/claude",
      `${process.env.HOME}/.local/bin/claude`,
      `${process.env.HOME}/.npm-global/bin/claude`,
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    // Try which
    try {
      return execSync("which claude 2>/dev/null", { encoding: "utf-8" }).trim();
    } catch {
      return "";
    }
  }

  updateSettings(partial: Partial<ChatSettings>): void {
    Object.assign(this.settings, partial);

    // Persist to config.json (exclude auth_mode and api_key — those are env/runtime only)
    const toPersist: Record<string, unknown> = {};
    const persistKeys = ["model", "max_tokens", "temperature", "effort", "thinking", "tool_choice", "memory_enabled", "system_prompt_extra"];
    for (const key of persistKeys) {
      if (key in partial) {
        toPersist[key] = (partial as Record<string, unknown>)[key];
      }
    }
    if (Object.keys(toPersist).length > 0) {
      this.configManager.saveChatSettings(toPersist);
    }
  }

  getSettings(): ChatSettings {
    return { ...this.settings };
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async chat(message: string, sessionId: string = "default"): Promise<ChatResponse> {
    // Route by auth mode
    if (this.settings.auth_mode === "claude_cli") {
      return this.chatViaCli(message, sessionId);
    }

    if (!this.settings.api_key) {
      return {
        response: "",
        tool_calls: [],
        error: "No API key and Claude CLI not found. Either:\n- Set ANTHROPIC_API_KEY env var\n- Install Claude Code: npm i -g @anthropic-ai/claude-code && claude login",
      };
    }

    // Get or create session
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    const messages = this.sessions.get(sessionId)!;

    // Add user message
    messages.push({ role: "user", content: message });

    // Log session
    appendSessionLog(this.root, "user", message);

    // Build system prompt with context + auto-detected docs from user message
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (this.settings.system_prompt_extra) {
      systemPrompt += "\n\n" + this.settings.system_prompt_extra;
    }
    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge, message);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch {
        // Context build failure is non-critical
      }
    }

    // Tool use loop
    const toolCalls: ToolCallLog[] = [];
    let loops = 0;

    while (loops < MAX_TOOL_LOOPS) {
      loops++;

      const apiResponse = await this.callClaudeApi(systemPrompt, messages);

      if (apiResponse.error) {
        return { response: "", tool_calls: toolCalls, error: apiResponse.error };
      }

      const content = apiResponse.content;
      messages.push({ role: "assistant", content });

      // Check for tool_use blocks
      const toolUseBlocks = content.filter(
        (b: Record<string, unknown>) => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        // No more tools — extract text response
        const textBlocks = content
          .filter((b: Record<string, unknown>) => b.type === "text")
          .map((b: Record<string, unknown>) => b.text as string);

        const response = textBlocks.join("\n\n");
        appendSessionLog(this.root, "assistant", response.slice(0, 500));

        // Compaction: summarize old messages when session gets long
        if (messages.length > 20) {
          await this.compactSession(sessionId, messages);
        }

        return { response, tool_calls: toolCalls };
      }

      // Execute tools
      const toolResults: Array<Record<string, unknown>> = [];

      for (const block of toolUseBlocks) {
        const toolName = block.name as string;
        const toolInput = (block.input || {}) as Record<string, unknown>;
        const toolId = block.id as string;

        const result = await executeTool(toolName, toolInput, this.root, this.bridge, this.blenderBridge);
        const resultText = result.content[0]?.text || "";
        const isError = result.isError || false;

        toolCalls.push({ name: toolName, result: resultText.slice(0, 200), is_error: isError });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolId,
          content: resultText,
          ...(isError ? { is_error: true } : {}),
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    return {
      response: "Tool execution limit reached.",
      tool_calls: toolCalls,
      error: "Max tool loops exceeded",
    };
  }

  private async chatViaCli(message: string, sessionId: string): Promise<ChatResponse> {
    if (!this.claudeCliPath) {
      return {
        response: "",
        tool_calls: [],
        error: "Claude CLI not found. Install: npm i -g @anthropic-ai/claude-code && claude login",
      };
    }

    appendSessionLog(this.root, "user", message);

    // Build context-enhanced prompt
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (this.settings.system_prompt_extra) {
      systemPrompt += "\n\n" + this.settings.system_prompt_extra;
    }
    if (this.settings.memory_enabled) {
      try {
        const ctx = await buildContext(this.root, this.bridge, message);
        if (ctx) systemPrompt += "\n\n" + ctx;
      } catch { /* non-critical */ }
    }

    // Build conversation context from session
    const messages = this.sessions.get(sessionId) || [];
    let conversationContext = "";
    const recentMsgs = messages.slice(-6);
    for (const msg of recentMsgs) {
      if (typeof msg.content === "string") {
        conversationContext += `${msg.role}: ${msg.content}\n\n`;
      }
    }

    const fullPrompt = conversationContext
      ? `${conversationContext}user: ${message}`
      : message;

    try {
      // Write temp files for CLI
      const gfDir = join(this.root, ".godotforge");
      mkdirSync(gfDir, { recursive: true });

      const systemPromptPath = join(gfDir, "system-prompt.txt");
      writeFileSync(systemPromptPath, systemPrompt);

      // Write MCP config so CLI has access to ALL GodotForge tools
      // Claude CLI handles the full tool_use loop internally via MCP protocol
      const mcpConfigPath = join(gfDir, "mcp-cli-config.json");
      let mcpDistPath = join(this.root, "mcp-server", "dist", "index.js");
      if (!existsSync(mcpDistPath)) {
        const parentRoot = join(this.root, "..");
        mcpDistPath = join(parentRoot, "mcp-server", "dist", "index.js");
      }

      writeFileSync(mcpConfigPath, JSON.stringify({
        mcpServers: {
          godotforge: {
            command: "node",
            args: [mcpDistPath, "--project-root", this.root],
          },
        },
      }));

      // Use JSON output format to get structured result with turn count
      const args = [
        "--print",
        "--output-format", "json",
        "--model", this.settings.model,
        "--system-prompt-file", systemPromptPath,
        "--mcp-config", mcpConfigPath,
      ];

      // Effort level (Claude CLI supports --effort)
      if (this.settings.effort && this.settings.effort !== "high") {
        args.push("--effort", this.settings.effort);
      }

      // Prompt via stdin
      args.push("-p", "-");

      const output = execFileSync(this.claudeCliPath, args, {
        input: fullPrompt,
        encoding: "utf-8",
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      });

      // Parse JSON result from Claude CLI
      const toolCalls: ToolCallLog[] = [];
      let response = "";

      try {
        // Output may have multiple JSON lines or extra whitespace
        const jsonStr = output.trim().split("\n").pop() || output.trim();
        const cliResult = JSON.parse(jsonStr);
        response = cliResult.result || "";
        const numTurns = cliResult.num_turns || 1;
        if (numTurns > 1) {
          console.error(`[GodotForge Chat] CLI completed: ${numTurns} turns (tools executed via MCP)`);
        }

        // If more than 1 turn, tools were executed via MCP
        if (numTurns > 1) {
          const toolTurns = Math.floor((numTurns - 1) / 2); // each tool = request + response turn
          toolCalls.push({
            name: `(${toolTurns} tool${toolTurns > 1 ? "s" : ""} executed via MCP)`,
            result: `Claude CLI executed ${toolTurns} tool call${toolTurns > 1 ? "s" : ""} in ${numTurns} turns`,
            is_error: false,
          });
        }

        if (cliResult.is_error) {
          return {
            response: "",
            tool_calls: toolCalls,
            error: response || "Claude CLI returned an error",
          };
        }
      } catch {
        // Fallback: treat output as plain text (shouldn't happen with --output-format json)
        response = output.trim();
      }

      // Store in session
      if (!this.sessions.has(sessionId)) this.sessions.set(sessionId, []);
      const sess = this.sessions.get(sessionId)!;
      sess.push({ role: "user", content: message });
      sess.push({ role: "assistant", content: response });

      // Compaction
      if (sess.length > 20) {
        await this.compactSession(sessionId, sess);
      }

      appendSessionLog(this.root, "assistant", response.slice(0, 500));

      return { response, tool_calls: toolCalls };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      // Extract useful info from execFileSync errors (includes stdout/stderr)
      const errOutput = (error as Record<string, unknown>)?.stdout as string || "";
      let parsedError = errMsg.slice(0, 500);

      // Try to parse error from JSON output
      if (errOutput) {
        try {
          const errResult = JSON.parse(errOutput);
          if (errResult.result) parsedError = errResult.result;
        } catch { /* not JSON */ }
      }

      return {
        response: "",
        tool_calls: [],
        error: `Claude CLI error: ${parsedError}`,
      };
    }
  }

  /**
   * Compaction: summarize old messages, keep 6 most recent.
   * Flushes key decisions/patterns to memory before discarding.
   */
  private async compactSession(sessionId: string, messages: Message[]): Promise<void> {
    const keepCount = 6;
    if (messages.length <= keepCount) return;

    const oldMessages = messages.slice(0, messages.length - keepCount);
    const recentMessages = messages.slice(messages.length - keepCount);

    // Build summary of old messages
    const summaryParts: string[] = [];
    for (const msg of oldMessages) {
      if (typeof msg.content === "string" && msg.content.length > 0) {
        summaryParts.push(`${msg.role}: ${msg.content.slice(0, 200)}`);
      }
    }

    const summaryText = summaryParts.join("\n").slice(0, 2000);
    const compactedMessage: Message = {
      role: "user",
      content: `[Previous conversation summary]\n${summaryText}\n[End summary — conversation continues below]`,
    };

    // Replace session with compacted + recent
    messages.length = 0;
    messages.push(compactedMessage, ...recentMessages);

    console.error(`[GodotForge Chat] Compacted session '${sessionId}': ${oldMessages.length} msgs → 1 summary + ${keepCount} recent`);
  }

  private async callClaudeApi(
    systemPrompt: string,
    messages: Message[]
  ): Promise<{ content: Array<Record<string, unknown>>; error?: string }> {
    // Build request body with all configured parameters
    const body: Record<string, unknown> = {
      model: this.settings.model,
      max_tokens: this.settings.max_tokens,
      system: systemPrompt,
      messages,
      tools: getToolDefinitions(),
    };

    // Temperature (only if not default)
    if (this.settings.temperature !== 1.0) {
      body.temperature = this.settings.temperature;
    }

    // Tool choice
    if (this.settings.tool_choice !== "auto") {
      body.tool_choice = { type: this.settings.tool_choice };
    }

    // Thinking (adaptive for Opus/Sonnet 4.6)
    if (this.settings.thinking === "adaptive") {
      body.thinking = { type: "adaptive" };
    }

    // Effort (output_config)
    if (this.settings.effort !== "high") {
      body.output_config = { effort: this.settings.effort };
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.settings.api_key,
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
      return { content: data.content as Array<Record<string, unknown>> };
    } catch (error) {
      return {
        content: [],
        error: `API call failed: ${error instanceof Error ? error.message : error}`,
      };
    }
  }
}
