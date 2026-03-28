@tool
class_name GodotForgeToolRegistry
extends RefCounted

var _handlers: Dictionary = {}  # tool_name -> GodotForgeToolBase


func setup() -> void:
	_register_defaults()


func _register_defaults() -> void:
	var scene_tools := preload("res://addons/godotforge/tools/scene_tools.gd").new()
	register("create_scene", scene_tools)
	register("get_scene_tree", scene_tools)

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


func register(tool_name: String, handler: GodotForgeToolBase) -> void:
	_handlers[tool_name] = handler


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	if not _handlers.has(tool_name):
		return {"result": "Unknown tool: %s" % tool_name, "is_error": true}
	return _handlers[tool_name].execute(tool_name, input)


func has_tool(tool_name: String) -> bool:
	return _handlers.has(tool_name)
