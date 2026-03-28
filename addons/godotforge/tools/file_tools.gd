@tool
extends GodotForgeToolBase


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"get_project_context":
			return _get_project_context()
		"read_file":
			return _read_file(input)
		"list_files":
			return _list_files(input)
		_:
			return {"result": "Unknown file tool: %s" % tool_name, "is_error": true}


func _get_project_context() -> Dictionary:
	var project_name: String = ProjectSettings.get_setting("application/config/name", "Unnamed")
	var godot_version := Engine.get_version_info()
	var scenes := _scan_by_extension("res://", "tscn")
	var scripts := _scan_by_extension("res://", "gd")

	var current_scene := ""
	var root := _get_edited_scene_root()
	if root:
		current_scene = root.scene_file_path

	var context := {
		"project_name": project_name,
		"godot_version": "%d.%d.%d" % [godot_version.major, godot_version.minor, godot_version.patch],
		"scene_count": scenes.size(),
		"script_count": scripts.size(),
		"scenes": scenes,
		"scripts": scripts,
		"current_scene": current_scene,
	}
	return {"result": JSON.stringify(context, "\t")}


func _read_file(input: Dictionary) -> Dictionary:
	var path: String = input.get("path", "")
	if path == "":
		return {"result": "Missing 'path' parameter.", "is_error": true}

	# Security: must be within res://
	if not path.begins_with("res://"):
		path = "res://" + path

	if not FileAccess.file_exists(path):
		return {"result": "File not found: %s" % path, "is_error": true}

	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return {"result": "Failed to open: %s" % path, "is_error": true}

	return {"result": file.get_as_text()}


func _list_files(input: Dictionary) -> Dictionary:
	var directory: String = input.get("directory", "res://")
	var pattern: String = input.get("pattern", "")

	if not directory.begins_with("res://"):
		directory = "res://" + directory

	var dir := DirAccess.open(directory)
	if not dir:
		return {"result": "Directory not found: %s" % directory, "is_error": true}

	var entries: PackedStringArray = []
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if dir.current_is_dir():
			entries.append(name + "/")
		else:
			if pattern == "" or name.match(pattern):
				entries.append(name)
		name = dir.get_next()
	dir.list_dir_end()

	entries.sort()
	return {"result": "\n".join(entries) if entries.size() > 0 else "(empty directory)"}


func _scan_by_extension(base_path: String, ext: String) -> Array[String]:
	var results: Array[String] = []
	var dir := DirAccess.open(base_path)
	if not dir:
		return results

	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		var full_path := base_path.path_join(name)
		if dir.current_is_dir():
			if not name.begins_with(".") and name != "addons":
				results.append_array(_scan_by_extension(full_path, ext))
		elif name.get_extension() == ext:
			results.append(full_path)
		name = dir.get_next()
	dir.list_dir_end()
	return results
