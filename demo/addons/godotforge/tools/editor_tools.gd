@tool
extends GodotForgeToolBase

## Advanced editor tools: execute_editor_script, add_resource, add_scene_instance,
## save_scene, get_node_properties, connect_signal, set_project_setting, get_editor_errors.


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"execute_editor_script":
			return _execute_editor_script(input)
		"add_resource":
			return _add_resource(input)
		"add_scene_instance":
			return _add_scene_instance(input)
		"save_scene":
			return _save_scene()
		"get_node_properties":
			return _get_node_properties(input)
		"connect_signal":
			return _connect_signal(input)
		"set_project_setting":
			return _set_project_setting(input)
		"get_editor_errors":
			return _get_editor_errors()
		_:
			return {"result": "Unknown editor tool: %s" % tool_name, "is_error": true}


func _execute_editor_script(input: Dictionary) -> Dictionary:
	var code: String = input.get("code", "")
	if code == "":
		return {"result": "Missing 'code' parameter.", "is_error": true}

	# Wrap code in an EditorScript-like class
	var full_code := "@tool\nextends Node\n\nfunc _run():\n"
	for line in code.split("\n"):
		full_code += "\t" + line + "\n"
	full_code += "\nfunc get_result() -> String:\n\treturn _result\n\nvar _result: String = 'OK'\n"

	var script := GDScript.new()
	script.source_code = full_code
	var err := script.reload()
	if err != OK:
		return {"result": "Script compilation error: %s" % error_string(err), "is_error": true}

	var instance = script.new()
	if instance.has_method("_run"):
		instance._run()

	var result_text: String = "OK"
	if instance.has_method("get_result"):
		result_text = str(instance.get_result())

	if instance is Node:
		instance.queue_free()

	return {"result": result_text}


func _add_resource(input: Dictionary) -> Dictionary:
	var node_path: String = input.get("node_path", ".")
	var property: String = input.get("property", "")
	var resource_type: String = input.get("resource_type", "")

	if property == "":
		return {"result": "Missing 'property' parameter.", "is_error": true}
	if resource_type == "":
		return {"result": "Missing 'resource_type' parameter.", "is_error": true}

	var node := _find_node_by_path(node_path)
	if not node:
		return {"result": "Node not found: %s" % node_path, "is_error": true}

	if not ClassDB.class_exists(resource_type):
		return {"result": "Unknown resource type: %s" % resource_type, "is_error": true}

	var resource: Resource = ClassDB.instantiate(resource_type)
	if not resource:
		return {"result": "Failed to create resource: %s" % resource_type, "is_error": true}

	# Apply optional properties to the resource
	var resource_props: Dictionary = input.get("resource_properties", {})
	for key in resource_props:
		var value = resource_props[key]
		# Convert vector/color dicts
		if value is Dictionary:
			if value.has("x") and value.has("y"):
				value = Vector2(value.x, value.y) if not value.has("z") else Vector3(value.x, value.y, value.z)
			elif value.has("r") and value.has("g"):
				value = Color(value.r, value.g, value.b, value.get("a", 1.0))
		resource.set(key, value)

	node.set(property, resource)
	return {"result": "Set %s.%s = %s (new %s)" % [node.name, property, str(resource), resource_type]}


func _add_scene_instance(input: Dictionary) -> Dictionary:
	var scene_path: String = input.get("scene_path", "")
	var parent_path: String = input.get("parent_path", ".")
	var instance_name: String = input.get("name", "")

	if scene_path == "":
		return {"result": "Missing 'scene_path' parameter.", "is_error": true}

	if not FileAccess.file_exists(scene_path):
		return {"result": "Scene not found: %s" % scene_path, "is_error": true}

	var root := _get_edited_scene_root()
	if not root:
		return {"result": "No scene is currently open.", "is_error": true}

	var parent := _find_node_by_path(parent_path)
	if not parent:
		return {"result": "Parent not found: %s" % parent_path, "is_error": true}

	var packed := load(scene_path) as PackedScene
	if not packed:
		return {"result": "Failed to load scene: %s" % scene_path, "is_error": true}

	var instance := packed.instantiate()
	if instance_name != "":
		instance.name = instance_name

	parent.add_child(instance)
	instance.owner = root

	return {"result": "Instanced %s as '%s' under %s." % [scene_path, instance.name, parent.name]}


