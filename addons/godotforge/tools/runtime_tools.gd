@tool
extends GodotForgeToolBase

const CAPTURE_AUTOLOAD := "GodotForgeCapture"
const CAPTURE_SCRIPT := "res://addons/godotforge/capture/game_capture.gd"
const POLL_INTERVAL_MS := 100
const POLL_TIMEOUT_MS := 3000

var _debugger: GodotForgeDebugger


func set_debugger(debugger: GodotForgeDebugger) -> void:
	_debugger = debugger


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
		"simulate_input":
			return _simulate_input(input)
		"simulate_input_sequence":
			return _simulate_input_sequence(input)
		_:
			return {"result": "Unknown runtime tool: %s" % tool_name, "is_error": true}


# --- Temp dir paths (native NTFS, avoids WSL2 9P latency) ---

func _temp(filename: String) -> String:
	return OS.get_temp_dir().path_join(filename)


# --- Run / Stop ---

func _run_scene(input: Dictionary) -> Dictionary:
	if EditorInterface.is_playing_scene():
		return {"result": "A scene is already running. Stop it first.", "is_error": true}
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
	_remove_capture_autoload()
	_cleanup_temp_files()
	return {"result": "Scene stopped."}


func _get_game_status() -> Dictionary:
	var playing := EditorInterface.is_playing_scene()
	var scene := EditorInterface.get_playing_scene()
	var debugger_connected := _debugger != null and _debugger.is_game_connected()
	return {"result": JSON.stringify({
		"playing": playing,
		"scene": scene,
		"debugger_connected": debugger_connected,
	})}


# --- Screenshots ---

func _take_screenshot(input: Dictionary) -> Dictionary:
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


func _take_game_screenshot(_input: Dictionary) -> Dictionary:
	if not EditorInterface.is_playing_scene():
		return {"result": "No game is running. Use run_scene first.", "is_error": true}

	# Write capture trigger to temp dir
	var trigger := _temp("godotforge_capture")
	var f := FileAccess.open(trigger, FileAccess.WRITE)
	if not f:
		return {"result": "Failed to create capture trigger.", "is_error": true}
	f.store_string("1")
	f.close()

	# Poll for screenshot file
	var screenshot := _temp("godotforge_screenshot.png")
	var start_time := Time.get_ticks_msec()
	while Time.get_ticks_msec() - start_time < POLL_TIMEOUT_MS:
		if FileAccess.file_exists(screenshot):
			var mod_time := FileAccess.get_modified_time(screenshot)
			if mod_time >= (start_time / 1000) - 2:
				var img := Image.load_from_file(screenshot)
				if img:
					# Also copy to project dir for MCP to read
					var project_path := "res://.godotforge/game_screenshot.png"
					_ensure_dir(project_path)
					img.save_png(project_path)
					return {"result": "Game screenshot saved to %s (%dx%d)" % [project_path, img.get_width(), img.get_height()]}
		OS.delay_msec(POLL_INTERVAL_MS)

	return {"result": "Timeout waiting for game screenshot.", "is_error": true}


# --- Runtime State ---

func _get_runtime_state(input: Dictionary) -> Dictionary:
	if not EditorInterface.is_playing_scene():
		return {"result": "No game is running. Use run_scene first.", "is_error": true}

	# Trigger capture (which also writes state)
	var trigger := _temp("godotforge_capture")
	var f := FileAccess.open(trigger, FileAccess.WRITE)
	if not f:
		return {"result": "Failed to create state trigger.", "is_error": true}
	f.store_string("1")
	f.close()

	var filter_path: String = input.get("node_path", "")
	var state_path := _temp("godotforge_state.json")
	var start_time := Time.get_ticks_msec()

	while Time.get_ticks_msec() - start_time < POLL_TIMEOUT_MS:
		if FileAccess.file_exists(state_path):
			var mod_time := FileAccess.get_modified_time(state_path)
			if mod_time >= (start_time / 1000) - 2:
				var state_file := FileAccess.open(state_path, FileAccess.READ)
				if state_file:
					var json_str := state_file.get_as_text()
					state_file.close()

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


# --- Input Simulation ---

func _simulate_input(input: Dictionary) -> Dictionary:
	if not EditorInterface.is_playing_scene():
		return {"result": "No game is running. Use run_scene first.", "is_error": true}
	var action: String = input.get("action", "")
	if action == "":
		return {"result": "Missing 'action' parameter.", "is_error": true}

	var file := FileAccess.open(_temp("godotforge_input"), FileAccess.WRITE)
	if not file:
		return {"result": "Failed to create input trigger.", "is_error": true}
	file.store_string(action)
	file.close()
	return {"result": "Input '%s' simulated" % action}


func _simulate_input_sequence(input: Dictionary) -> Dictionary:
	if not EditorInterface.is_playing_scene():
		return {"result": "No game is running. Use run_scene first.", "is_error": true}
	var sequence = input.get("sequence", [])
	if sequence is not Array or sequence.size() == 0:
		return {"result": "Missing or empty 'sequence' array.", "is_error": true}

	var json := JSON.stringify(sequence)
	var file := FileAccess.open(_temp("godotforge_input_sequence"), FileAccess.WRITE)
	if not file:
		return {"result": "Failed to create sequence trigger.", "is_error": true}
	file.store_string(json)
	file.close()
	return {"result": "Input sequence queued (%d actions)" % sequence.size()}


# --- Autoload Management ---

func _inject_capture_autoload() -> void:
	if not ProjectSettings.has_setting("autoload/" + CAPTURE_AUTOLOAD):
		ProjectSettings.set_setting("autoload/" + CAPTURE_AUTOLOAD, "*" + CAPTURE_SCRIPT)
		ProjectSettings.save()


func _remove_capture_autoload() -> void:
	if ProjectSettings.has_setting("autoload/" + CAPTURE_AUTOLOAD):
		ProjectSettings.set_setting("autoload/" + CAPTURE_AUTOLOAD, null)
		ProjectSettings.set_setting("editor_plugins/enabled", ProjectSettings.get_setting("editor_plugins/enabled"))
		ProjectSettings.save()


func _cleanup_temp_files() -> void:
	for filename in ["godotforge_input", "godotforge_input_sequence", "godotforge_capture",
					  "godotforge_screenshot.png", "godotforge_state.json"]:
		var path := _temp(filename)
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)


func _ensure_dir(file_path: String) -> void:
	var dir_path := file_path.get_base_dir()
	if not DirAccess.dir_exists_absolute(dir_path):
		DirAccess.make_dir_recursive_absolute(dir_path)
