@tool
extends GodotForgeToolBase


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"add_node":
			return _add_node(input)
		"set_property":
			return _set_property(input)
		_:
			return {"result": "Unknown node tool: %s" % tool_name, "is_error": true}


func _add_node(input: Dictionary) -> Dictionary:
	var parent_path: String = input.get("parent_path", ".")
	var type: String = input.get("type", "")
	var node_name: String = input.get("name", "")

	if type == "":
		return {"result": "Missing 'type' parameter.", "is_error": true}
	if node_name == "":
		return {"result": "Missing 'name' parameter.", "is_error": true}

	var root := _get_edited_scene_root()
	if not root:
		return {"result": "No scene is currently open.", "is_error": true}

	var parent := _find_node_by_path(parent_path)
	if not parent:
		return {"result": "Parent node not found: %s" % parent_path, "is_error": true}

	var new_node: Node = ClassDB.instantiate(type)
	if not new_node:
		return {"result": "Invalid node type: %s" % type, "is_error": true}

	new_node.name = node_name
	parent.add_child(new_node)
	new_node.owner = root

	return {"result": "Added %s (%s) as child of %s." % [node_name, type, parent.name]}


func _set_property(input: Dictionary) -> Dictionary:
	var node_path: String = input.get("node_path", ".")
	var property: String = input.get("property", "")
	var value = input.get("value")

	if property == "":
		return {"result": "Missing 'property' parameter.", "is_error": true}

	var node := _find_node_by_path(node_path)
	if not node:
		return {"result": "Node not found: %s" % node_path, "is_error": true}

	# Convert common value types
	var converted_value = _convert_value(node, property, value)
	if converted_value is Dictionary and converted_value.get("is_error", false):
		return converted_value

	node.set(property, converted_value)
	return {"result": "Set %s.%s = %s" % [node.name, property, str(converted_value)]}


func _convert_value(node: Node, property: String, value) -> Variant:
	# If value is a dictionary, try to convert to Godot types
	if value is Dictionary:
		if value.has("x") and value.has("y"):
			if value.has("z"):
				return Vector3(value.x, value.y, value.z)
			return Vector2(value.x, value.y)
		if value.has("r") and value.has("g") and value.has("b"):
			return Color(value.r, value.g, value.b, value.get("a", 1.0))

	# If value is a string that looks like a resource path, try loading it
	if value is String and value.begins_with("res://"):
		var res := ResourceLoader.load(value)
		if res:
			return res

	return value
