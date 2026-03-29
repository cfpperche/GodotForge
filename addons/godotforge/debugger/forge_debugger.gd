@tool
class_name GodotForgeDebugger
extends EditorDebuggerPlugin

## EditorDebuggerPlugin that communicates with the game process via
## EngineDebugger message capture. Sends commands (capture, input, state)
## and receives responses (capture_done, state_done, input_done).

signal capture_received(screenshot_path: String)
signal state_received(json: String)
signal input_done()

var _active_session_id: int = -1


func _has_capture(prefix: String) -> bool:
	return prefix == "godotforge"


func _capture(message: String, data: Array, session_id: int) -> bool:
	match message:
		"godotforge:capture_done":
			capture_received.emit(data[0] if data.size() > 0 else "")
			return true
		"godotforge:state_done":
			state_received.emit(data[0] if data.size() > 0 else "{}")
			return true
		"godotforge:input_done":
			input_done.emit()
			return true
	return false


func _setup_session(session_id: int) -> void:
	var session := get_session(session_id)
	session.started.connect(_on_session_started.bind(session_id))
	session.stopped.connect(_on_session_stopped.bind(session_id))


func _on_session_started(session_id: int) -> void:
	_active_session_id = session_id


func _on_session_stopped(session_id: int) -> void:
	if _active_session_id == session_id:
		_active_session_id = -1


func is_game_connected() -> bool:
	if _active_session_id < 0:
		return false
	var session := get_session(_active_session_id)
	return session != null and session.is_active()


func send_capture() -> void:
	if not is_game_connected():
		return
	get_session(_active_session_id).send_message("godotforge:capture", [])


func send_input(action: String, duration_ms: int = 100) -> void:
	if not is_game_connected():
		return
	get_session(_active_session_id).send_message("godotforge:input", [action, duration_ms])


func send_state_request(filter_path: String = "") -> void:
	if not is_game_connected():
		return
	get_session(_active_session_id).send_message("godotforge:state", [filter_path])
