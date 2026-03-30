## GodotForge Game Capture — injected autoload that runs in the GAME process.
## All IPC via OS temp dir (native NTFS) to avoid WSL2 9P latency.
## Polls for trigger files every frame, executes commands, writes results.
extends Node

const DEBUG_LOG := "res://.godotforge/debug.log"

var _temp_dir: String
var _input_file: String
var _input_seq_file: String
var _capture_file: String
var _state_file: String
var _screenshot_file: String


func _ready() -> void:
	_temp_dir = OS.get_temp_dir()
	_input_file = _temp_dir.path_join("godotforge_input")
	_input_seq_file = _temp_dir.path_join("godotforge_input_sequence")
	_capture_file = _temp_dir.path_join("godotforge_capture")
	_state_file = _temp_dir.path_join("godotforge_state.json")
	_screenshot_file = _temp_dir.path_join("godotforge_screenshot.png")

	# Register debugger capture (for connection status only)
	if EngineDebugger.is_active():
		EngineDebugger.register_message_capture("godotforge", _on_debugger_message)

	_log("Game capture ready. Temp dir: %s" % _temp_dir)


func _process(_delta: float) -> void:
	# Poll for single input
	if FileAccess.file_exists(_input_file):
		var f := FileAccess.open(_input_file, FileAccess.READ)
		if f:
			var action := f.get_as_text().strip_edges()
			f.close()
			DirAccess.remove_absolute(_input_file)
			if action != "":
				_do_input(action)

	# Poll for input sequence
	if FileAccess.file_exists(_input_seq_file):
		var f := FileAccess.open(_input_seq_file, FileAccess.READ)
		if f:
			var json_str := f.get_as_text().strip_edges()
			f.close()
			DirAccess.remove_absolute(_input_seq_file)
			if json_str != "":
				_do_input_sequence(json_str)

	# Poll for capture request
	if FileAccess.file_exists(_capture_file):
		DirAccess.remove_absolute(_capture_file)
		_do_capture()

	# Poll for state request (reuse capture trigger — capture always writes both)


func _on_debugger_message(message: String, _data: Array) -> bool:
	# Debugger messages are slow (~13s on WSL2). Only used for ack, not triggers.
	return message.begins_with("godotforge:")


# --- Input Simulation ---

func _do_input(action: String) -> void:
	var events := InputMap.action_get_events(action)
	var key_event: InputEventKey = null
	for ev in events:
		if ev is InputEventKey:
			key_event = ev.duplicate()
			break

	if key_event:
		key_event.pressed = true
		Input.parse_input_event(key_event)
		await get_tree().create_timer(0.05).timeout
		key_event.pressed = false
		Input.parse_input_event(key_event)
	else:
		Input.action_press(action, 1.0)
		await get_tree().create_timer(0.1).timeout
		Input.action_release(action)


func _do_input_sequence(json_str: String) -> void:
	var parsed = JSON.parse_string(json_str)
	if not parsed is Array:
		_log("Invalid input sequence JSON")
		return

	_log("Input sequence: %d actions" % parsed.size())
	for entry in parsed:
		if not entry is Dictionary:
			continue
		var action: String = entry.get("action", "")
		var delay_ms: int = entry.get("delay_ms", 0)

		if delay_ms > 0:
			await get_tree().create_timer(delay_ms / 1000.0).timeout

		if action != "":
			_do_input(action)
			# Small gap between inputs for physics frame detection
			await get_tree().create_timer(0.05).timeout


# --- Screenshot Capture ---

func _do_capture() -> void:
	await RenderingServer.frame_post_draw

	var viewport := get_viewport()
	if not viewport:
		return
	var texture := viewport.get_texture()
	if not texture:
		return
	var image := texture.get_image()
	if not image:
		return

	image.save_png(_screenshot_file)

	# Also write runtime state
	_write_state("")

	_log("Capture saved to %s" % _screenshot_file)


# --- Runtime State ---

func _write_state(filter_path: String) -> void:
	var state: Dictionary = {}
	_collect_node_info(get_tree().root, state, 0)

	if filter_path != "":
		var filtered: Dictionary = {}
		for key: String in state:
			if key.contains(filter_path):
				filtered[key] = state[key]
		state = filtered

	var json := JSON.stringify(state, "\t")
	var file := FileAccess.open(_state_file, FileAccess.WRITE)
	if file:
		file.store_string(json)
		file.close()


func _collect_node_info(node: Node, state: Dictionary, depth: int) -> void:
	if depth > 8:
		return
	if node == self:
		return

	var info: Dictionary = {"type": node.get_class()}
	if "position" in node:
		info["position"] = var_to_str(node.get("position"))
	if "global_position" in node:
		info["global_position"] = var_to_str(node.get("global_position"))
	if "visible" in node:
		info["visible"] = node.get("visible")
	if "text" in node:
		info["text"] = node.get("text")
	if "velocity" in node:
		info["velocity"] = var_to_str(node.get("velocity"))
	if "scale" in node:
		info["scale"] = var_to_str(node.get("scale"))
	if "rotation" in node:
		info["rotation"] = node.get("rotation")

	state[str(node.get_path())] = info
	for child in node.get_children():
		_collect_node_info(child, state, depth + 1)


func _log(msg: String) -> void:
	var dir := "res://.godotforge/"
	if not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
	var f := FileAccess.open(DEBUG_LOG, FileAccess.READ_WRITE)
	if not f:
		f = FileAccess.open(DEBUG_LOG, FileAccess.WRITE)
	if f:
		f.seek_end()
		f.store_line("[capture:%d] %s" % [Time.get_ticks_msec(), msg])
		f.close()
