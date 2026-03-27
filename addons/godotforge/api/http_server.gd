@tool
class_name GodotForgeHttpServer
extends Node

signal server_started(port: int)
signal server_stopped()

const DEFAULT_PORT := 6970
const MAX_PORT_TRIES := 10
const BIND_HOST := "127.0.0.1"

var _server: TCPServer
var _tool_registry: GodotForgeToolRegistry
var _port: int = 0
var _port_file_path: String = ""


func setup(tool_registry: GodotForgeToolRegistry) -> void:
	_tool_registry = tool_registry


func start() -> bool:
	_server = TCPServer.new()

	# Try ports starting from DEFAULT_PORT
	for i in MAX_PORT_TRIES:
		var try_port := DEFAULT_PORT + i
		var err := _server.listen(try_port, BIND_HOST)
		if err == OK:
			_port = try_port
			_write_port_file()
			print("[GodotForge] HTTP server listening on %s:%d" % [BIND_HOST, _port])
			server_started.emit(_port)
			return true

	push_error("[GodotForge] Failed to bind HTTP server on ports %d-%d" % [DEFAULT_PORT, DEFAULT_PORT + MAX_PORT_TRIES - 1])
	return false


func stop() -> void:
	if _server and _server.is_listening():
		_server.stop()
	_remove_port_file()
	_port = 0
	print("[GodotForge] HTTP server stopped.")
	server_stopped.emit()


func get_port() -> int:
	return _port


func _process(_delta: float) -> void:
	if not _server or not _server.is_listening():
		return

	if _server.is_connection_available():
		var peer: StreamPeerTCP = _server.take_connection()
		if peer:
			_handle_connection(peer)


func _handle_connection(peer: StreamPeerTCP) -> void:
	# Read request with a timeout
	peer.set_no_delay(true)
	var request_data := ""
	var start_time := Time.get_ticks_msec()
	var timeout_ms := 2000

	# Read headers
	while Time.get_ticks_msec() - start_time < timeout_ms:
		if peer.get_status() != StreamPeerTCP.STATUS_CONNECTED:
			return
		var available := peer.get_available_bytes()
		if available > 0:
			var chunk := peer.get_data(available)
			if chunk[0] == OK:
				request_data += chunk[1].get_string_from_utf8()
				# Check if we have complete headers
				if "\r\n\r\n" in request_data:
					break
		else:
			OS.delay_msec(1)

	if request_data == "":
		return

	# Parse headers and body
	var header_end := request_data.find("\r\n\r\n")
	if header_end == -1:
		_send_response(peer, 400, {"error": "Malformed request"})
		return

	var header_section := request_data.substr(0, header_end)
	var body := request_data.substr(header_end + 4)
	var headers := header_section.split("\r\n")

	if headers.size() == 0:
		_send_response(peer, 400, {"error": "Empty request"})
		return

	# Parse request line
	var request_line := headers[0]
	var parts := request_line.split(" ")
	if parts.size() < 2:
		_send_response(peer, 400, {"error": "Invalid request line"})
		return

	var method := parts[0]
	var path := parts[1]

	# Parse Content-Length and read remaining body if needed
	var content_length := 0
	for header in headers:
		if header.to_lower().begins_with("content-length:"):
			content_length = header.split(":")[1].strip_edges().to_int()

	if content_length > 0 and body.length() < content_length:
		var remaining := content_length - body.length()
		start_time = Time.get_ticks_msec()
		while body.length() < content_length and Time.get_ticks_msec() - start_time < timeout_ms:
			var available := peer.get_available_bytes()
			if available > 0:
				var chunk := peer.get_data(mini(available, remaining))
				if chunk[0] == OK:
					body += chunk[1].get_string_from_utf8()
					remaining = content_length - body.length()
			else:
				OS.delay_msec(1)

	# Route request
	_route(peer, method, path, body)


func _route(peer: StreamPeerTCP, method: String, path: String, body: String) -> void:
	# CORS headers for browser-based MCP clients
	if method == "OPTIONS":
		_send_response(peer, 200, {}, true)
		return

	match path:
		"/health":
			if method == "GET":
				_handle_health(peer)
			else:
				_send_response(peer, 405, {"error": "Method not allowed"})

		"/tools":
			if method == "GET":
				_handle_list_tools(peer)
			else:
				_send_response(peer, 405, {"error": "Method not allowed"})

		"/context/scene":
			if method == "GET":
				_handle_context_scene(peer)
			else:
				_send_response(peer, 405, {"error": "Method not allowed"})

		"/context/project":
			if method == "GET":
				_handle_context_project(peer)
			else:
				_send_response(peer, 405, {"error": "Method not allowed"})

		_:
			# Check for /tools/{name} pattern
			if path.begins_with("/tools/") and method == "POST":
				var tool_name := path.substr("/tools/".length())
				_handle_execute_tool(peer, tool_name, body)
			else:
				_send_response(peer, 404, {"error": "Not found: %s" % path})


