@tool
extends GodotForgeToolBase


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"create_scene":
			return _create_scene(input)
		"get_scene_tree":
			return _get_scene_tree()
		"open_scene":
			return _open_scene(input)
		_:
			return {"result": "Unknown scene tool: %s" % tool_name, "is_error": true}


func _create_scene(input: Dictionary) -> Dictionary:
	var path: String = input.get("path", "")
	var root_type: String = input.get("root_type", "Node")
	var root_name: String = input.get("root_name", "")

	if path == "":
		return {"result": "Missing 'path' parameter.", "is_error": true}

	# Ensure directory exists
	var dir_path := path.get_base_dir()
	if not DirAccess.dir_exists_absolute(dir_path):
		DirAccess.make_dir_recursive_absolute(dir_path)

	# Create root node
	var root_node: Node = ClassDB.instantiate(root_type)
	if not root_node:
		return {"result": "Invalid node type: %s" % root_type, "is_error": true}

	if root_name != "":
		root_node.name = root_name
	else:
		root_node.name = path.get_file().get_basename().capitalize().replace(" ", "")

	# Pack and save
	var scene := PackedScene.new()
	var err := scene.pack(root_node)
	root_node.queue_free()
	if err != OK:
		return {"result": "Failed to pack scene: %s" % error_string(err), "is_error": true}

	err = ResourceSaver.save(scene, path)
	if err != OK:
		return {"result": "Failed to save scene: %s" % error_string(err), "is_error": true}

	# Refresh filesystem so it shows up
	EditorInterface.get_resource_filesystem().scan()

	return {"result": "Scene created at %s with root %s (%s)." % [path, root_node.name if root_name != "" else path.get_file().get_basename(), root_type]}


func _get_scene_tree() -> Dictionary:
	var root := _get_edited_scene_root()
	if not root:
		return {"result": "No scene is currently open in the editor.", "is_error": true}

	var tree_str := _build_tree_string(root, 0)
	return {"result": tree_str}


func _build_tree_string(node: Node, depth: int) -> String:
	var indent := "  ".repeat(depth)
	var line := "%s%s (%s)" % [indent, node.name, node.get_class()]

	if node.get_script():
		line += " [script: %s]" % node.get_script().resource_path

	var result := line
	for child in node.get_children():
		result += "\n" + _build_tree_string(child, depth + 1)
	return result


func _open_scene(input: Dictionary) -> Dictionary:
	var path: String = input.get("path", "")
	if path == "":
		return {"result": "Missing 'path' parameter.", "is_error": true}
	if not FileAccess.file_exists(path):
		return {"result": "Scene not found: %s" % path, "is_error": true}

	EditorInterface.open_scene_from_path(path)
	return {"result": "Opened scene: %s" % path}