func _save_scene() -> Dictionary:
	var root := _get_edited_scene_root()
	if not root:
		return {"result": "No scene is currently open.", "is_error": true}

	var path := root.scene_file_path
	if path == "":
		return {"result": "Scene has no file path. Use create_scene first.", "is_error": true}

	var packed := PackedScene.new()
	var err := packed.pack(root)
	if err != OK:
		return {"result": "Failed to pack scene: %s" % error_string(err), "is_error": true}

	err = ResourceSaver.save(packed, path)
	if err != OK:
		return {"result": "Failed to save scene: %s" % error_string(err), "is_error": true}

	return {"result": "Scene saved: %s" % path}


func _get_node_properties(input: Dictionary) -> Dictionary:
	var node_path: String = input.get("node_path", ".")
	var filter: String = input.get("filter", "")

	var node := _find_node_by_path(node_path)
	if not node:
		return {"result": "Node not found: %s" % node_path, "is_error": true}

	var props := {}
	for p in node.get_property_list():
		var name: String = p.get("name", "")
		if name == "" or name.begins_with("_"):
			continue
		if filter != "" and filter.to_lower() not in name.to_lower():
			continue
		# Skip internal/metadata properties
		var usage: int = p.get("usage", 0)
		if usage & PROPERTY_USAGE_EDITOR == 0:
			continue
		props[name] = str(node.get(name))

	return {"result": JSON.stringify(props, "\t")}


func _connect_signal(input: Dictionary) -> Dictionary:
	var source_path: String = input.get("source_path", "")
	var signal_name: String = input.get("signal_name", "")
	var target_path: String = input.get("target_path", "")
	var method_name: String = input.get("method_name", "")

	if source_path == "" or signal_name == "" or target_path == "" or method_name == "":
		return {"result": "Missing required parameters: source_path, signal_name, target_path, method_name.", "is_error": true}

	var source := _find_node_by_path(source_path)
	if not source:
		return {"result": "Source node not found: %s" % source_path, "is_error": true}

	var target := _find_node_by_path(target_path)
	if not target:
		return {"result": "Target node not found: %s" % target_path, "is_error": true}

	if not source.has_signal(signal_name):
		return {"result": "Signal '%s' not found on %s." % [signal_name, source.name], "is_error": true}

	if source.is_connected(signal_name, Callable(target, method_name)):
		return {"result": "Signal already connected.", "is_error": true}

	source.connect(signal_name, Callable(target, method_name))
	return {"result": "Connected %s.%s → %s.%s()" % [source.name, signal_name, target.name, method_name]}


func _set_project_setting(input: Dictionary) -> Dictionary:
	var key: String = input.get("key", "")
	var value = input.get("value")

	if key == "":
		return {"result": "Missing 'key' parameter.", "is_error": true}

	ProjectSettings.set_setting(key, value)
	ProjectSettings.save()

	return {"result": "Set project setting: %s = %s" % [key, str(value)]}


func _get_editor_errors() -> Dictionary:
	# Read recent errors from Godot's log file
	var log_path := "user://logs/godot.log"
	if not FileAccess.file_exists(log_path):
		return {"result": "No log file found."}

	var file := FileAccess.open(log_path, FileAccess.READ)
	if not file:
		return {"result": "Cannot read log file."}

	var content := file.get_as_text()
	var lines := content.split("\n")

	# Extract errors and warnings from last 50 lines
	var errors: PackedStringArray = []
	var start := maxi(0, lines.size() - 50)
	for i in range(start, lines.size()):
		var line: String = lines[i]
		if "ERROR" in line or "WARNING" in line or "SCRIPT ERROR" in line:
			errors.append(line.strip_edges())

	if errors.size() == 0:
		return {"result": "No recent errors found."}

	return {"result": "%d errors/warnings:\n%s" % [errors.size(), "\n".join(errors)]}