func _handle_health(peer: StreamPeerTCP) -> void:
	var godot_version := Engine.get_version_info()
	_send_response(peer, 200, {
		"status": "ok",
		"plugin": "godotforge",
		"plugin_version": "0.1.0",
		"godot_version": "%d.%d.%d" % [godot_version.major, godot_version.minor, godot_version.patch],
		"scene": _get_current_scene_name(),
	})


func _handle_list_tools(peer: StreamPeerTCP) -> void:
	var tools := GodotForgeClaudeTools.get_tool_definitions()
	_send_response(peer, 200, {"tools": tools})


func _handle_execute_tool(peer: StreamPeerTCP, tool_name: String, body: String) -> void:
	if not _tool_registry:
		_send_response(peer, 500, {"error": "Tool registry not initialized"})
		return

	if not _tool_registry.has_tool(tool_name):
		_send_response(peer, 404, {"error": "Unknown tool: %s" % tool_name})
		return

	# Parse input
	var input := {}
	if body != "":
		var json := JSON.new()
		var err := json.parse(body)
		if err != OK:
			_send_response(peer, 400, {"error": "Invalid JSON body"})
			return
		input = json.data if json.data is Dictionary else {}

	# Execute tool
	var result := _tool_registry.execute(tool_name, input)
	var status := 200 if not result.get("is_error", false) else 422
	_send_response(peer, status, result)


func _handle_context_scene(peer: StreamPeerTCP) -> void:
	var result := _tool_registry.execute("get_scene_tree", {})
	_send_response(peer, 200, result)


func _handle_context_project(peer: StreamPeerTCP) -> void:
	var project_name := ProjectSettings.get_setting("application/config/name", "Unnamed Project")
	var scenes := _scan_files("res://", "*.tscn")
	var scripts := _scan_files("res://", "*.gd")
	var godot_version := Engine.get_version_info()

	_send_response(peer, 200, {
		"project_name": project_name,
		"godot_version": "%d.%d.%d" % [godot_version.major, godot_version.minor, godot_version.patch],
		"scene_count": scenes.size(),
		"script_count": scripts.size(),
		"scenes": scenes,
		"scripts": scripts,
		"current_scene": _get_current_scene_name(),
	})


func _scan_files(base_path: String, pattern: String) -> Array[String]:
	var results: Array[String] = []
	var dir := DirAccess.open(base_path)
	if not dir:
		return results

	dir.list_dir_begin()
	var file_name := dir.get_next()
	while file_name != "":
		var full_path := base_path.path_join(file_name)
		if dir.current_is_dir():
			if not file_name.begins_with(".") and file_name != "addons":
				results.append_array(_scan_files(full_path, pattern))
		else:
			if file_name.match(pattern):
				results.append(full_path)
		file_name = dir.get_next()
	dir.list_dir_end()
	return results


func _get_current_scene_name() -> String:
	var root := EditorInterface.get_edited_scene_root() if EditorInterface else null
	if root:
		return root.scene_file_path if root.scene_file_path != "" else root.name
	return ""


func _send_response(peer: StreamPeerTCP, status_code: int, data: Dictionary, cors_only: bool = false) -> void:
	var status_text := "OK"
	match status_code:
		400: status_text = "Bad Request"
		404: status_text = "Not Found"
		405: status_text = "Method Not Allowed"
		422: status_text = "Unprocessable Entity"
		500: status_text = "Internal Server Error"

	var json_body := JSON.stringify(data) if not cors_only else ""
	var response := "HTTP/1.1 %d %s\r\n" % [status_code, status_text]
	response += "Content-Type: application/json\r\n"
	response += "Content-Length: %d\r\n" % json_body.length()
	response += "Access-Control-Allow-Origin: *\r\n"
	response += "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
	response += "Access-Control-Allow-Headers: Content-Type\r\n"
	response += "Connection: close\r\n"
	response += "\r\n"
	response += json_body

	peer.put_data(response.to_utf8_buffer())


func _write_port_file() -> void:
	var project_path := ProjectSettings.globalize_path("res://")
	_port_file_path = project_path.path_join(".godot/godotforge.port")

	# Ensure .godot dir exists
	var godot_dir := project_path.path_join(".godot")
	if not DirAccess.dir_exists_absolute(godot_dir):
		DirAccess.make_dir_recursive_absolute(godot_dir)

	var file := FileAccess.open(_port_file_path, FileAccess.WRITE)
	if file:
		file.store_string(str(_port))
		print("[GodotForge] Port file written: %s" % _port_file_path)


func _remove_port_file() -> void:
	if _port_file_path != "" and FileAccess.file_exists(_port_file_path):
		DirAccess.remove_absolute(_port_file_path)
		print("[GodotForge] Port file removed.")
