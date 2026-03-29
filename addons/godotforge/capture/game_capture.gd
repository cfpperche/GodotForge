## GodotForge Game Capture — injected autoload that runs in the GAME process.
## Uses EngineDebugger IPC (editor↔game) when available, falls back to trigger files.
## NOT @tool — this runs in the game, not the editor.
extends Node

const CAPTURE_DIR := "res://.godotforge/"
const SCREENSHOT_REQUEST := "res://.godotforge/capture_request"
const SCREENSHOT_OUTPUT := "res://.godotforge/game_screenshot.png"
const STATE_OUTPUT := "res://.godotforge/runtime_state.json"
const INPUT_REQUEST := "res://.godotforge/input_request"
const DEBUG_LOG := "res://.godotforge/debug.log"

var _use_debugger: bool = false


func _ready() -> void:
	if not DirAccess.dir_exists_absolute(CAPTURE_DIR):
		DirAccess.make_dir_recursive_absolute(CAPTURE_DIR)

	if EngineDebugger.is_active():
		EngineDebugger.register_message_capture("godotforge", _on_debugger_message)
		_use_debugger = true
		_log("Debugger capture registered")


func _process(_delta: float) -> void:
	# Poll for file-based input from OS temp dir (native filesystem, fast)
	var temp_input := OS.get_temp_dir().path_join("godotforge_input")
	if FileAccess.file_exists(temp_input):
		var f := FileAccess.open(temp_input, FileAccess.READ)
		if f:
			var action := f.get_as_text().strip_edges()
			f.close()
			DirAccess.remove_absolute(temp_input)
			_log("FILE POLL: found action='%s' at %s" % [action, temp_input])
			if action != "":
				_do_input(action, 100)

	# Poll for file-based capture (fallback when debugger inactive)
	if not _use_debugger and FileAccess.file_exists(SCREENSHOT_REQUEST):
		DirAccess.remove_absolute(SCREENSHOT_REQUEST)
		_do_capture()
		_do_state("")


func _on_debugger_message(message: String, data: Array) -> bool:
	match message:
		"capture":
			_do_capture()
			return true
		"input":
			# Input via debugger is too slow (~13s latency on WSL2).
			# File-based polling in _process() handles input instead.
			return true
		"state":
			var filter_path: String = data[0] if data.size() > 0 else ""
			_do_state(filter_path)
			return true
	return false


# --- Capture ---

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

	image.save_png(SCREENSHOT_OUTPUT)

	if _use_debugger:
		EngineDebugger.send_message("godotforge:capture_done", [SCREENSHOT_OUTPUT])


# --- Input Simulation ---

func _do_input(action: String, duration_ms: int) -> void:
	if action == "":
		return

	_log("INPUT: simulating '%s'" % action)

	# Find which physical keys are mapped to this action
	var events := InputMap.action_get_events(action)
	var key_event: InputEventKey = null
	for ev in events:
		if ev is InputEventKey:
			key_event = ev.duplicate()
			break

	if key_event:
		# Send real key press event — fires _input() AND is_action_just_pressed()
		key_event.pressed = true
		Input.parse_input_event(key_event)
		_log("INPUT: key press sent (keycode=%d)" % key_event.keycode)

		await get_tree().create_timer(0.05).timeout

		key_event.pressed = false
		Input.parse_input_event(key_event)
	else:
		# Fallback: use action_press for actions without key mappings
		Input.action_press(action, 1.0)
		await get_tree().create_timer(0.1).timeout
		Input.action_release(action)

	_log("INPUT: done '%s'" % action)

	if _use_debugger:
		EngineDebugger.send_message("godotforge:input_done", [action])


# --- Runtime State ---

func _do_state(filter_path: String) -> void:
	var state: Dictionary = {}
	_collect_node_info(get_tree().root, state, 0)

	if filter_path != "":
		var filtered: Dictionary = {}
		for key: String in state:
			if key.contains(filter_path):
				filtered[key] = state[key]
		state = filtered

	var json := JSON.stringify(state, "\t")

	var file := FileAccess.open(STATE_OUTPUT, FileAccess.WRITE)
	if file:
		file.store_string(json)
		file.close()

	if _use_debugger:
		EngineDebugger.send_message("godotforge:state_done", [json])


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
	var f := FileAccess.open(DEBUG_LOG, FileAccess.READ_WRITE)
	if not f:
		f = FileAccess.open(DEBUG_LOG, FileAccess.WRITE)
	if f:
		f.seek_end()
		f.store_line("[capture:%d] %s" % [Time.get_ticks_msec(), msg])
		f.close()
