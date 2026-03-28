@tool
extends VBoxContainer

## Thin chat panel that communicates with the MCP server's HTTP API.
## All LLM calls, tool execution, docs, and memory are handled by the MCP server.

const MessageBubble = preload("res://addons/godotforge/ui/message_bubble.gd")

var _tool_registry: GodotForgeToolRegistry
var _settings_panel: GodotForgeSettingsPanel

# UI elements
var _scroll_container: ScrollContainer
var _message_container: VBoxContainer
var _input_field: TextEdit
var _send_button: Button
var _status_label: Label
var _http_request: HTTPRequest

# MCP connection
var _mcp_port: int = 0
var _session_id: String = ""


func set_tool_registry(registry: GodotForgeToolRegistry) -> void:
	_tool_registry = registry


func _ready() -> void:
	name = "GodotForge"
	_session_id = str(randi())
	_build_ui()
	_setup_http()
	_discover_mcp()


func _build_ui() -> void:
	# Header
	var header := HBoxContainer.new()
	var title := Label.new()
	title.text = "GodotForge AI"
	title.add_theme_font_size_override("font_size", 16)
	header.add_child(title)

	header.add_spacer(false)

	var settings_btn := Button.new()
	settings_btn.text = "Settings"
	settings_btn.pressed.connect(_show_settings)
	header.add_child(settings_btn)

	var clear_btn := Button.new()
	clear_btn.text = "Clear"
	clear_btn.pressed.connect(_clear_chat)
	header.add_child(clear_btn)

	add_child(header)
	add_child(HSeparator.new())

	# Message area
	_scroll_container = ScrollContainer.new()
	_scroll_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll_container.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED

	_message_container = VBoxContainer.new()
	_message_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_message_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll_container.add_child(_message_container)
	add_child(_scroll_container)

	# Status
	_status_label = Label.new()
	_status_label.text = ""
	_status_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	add_child(_status_label)

	# Input
	var input_container := HBoxContainer.new()
	_input_field = TextEdit.new()
	_input_field.placeholder_text = "Ask GodotForge anything..."
	_input_field.custom_minimum_size = Vector2(0, 60)
	_input_field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_input_field.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	input_container.add_child(_input_field)

	_send_button = Button.new()
	_send_button.text = "Send"
	_send_button.custom_minimum_size = Vector2(60, 0)
	_send_button.pressed.connect(_on_send_pressed)
	input_container.add_child(_send_button)
	add_child(input_container)

	# Settings panel
	_settings_panel = GodotForgeSettingsPanel.new()
	_settings_panel.settings_changed.connect(_on_settings_changed)
	add_child(_settings_panel)

	# Welcome
	_add_bubble(MessageBubble.Role.ASSISTANT,
		"Welcome to GodotForge! Configure your API key in Settings, then try:\n\"Create a CharacterBody2D scene for the player\"")


func _setup_http() -> void:
	_http_request = HTTPRequest.new()
	_http_request.timeout = 300.0  # Long timeout for tool_use loops
	add_child(_http_request)
	_http_request.request_completed.connect(_on_chat_response)


func _discover_mcp() -> void:
	# Read MCP server port from .godotforge/mcp.port
	var port_file := "res://.godotforge/mcp.port"
	if FileAccess.file_exists(port_file):
		var file := FileAccess.open(port_file, FileAccess.READ)
		if file:
			_mcp_port = file.get_as_text().strip_edges().to_int()

	if _mcp_port > 0:
		_status_label.text = "Connected to MCP server (port %d)" % _mcp_port
	else:
		_status_label.text = "MCP server not detected. Start it or use Settings to configure."


