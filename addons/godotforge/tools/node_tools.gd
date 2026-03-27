@tool
extends GodotForgeToolBase


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"add_node":
			return _add_node(input)
		"set_property":
			return _set_property(input)
		"remove_node":
			return _remove_node(input)
		"rename_node":
			return _rename_node(input)
		"duplicate_node":
			return _duplicate_node(input)
		"move_node":
			return _move_node(input)
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


func _remove_node(input: Dictionary) -> Dictionary:
	var node_path: String = input.get("node_path", "")
	if node_path == "":
		return {"result": "Missing 'node_path' parameter.", "is_error": true}

	var root := _get_edited_scene_root()
	if not root:
		return {"result": "No scene is currently open.", "is_error": true}

	if node_path == "." or node_path == "":
		return {"result": "Cannot remove the root node.", "is_error": true}

	var node := _find_node_by_path(node_path)
	if not node:
		return {"result": "Node not found: %s" % node_path, "is_error": true}

	var node_name := node.name
	node.get_parent().remove_child(node)
	node.queue_free()
	return {"result": "Removed node: %s" % node_name}


func _rename_node(input: Dictionary) -> Dictionary:
	var node_path: String = input.get("node_path", ".")
	var new_name: String = input.get("new_name", "")

	if new_name == "":
		return {"result": "Missing 'new_name' parameter.", "is_error": true}

	var node := _find_node_by_path(node_path)
	if not node:
		return {"result": "Node not found: %s" % node_path, "is_error": true}

	var old_name := node.name
	node.name = new_name
	return {"result": "Renamed '%s' to '%s'." % [old_name, new_name]}


func _duplicate_node(input: Dictionary) -> Dictionary:
	var node_path: String = input.get("node_path", "")
	var new_name: String = input.get("new_name", "")

	if node_path == "":
		return {"result": "Missing 'node_path' parameter.", "is_error": true}

	var root := _get_edited_scene_root()
	if not root:
		return {"result": "No scene is currently open.", "is_error": true}

	var node := _find_node_by_path(node_path)
	if not node:
		return {"result": "Node not found: %s" % node_path, "is_error": true}

	var duplicate := node.duplicate()
	if new_name != "":
		duplicate.name = new_name
	else:
		duplicate.name = node.name + "Copy"

	node.get_parent().add_child(duplicate)
	_set_owner_recursive(duplicate, root)
	return {"result": "Duplicated '%s' as '%s'." % [node.name, duplicate.name]}


func _move_node(input: Dictionary) -> Dictionary:
	var node_path: String = input.get("node_path", "")
	var new_parent_path: String = input.get("new_parent_path", "")

	if node_path == "":
		return {"result": "Missing 'node_path' parameter.", "is_error": true}
	if new_parent_path == "":
		return {"result": "Missing 'new_parent_path' parameter.", "is_error": true}

	var root := _get_edited_scene_root()
	if not root:
		return {"result": "No scene is currently open.", "is_error": true}

	var node := _find_node_by_path(node_path)
	if not node:
		return {"result": "Node not found: %s" % node_path, "is_error": true}

	var new_parent := _find_node_by_path(new_parent_path)
	if not new_parent:
		return {"result": "New parent not found: %s" % new_parent_path, "is_error": true}

	node.reparent(new_parent)
	_set_owner_recursive(node, root)
	return {"result": "Moved '%s' to '%s'." % [node.name, new_parent.name]}


func _set_owner_recursive(node: Node, owner: Node) -> void:
	node.owner = owner
	for child in node.get_children():
		_set_owner_recursive(child, owner)


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
