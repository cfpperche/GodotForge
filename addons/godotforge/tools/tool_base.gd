@tool
class_name GodotForgeToolBase
extends RefCounted


## Override in subclasses. Returns a dictionary with "result" (String) and optionally "is_error" (bool).
func execute(_tool_name: String, _input: Dictionary) -> Dictionary:
	return {"result": "Tool not implemented.", "is_error": true}


func _get_edited_scene_root() -> Node:
	return EditorInterface.get_edited_scene_root()


func _find_node_by_path(node_path: String) -> Node:
	var root := _get_edited_scene_root()
	if not root:
		return null
	if node_path == "." or node_path == "":
		return root
	return root.get_node_or_null(NodePath(node_path))