func _on_send_pressed() -> void:
	var text := _input_field.text.strip_edges()
	if text == "":
		return

	if _mcp_port == 0:
		_discover_mcp()
		if _mcp_port == 0:
			_add_bubble(MessageBubble.Role.ERROR,
				"MCP server not running. Start with:\n  node mcp-server/dist/index.js --http-only --project-root <path>")
			return

	_add_bubble(MessageBubble.Role.USER, text)
	_input_field.text = ""
	_set_busy(true)

	# POST to MCP /chat
	var body := JSON.stringify({
		"message": text,
		"session_id": _session_id,
	})

	var url := "http://127.0.0.1:%d/chat" % _mcp_port
	var headers := PackedStringArray(["Content-Type: application/json"])
	var err := _http_request.request(url, headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		_set_busy(false)
		_add_bubble(MessageBubble.Role.ERROR, "Failed to connect to MCP server.")


func _on_chat_response(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	_set_busy(false)

	if result != HTTPRequest.RESULT_SUCCESS:
		_add_bubble(MessageBubble.Role.ERROR, "MCP server request failed (result: %d)" % result)
		return

	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		_add_bubble(MessageBubble.Role.ERROR, "Failed to parse MCP response.")
		return

	var data: Dictionary = json.data

	# Check for error
	var error_msg: String = data.get("error", "")
	if error_msg != "":
		_add_bubble(MessageBubble.Role.ERROR, error_msg)

	# Show tool calls
	var tool_calls: Array = data.get("tool_calls", [])
	for tc in tool_calls:
		if tc is Dictionary:
			var tool_name: String = tc.get("name", "")
			var tool_result: String = tc.get("result", "")
			var is_error: bool = tc.get("is_error", false)
			if is_error:
				_add_bubble(MessageBubble.Role.ERROR, "%s: %s" % [tool_name, tool_result])
			else:
				_add_bubble(MessageBubble.Role.TOOL, "%s: %s" % [tool_name, tool_result])

	# Show response text
	var response: String = data.get("response", "")
	if response != "":
		_add_bubble(MessageBubble.Role.ASSISTANT, response)


func _add_bubble(role: MessageBubble.Role, text: String) -> void:
	var bubble := MessageBubble.new()
	bubble.setup(role, text)
	_message_container.add_child(bubble)
	await get_tree().process_frame
	_scroll_container.scroll_vertical = int(_scroll_container.get_v_scroll_bar().max_value)


func _set_busy(busy: bool) -> void:
	_send_button.disabled = busy
	_input_field.editable = not busy
	_status_label.text = "Thinking..." if busy else ("MCP :% d" % _mcp_port if _mcp_port > 0 else "")


func _show_settings() -> void:
	_settings_panel.popup_centered()


func open_settings() -> void:
	_settings_panel.popup_centered()


func _on_settings_changed(settings: Dictionary) -> void:
	# Forward settings to MCP server
	if _mcp_port == 0:
		_discover_mcp()
	if _mcp_port == 0:
		_add_bubble(MessageBubble.Role.ERROR, "MCP server not running. Cannot save settings.")
		return

	# Handle API key save
	var api_key: String = settings.get("api_key", "")
	var payload := {}
	if api_key != "":
		payload["api_key"] = api_key
	var model: String = settings.get("model", "")
	if model != "":
		payload["model"] = model
	var max_tokens: int = settings.get("max_tokens", 0)
	if max_tokens > 0:
		payload["max_tokens"] = max_tokens
	payload["memory_enabled"] = settings.get("memory_enabled", true)

	# POST to MCP /settings
	var req := HTTPRequest.new()
	add_child(req)
	var url := "http://127.0.0.1:%d/settings" % _mcp_port
	var headers := PackedStringArray(["Content-Type: application/json"])
	req.request(url, headers, HTTPClient.METHOD_POST, JSON.stringify(payload))
	req.request_completed.connect(func(_r, _c, _h, _b): req.queue_free())

	_add_bubble(MessageBubble.Role.TOOL, "Settings sent to MCP server.")


func _clear_chat() -> void:
	for child in _message_container.get_children():
		child.queue_free()
	_session_id = str(randi())
	_add_bubble(MessageBubble.Role.ASSISTANT, "Chat cleared. How can I help?")


func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		if event.ctrl_pressed and event.keycode == KEY_ENTER:
			_on_send_pressed()
			get_viewport().set_input_as_handled()
