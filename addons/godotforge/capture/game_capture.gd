## GodotForge Game Capture — injected autoload that runs in the GAME process.
## Uses EngineDebugger IPC (editor↔game) when available, falls back to trigger files.
## NOT @tool — this runs in the game, not the editor.
extends Node

const CAPTURE_DIR := "res://.godotforge/"
const SCREENSHOT_REQUEST := "res://.godotforge/capture_request"
const SCREENSHOT_OUTPUT := "res://.godotforge/game_screenshot.png"
const STATE_OUTPUT := "res://.godotforge/runtime_state.json"

var _use_debugger: bool = false


func _ready() -> void:
	if not DirAccess.dir_exists_absolute(CAPTURE_DIR):
		DirAccess.make_dir_recursive_absolute(CAPTURE_DIR)

	# Register debugger message capture if running from editor
	if EngineDebugger.is_active():
		EngineDebugger.register_message_capture("godotforge", _on_debugger_message)
		_use_debugger = true


func _process(_delta: float) -> void:
	# File-based fallback (when not running from editor)
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
			var action: String = data[0] if data.size() > 0 else ""
			var duration_ms: int = data[1] if data.size() > 1 else 100
			_do_input(action, duration_ms)
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

	Input.action_press(action)

	if duration_ms > 0:
		await get_tree().create_timer(duration_ms / 1000.0).timeout
	else:
		await get_tree().process_frame

	Input.action_release(action)

	if _use_debugger:
		EngineDebugger.send_message("godotforge:input_done", [action])


# --- Runtime State ---

func _do_state(filter_path: String) -> void:
	var state: Dictionary = {}
	_collect_node_info(get_tree().root, state, 0)

	# Apply filter if provided
	if filter_path != "":
		var filtered: Dictionary = {}
		for key: String in state:
			if key.contains(filter_path):
				filtered[key] = state[key]
		state = filtered

	var json := JSON.stringify(state, "\t")

	# Always write to file (for MCP to read)
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
