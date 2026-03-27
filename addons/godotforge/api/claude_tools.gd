@tool
class_name GodotForgeClaudeTools
extends RefCounted

## Returns the tool definitions array for the Claude Messages API.
static func get_tool_definitions() -> Array[Dictionary]:
	return [
		{
			"name": "create_scene",
			"description": "Create a new scene with a root node and save it as a .tscn file.",
			"input_schema": {
				"type": "object",
				"properties": {
					"path": {
						"type": "string",
						"description": "File path for the scene (e.g. 'res://scenes/player.tscn')"
					},
					"root_type": {
						"type": "string",
						"description": "Node type for the root (e.g. 'Node2D', 'CharacterBody2D', 'Control')"
					},
					"root_name": {
						"type": "string",
						"description": "Name for the root node"
					}
				},
				"required": ["path", "root_type"]
			}
		},
		{
			"name": "get_scene_tree",
			"description": "Get the node hierarchy of the currently edited scene as a tree structure.",
			"input_schema": {
				"type": "object",
				"properties": {},
			}
		},
		{
			"name": "add_node",
			"description": "Add a child node to a node in the currently edited scene.",
			"input_schema": {
				"type": "object",
				"properties": {
					"parent_path": {
						"type": "string",
						"description": "NodePath to the parent node (e.g. '.' for root, 'Player/Sprite2D')"
					},
					"type": {
						"type": "string",
						"description": "Node type to add (e.g. 'Sprite2D', 'CollisionShape2D', 'Camera2D')"
					},
					"name": {
						"type": "string",
						"description": "Name for the new node"
					}
				},
				"required": ["parent_path", "type", "name"]
			}
		},
		{
			"name": "set_property",
			"description": "Set a property on a node in the currently edited scene.",
			"input_schema": {
				"type": "object",
				"properties": {
					"node_path": {
						"type": "string",
						"description": "NodePath to the target node"
					},
					"property": {
						"type": "string",
						"description": "Property name (e.g. 'position', 'scale', 'texture')"
					},
					"value": {
						"description": "Value to set (type depends on property)"
					}
				},
				"required": ["node_path", "property", "value"]
			}
		},
		{
			"name": "create_script",
			"description": "Create a new GDScript file with the given content.",
			"input_schema": {
				"type": "object",
				"properties": {
					"path": {
						"type": "string",
						"description": "File path for the script (e.g. 'res://scripts/player.gd')"
					},
					"content": {
						"type": "string",
						"description": "Full GDScript source code"
					},
					"attach_to": {
						"type": "string",
						"description": "Optional NodePath to attach the script to in the current scene"
					}
				},
				"required": ["path", "content"]
			}
		},
		{
			"name": "read_script",
			"description": "Read the content of a GDScript file.",
			"input_schema": {
				"type": "object",
				"properties": {
					"path": {
						"type": "string",
						"description": "File path of the script to read (e.g. 'res://scripts/player.gd')"
					}
				},
				"required": ["path"]
			}
		},
	]
