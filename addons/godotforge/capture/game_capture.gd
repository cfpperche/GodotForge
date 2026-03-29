## GodotForge Game Capture — injected autoload that runs in the GAME process.
## Captures viewport screenshots and runtime scene state on demand via trigger files.
## NOT @tool — this runs in the game, not the editor.
extends Node

const CAPTURE_DIR := "res://.godotforge/"
const SCREENSHOT_REQUEST := "res://.godotforge/capture_request"
const SCREENSHOT_OUTPUT := "res://.godotforge/game_screenshot.png"
const STATE_OUTPUT := "res://.godotforge/runtime_state.json"


func _ready() -> void:
	# Ensure capture directory exists
	if not DirAccess.dir_exists_absolute(CAPTURE_DIR):
		DirAccess.make_dir_recursive_absolute(CAPTURE_DIR)


func _process(_delta: float) -> void:
	if FileAccess.file_exists(SCREENSHOT_REQUEST):
		_handle_capture_request()


func _handle_capture_request() -> void:
	# Remove the request file first to avoid re-triggering
	DirAccess.remove_absolute(SCREENSHOT_REQUEST)

	# Wait one frame for rendering to complete, then capture
	await RenderingServer.frame_post_draw
	_take_game_screenshot()
	_write_runtime_state()


func _take_game_screenshot() -> void:
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


func _write_runtime_state() -> void:
	var state: Dictionary = {}
	_collect_node_info(get_tree().root, state, 0)

	var json := JSON.stringify(state, "\t")
	var file := FileAccess.open(STATE_OUTPUT, FileAccess.WRITE)
	if file:
		file.store_string(json)
		file.close()


func _collect_node_info(node: Node, state: Dictionary, depth: int) -> void:
	if depth > 8:
		return
	# Skip the capture autoload itself
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
	if "modulate" in node:
		info["modulate"] = var_to_str(node.get("modulate"))

	state[str(node.get_path())] = info

	for child in node.get_children():
		_collect_node_info(child, state, depth + 1)
