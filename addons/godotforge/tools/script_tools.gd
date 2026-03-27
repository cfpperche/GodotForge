@tool
extends GodotForgeToolBase


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"create_script":
			return _create_script(input)
		"read_script":
			return _read_script(input)
		_:
			return {"result": "Unknown script tool: %s" % tool_name, "is_error": true}


func _create_script(input: Dictionary) -> Dictionary:
	var path: String = input.get("path", "")
	var content: String = input.get("content", "")
	var attach_to: String = input.get("attach_to", "")

	if path == "":
		return {"result": "Missing 'path' parameter.", "is_error": true}
	if content == "":
		return {"result": "Missing 'content' parameter.", "is_error": true}

	# Ensure directory exists
	var dir_path := path.get_base_dir()
	if not DirAccess.dir_exists_absolute(dir_path):
		DirAccess.make_dir_recursive_absolute(dir_path)

	# Write the script file
	var file := FileAccess.open(path, FileAccess.WRITE)
	if not file:
		return {"result": "Failed to open file for writing: %s" % path, "is_error": true}
	file.store_string(content)
	file.close()

	# Optionally attach to a node in the current scene
	if attach_to != "":
		var node := _find_node_by_path(attach_to)
		if node:
			var script := load(path)
			if script:
				node.set_script(script)
			else:
				return {"result": "Script saved at %s but failed to load for attaching." % path, "is_error": true}
		else:
			return {"result": "Script saved at %s but node not found: %s" % [path, attach_to], "is_error": true}

	# Refresh filesystem
	EditorInterface.get_resource_filesystem().scan()

	var msg := "Script created at %s." % path
	if attach_to != "":
		msg += " Attached to %s." % attach_to
	return {"result": msg}


func _read_script(input: Dictionary) -> Dictionary:
	var path: String = input.get("path", "")

	if path == "":
		return {"result": "Missing 'path' parameter.", "is_error": true}

	if not FileAccess.file_exists(path):
		return {"result": "File not found: %s" % path, "is_error": true}

	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return {"result": "Failed to open file: %s" % path, "is_error": true}

	var content := file.get_as_text()
	return {"result": content}
