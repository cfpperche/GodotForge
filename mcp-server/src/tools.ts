import { type Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP tool definitions — superset of the plugin's tools.
 * Tools 1-6 delegate to the Godot plugin via HTTP bridge.
 * Tools 7-10 run locally in the MCP server.
 */
export const TOOLS: Tool[] = [
  // === Editor tools (delegated to Godot plugin) ===
  {
    name: "create_scene",
    description:
      "Create a new scene with a root node and save it as a .tscn file in the Godot project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "File path for the scene (e.g. 'res://scenes/player.tscn')",
        },
        root_type: {
          type: "string",
          description:
            "Node type for the root (e.g. 'Node2D', 'CharacterBody2D', 'Control')",
        },
        root_name: {
          type: "string",
          description: "Name for the root node",
        },
      },
      required: ["path", "root_type"],
    },
  },
  {
    name: "get_scene_tree",
    description:
      "Get the node hierarchy of the currently edited scene in Godot as a tree structure.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "add_node",
    description:
      "Add a child node to a node in the currently edited scene in Godot.",
    inputSchema: {
      type: "object" as const,
      properties: {
        parent_path: {
          type: "string",
          description:
            "NodePath to the parent node (e.g. '.' for root, 'Player/Sprite2D')",
        },
        type: {
          type: "string",
          description:
            "Node type to add (e.g. 'Sprite2D', 'CollisionShape2D', 'Camera2D')",
        },
        name: {
          type: "string",
          description: "Name for the new node",
        },
      },
      required: ["parent_path", "type", "name"],
    },
  },
  {
    name: "set_property",
    description:
      "Set a property on a node in the currently edited scene in Godot.",
    inputSchema: {
      type: "object" as const,
      properties: {
        node_path: {
          type: "string",
          description: "NodePath to the target node",
        },
        property: {
          type: "string",
          description:
            "Property name (e.g. 'position', 'scale', 'texture')",
        },
        value: {
          description: "Value to set (type depends on property)",
        },
      },
      required: ["node_path", "property", "value"],
    },
  },
  {
    name: "create_script",
    description:
      "Create a new GDScript file with the given content in the Godot project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "File path for the script (e.g. 'res://scripts/player.gd')",
        },
        content: {
          type: "string",
          description: "Full GDScript source code",
        },
        attach_to: {
          type: "string",
          description:
            "Optional NodePath to attach the script to in the current scene",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "read_script",
    description: "Read the content of a GDScript file from the Godot project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "File path of the script to read (e.g. 'res://scripts/player.gd')",
        },
      },
      required: ["path"],
    },
  },

  // === Local tools (run in MCP server) ===
  {
    name: "get_project_context",
    description:
      "Get project metadata: name, Godot version, list of scenes and scripts, current open scene.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "read_file",
    description:
      "Read any file from the Godot project directory (not just scripts).",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "Relative path from project root (e.g. 'scenes/player.tscn', 'project.godot')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description:
      "List files in a directory of the Godot project, with optional pattern filtering.",
    inputSchema: {
      type: "object" as const,
      properties: {
        directory: {
          type: "string",
          description:
            "Directory relative to project root (e.g. 'scenes', 'scripts'). Empty for root.",
        },
        pattern: {
          type: "string",
          description:
            "Optional glob pattern to filter (e.g. '*.gd', '*.tscn')",
        },
      },
    },
  },
];

/** Tools that require the Godot plugin to be running */
export const EDITOR_TOOLS = new Set([
  "create_scene",
  "get_scene_tree",
  "add_node",
  "set_property",
  "create_script",
  "read_script",
]);
