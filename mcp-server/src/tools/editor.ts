import { z } from "zod";
import { ToolContext } from "./types.js";

export function registerEditorTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  // --- Editor tools (delegate to Godot plugin) ---

  regTool(
    "create_scene",
    "Create a new scene with a root node and save it as a .tscn file.",
    {
      path: z.string().describe("File path (e.g. 'res://scenes/player.tscn')"),
      root_type: z.string().describe("Node type for root (e.g. 'CharacterBody2D')"),
      root_name: z.string().optional().describe("Name for the root node"),
    },
    async (args) => runTool("create_scene", args)
  );

  regTool(
    "get_scene_tree",
    "Get the node hierarchy of the currently edited scene.",
    {},
    async () => runTool("get_scene_tree", {})
  );

  regTool(
    "add_node",
    "Add a child node to a node in the currently edited scene.",
    {
      parent_path: z.string().describe("NodePath to parent (e.g. '.' for root)"),
      type: z.string().describe("Node type (e.g. 'Sprite2D')"),
      name: z.string().describe("Name for the new node"),
    },
    async (args) => runTool("add_node", args)
  );

  regTool(
    "set_property",
    "Set a property on a node in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to target node"),
      property: z.string().describe("Property name"),
      value: z.any().describe("Value to set"),
    },
    async (args) => runTool("set_property", args)
  );

  regTool(
    "create_script",
    "Create a new GDScript file with the given content.",
    {
      path: z.string().describe("File path (e.g. 'res://scripts/player.gd')"),
      content: z.string().describe("Full GDScript source code"),
      attach_to: z.string().optional().describe("NodePath to attach script to"),
    },
    async (args) => runTool("create_script", args)
  );

  regTool(
    "read_script",
    "Read the content of a GDScript file.",
    {
      path: z.string().describe("File path (e.g. 'res://scripts/player.gd')"),
    },
    async (args) => runTool("read_script", args)
  );

  regTool(
    "open_scene",
    "Open a scene file in the Godot editor for editing.",
    {
      path: z.string().describe("Scene file path (e.g. 'res://scenes/player.tscn')"),
    },
    async (args) => runTool("open_scene", args)
  );

  regTool(
    "remove_node",
    "Remove a node from the currently edited scene in Godot.",
    {
      node_path: z.string().describe("NodePath to the node to remove"),
    },
    async (args) => runTool("remove_node", args)
  );

  regTool(
    "rename_node",
    "Rename a node in the currently edited scene in Godot.",
    {
      node_path: z.string().describe("NodePath to the node"),
      new_name: z.string().describe("New name"),
    },
    async (args) => runTool("rename_node", args)
  );

  regTool(
    "duplicate_node",
    "Duplicate a node (and its children) in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to duplicate"),
      new_name: z.string().optional().describe("Name for the copy"),
    },
    async (args) => runTool("duplicate_node", args)
  );

  regTool(
    "move_node",
    "Move a node to a new parent in the currently edited scene.",
    {
      node_path: z.string().describe("NodePath to move"),
      new_parent_path: z.string().describe("NodePath to the new parent"),
    },
    async (args) => runTool("move_node", args)
  );

  regTool(
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

  regTool(
    "execute_editor_script",
    "Execute arbitrary GDScript in the Godot editor context. Has access to EditorInterface, ClassDB, ResourceSaver, etc. Use for operations not covered by other tools.",
    {
      code: z.string().describe("GDScript code to execute. Use _result = 'text' to return output."),
    },
    async (args) => runTool("execute_editor_script", args)
  );

  regTool(
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

  regTool(
    "add_scene_instance",
    "Instance an existing .tscn scene as a child node in the current scene.",
    {
      scene_path: z.string().describe("Path to scene file (e.g. 'res://scenes/player.tscn')"),
      parent_path: z.string().optional().describe("Parent NodePath (default: root '.')"),
      name: z.string().optional().describe("Name for the instance"),
    },
    async (args) => runTool("add_scene_instance", args)
  );

  regTool(
    "save_scene",
    "Save the currently edited scene to disk.",
    {},
    async () => runTool("save_scene", {})
  );

  regTool(
    "get_node_properties",
    "Get all properties and values of a node in the current scene.",
    {
      node_path: z.string().describe("NodePath to the node"),
      filter: z.string().optional().describe("Filter property names (e.g. 'position', 'collision')"),
    },
    async (args) => runTool("get_node_properties", args)
  );

  regTool(
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

  regTool(
    "set_project_setting",
    "Set a Godot project setting (window size, physics, main scene, input actions, etc.).",
    {
      key: z.string().describe("Setting key (e.g. 'display/window/size/viewport_width', 'application/run/main_scene')"),
      value: z.any().describe("Setting value"),
    },
    async (args) => runTool("set_project_setting", args)
  );

  regTool(
    "get_editor_errors",
    "Get recent errors and warnings from the Godot editor log.",
    {},
    async () => runTool("get_editor_errors", {})
  );
}
