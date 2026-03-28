@tool
extends GodotForgeToolBase


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"run_scene":
			return _run_scene(input)
		"stop_scene":
			return _stop_scene()
		"get_game_status":
			return _get_game_status()
		"take_screenshot":
			return _take_screenshot(input)
		_:
			return {"result": "Unknown runtime tool: %s" % tool_name, "is_error": true}


func _run_scene(input: Dictionary) -> Dictionary:
	if EditorInterface.is_playing_scene():
		return {"result": "A scene is already running. Stop it first.", "is_error": true}

	var scene_path: String = input.get("scene_path", "")

	if scene_path == "":
		# Try current scene, then main scene
		var root := EditorInterface.get_edited_scene_root()
		if root and root.scene_file_path != "":
			EditorInterface.play_current_scene()
			return {"result": "Playing current scene: %s" % root.scene_file_path}
		else:
			EditorInterface.play_main_scene()
			return {"result": "Playing main scene."}
	else:
		EditorInterface.play_custom_scene(scene_path)
		return {"result": "Playing scene: %s" % scene_path}


func _stop_scene() -> Dictionary:
	if not EditorInterface.is_playing_scene():
		return {"result": "No scene is currently running.", "is_error": true}

	EditorInterface.stop_playing_scene()
	return {"result": "Scene stopped."}


func _get_game_status() -> Dictionary:
	var playing := EditorInterface.is_playing_scene()
	var scene := EditorInterface.get_playing_scene()

	return {"result": JSON.stringify({
		"playing": playing,
		"scene": scene,
	})}


func _take_screenshot(input: Dictionary) -> Dictionary:
	var output_path: String = input.get("output_path", "res://.godotforge/screenshot.png")

	# Ensure output directory exists
	var dir_path := output_path.get_base_dir()
	if not DirAccess.dir_exists_absolute(dir_path):
		DirAccess.make_dir_recursive_absolute(dir_path)

	# Capture editor 2D viewport
	var viewport := EditorInterface.get_editor_viewport_2d()
	if not viewport:
		return {"result": "Failed to get editor viewport.", "is_error": true}

	var texture := viewport.get_texture()
	if not texture:
		return {"result": "Failed to get viewport texture.", "is_error": true}

	var image := texture.get_image()
	if not image:
		return {"result": "Failed to get viewport image.", "is_error": true}

	var err := image.save_png(output_path)
	if err != OK:
		return {"result": "Failed to save screenshot: %s" % error_string(err), "is_error": true}

	return {"result": "Screenshot saved to %s (%dx%d)" % [output_path, image.get_width(), image.get_height()]}
