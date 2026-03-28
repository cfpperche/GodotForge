@tool
class_name GodotForgeToolRegistry
extends RefCounted

## Registry for editor-only tools that require EditorInterface.
## Local tools (docs, memory, files) are handled by the MCP server.

var _handlers: Dictionary = {}  # tool_name -> GodotForgeToolBase


func setup() -> void:
	_register_defaults()


func _register_defaults() -> void:
	var scene_tools := preload("res://addons/godotforge/tools/scene_tools.gd").new()
	register("create_scene", scene_tools)
	register("get_scene_tree", scene_tools)
	register("open_scene", scene_tools)

	var node_tools := preload("res://addons/godotforge/tools/node_tools.gd").new()
	register("add_node", node_tools)
	register("set_property", node_tools)
	register("remove_node", node_tools)
	register("rename_node", node_tools)
	register("duplicate_node", node_tools)
	register("move_node", node_tools)

	var script_tools := preload("res://addons/godotforge/tools/script_tools.gd").new()
	register("create_script", script_tools)
	register("read_script", script_tools)
	register("edit_script", script_tools)

	var runtime_tools := preload("res://addons/godotforge/tools/runtime_tools.gd").new()
	register("run_scene", runtime_tools)
	register("stop_scene", runtime_tools)
	register("get_game_status", runtime_tools)
	register("take_screenshot", runtime_tools)

	var editor_tools := preload("res://addons/godotforge/tools/editor_tools.gd").new()
	register("execute_editor_script", editor_tools)
	register("add_resource", editor_tools)
	register("add_scene_instance", editor_tools)
	register("save_scene", editor_tools)
	register("get_node_properties", editor_tools)
	register("connect_signal", editor_tools)
	register("set_project_setting", editor_tools)
	register("get_editor_errors", editor_tools)


func register(tool_name: String, handler: GodotForgeToolBase) -> void:
	_handlers[tool_name] = handler


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	if not _handlers.has(tool_name):
		return {"result": "Unknown tool: %s" % tool_name, "is_error": true}
	return _handlers[tool_name].execute(tool_name, input)


func has_tool(tool_name: String) -> bool:
	return _handlers.has(tool_name)
