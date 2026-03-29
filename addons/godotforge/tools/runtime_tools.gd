@tool
extends GodotForgeToolBase

const CAPTURE_AUTOLOAD := "GodotForgeCapture"
const CAPTURE_SCRIPT := "res://addons/godotforge/capture/game_capture.gd"
const CAPTURE_DIR := "res://.godotforge/"
const SCREENSHOT_REQUEST := "res://.godotforge/capture_request"
const GAME_SCREENSHOT := "res://.godotforge/game_screenshot.png"
const RUNTIME_STATE := "res://.godotforge/runtime_state.json"
const POLL_INTERVAL_MS := 100
const POLL_TIMEOUT_MS := 4000


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
		"take_game_screenshot":
			return _take_game_screenshot(input)
		"get_runtime_state":
			return _get_runtime_state(input)
		_:
			return {"result": "Unknown runtime tool: %s" % tool_name, "is_error": true}


# --- Run / Stop ---

func _run_scene(input: Dictionary) -> Dictionary:
	if EditorInterface.is_playing_scene():
		return {"result": "A scene is already running. Stop it first.", "is_error": true}

	# Inject capture autoload before playing
	_inject_capture_autoload()

	var scene_path: String = input.get("scene_path", "")

	if scene_path == "":
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

	# Clean up capture autoload
	_remove_capture_autoload()
	_cleanup_capture_files()

	return {"result": "Scene stopped."}


func _get_game_status() -> Dictionary:
	var playing := EditorInterface.is_playing_scene()
	var scene := EditorInterface.get_playing_scene()
	return {"result": JSON.stringify({"playing": playing, "scene": scene})}


# --- Screenshots ---

func _take_screenshot(input: Dictionary) -> Dictionary:
	# Smart: if game is playing, capture game window; otherwise capture editor
	if EditorInterface.is_playing_scene():
		return _take_game_screenshot(input)
	return _take_editor_screenshot(input)


func _take_editor_screenshot(input: Dictionary) -> Dictionary:
	var output_path: String = input.get("output_path", "res://.godotforge/screenshot.png")
	_ensure_dir(output_path)

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


func _take_game_screenshot(input: Dictionary) -> Dictionary:
	if not EditorInterface.is_playing_scene():
		return {"result": "No game is running. Use run_scene first.", "is_error": true}

	# Send capture request to game process via trigger file
	var request_result := _send_capture_request()
	if request_result.get("is_error", false):
		return request_result

	# Poll for game screenshot file
	var output_path: String = input.get("output_path", GAME_SCREENSHOT)
	var start_time := Time.get_ticks_msec()

	while Time.get_ticks_msec() - start_time < POLL_TIMEOUT_MS:
		if FileAccess.file_exists(GAME_SCREENSHOT):
			var mod_time := FileAccess.get_modified_time(GAME_SCREENSHOT)
			if mod_time >= (start_time / 1000) - 2:
				# File was written after our request
				if output_path != GAME_SCREENSHOT:
					# Copy to requested path
					var img := Image.load_from_file(GAME_SCREENSHOT)
					if img:
						img.save_png(output_path)

				var img := Image.load_from_file(GAME_SCREENSHOT)
				if img:
					return {"result": "Game screenshot saved to %s (%dx%d)" % [output_path, img.get_width(), img.get_height()]}
		OS.delay_msec(POLL_INTERVAL_MS)

	return {"result": "Timeout waiting for game screenshot. Is the GodotForge capture autoload active?", "is_error": true}


# --- Runtime State ---

func _get_runtime_state(input: Dictionary) -> Dictionary:
	if not EditorInterface.is_playing_scene():
		return {"result": "No game is running. Use run_scene first.", "is_error": true}

	# Send capture request (also writes runtime state)
	var request_result := _send_capture_request()
	if request_result.get("is_error", false):
		return request_result

	# Poll for runtime state file
	var start_time := Time.get_ticks_msec()
	while Time.get_ticks_msec() - start_time < POLL_TIMEOUT_MS:
		if FileAccess.file_exists(RUNTIME_STATE):
			var mod_time := FileAccess.get_modified_time(RUNTIME_STATE)
			if mod_time >= (start_time / 1000) - 2:
				var file := FileAccess.open(RUNTIME_STATE, FileAccess.READ)
				if file:
					var json_str := file.get_as_text()
					file.close()

					# Optionally filter by node path
					var filter_path: String = input.get("node_path", "")
					if filter_path != "":
						var parsed = JSON.parse_string(json_str)
						if parsed is Dictionary:
							var filtered: Dictionary = {}
							for key: String in parsed:
								if key.contains(filter_path):
									filtered[key] = parsed[key]
							return {"result": JSON.stringify(filtered, "\t")}

					return {"result": json_str}
		OS.delay_msec(POLL_INTERVAL_MS)

	return {"result": "Timeout waiting for runtime state.", "is_error": true}


# --- Capture Autoload Management ---

func _inject_capture_autoload() -> void:
	if not ProjectSettings.has_setting("autoload/" + CAPTURE_AUTOLOAD):
		ProjectSettings.set_setting("autoload/" + CAPTURE_AUTOLOAD, CAPTURE_SCRIPT)
		ProjectSettings.save()


func _remove_capture_autoload() -> void:
	if ProjectSettings.has_setting("autoload/" + CAPTURE_AUTOLOAD):
		ProjectSettings.set_setting("autoload/" + CAPTURE_AUTOLOAD, null)
		# Re-ensure the plugin stays enabled after save
		ProjectSettings.set_setting("editor_plugins/enabled", ProjectSettings.get_setting("editor_plugins/enabled"))
		ProjectSettings.save()


func _cleanup_capture_files() -> void:
	for path in [SCREENSHOT_REQUEST, GAME_SCREENSHOT, RUNTIME_STATE]:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)


func _send_capture_request() -> Dictionary:
	_ensure_dir(SCREENSHOT_REQUEST)
	var file := FileAccess.open(SCREENSHOT_REQUEST, FileAccess.WRITE)
	if not file:
		return {"result": "Failed to create capture request file.", "is_error": true}
	file.store_string(str(Time.get_ticks_msec()))
	file.close()
	return {}


func _ensure_dir(file_path: String) -> void:
	var dir_path := file_path.get_base_dir()
	if not DirAccess.dir_exists_absolute(dir_path):
		DirAccess.make_dir_recursive_absolute(dir_path)
