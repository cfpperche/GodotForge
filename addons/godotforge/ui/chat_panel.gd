@tool
extends VBoxContainer

const MessageBubble = preload("res://addons/godotforge/ui/message_bubble.gd")

var _claude_client: GodotForgeClaudeClient
var _tool_registry: GodotForgeToolRegistry

# UI elements
var _scroll_container: ScrollContainer
var _message_container: VBoxContainer
var _input_field: TextEdit
var _send_button: Button
var _status_label: Label
var _settings_panel: GodotForgeSettingsPanel


func set_tool_registry(registry: GodotForgeToolRegistry) -> void:
	_tool_registry = registry


func _ready() -> void:
	name = "GodotForge"
	_build_ui()
	_setup_client()
	if not _tool_registry:
		_setup_tools()


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

	# Separator
	add_child(HSeparator.new())

	# Scroll area with messages
	_scroll_container = ScrollContainer.new()
	_scroll_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll_container.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED

	_message_container = VBoxContainer.new()
	_message_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_message_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll_container.add_child(_message_container)
	add_child(_scroll_container)

	# Status label
	_status_label = Label.new()
	_status_label.text = ""
	_status_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	add_child(_status_label)

	# Input area
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

	# Settings panel (includes API key input)
	_settings_panel = GodotForgeSettingsPanel.new()
	_settings_panel.settings_changed.connect(_on_settings_changed)
	add_child(_settings_panel)

	# Welcome message
	_add_bubble(MessageBubble.Role.ASSISTANT, "Welcome to GodotForge! I can help you create scenes, add nodes, write scripts, and more — all without leaving Godot.\n\nGo to Settings to choose: API Key or Claude Code (Max/Pro plan).\nThen try: \"Create a CharacterBody2D scene for a player\"")


func _setup_client() -> void:
	_claude_client = GodotForgeClaudeClient.new()
	add_child(_claude_client)
	_claude_client.response_received.connect(_on_response_received)
	_claude_client.error_occurred.connect(_on_error)

	_claude_client.set_system_prompt(
		"You are GodotForge, an AI assistant embedded in the Godot 4.x editor. "
		+ "You help developers create games without leaving the editor. "
		+ "You have tools to create scenes, add nodes, set properties, and write GDScript. "
		+ "Use tools to take action — don't just describe what to do. "
		+ "Be concise. When the user asks you to create something, use the appropriate tools immediately. "
		+ "Always use GDScript (not C#). Always use Godot 4.x API."
	)

	# Update settings panel with CLI detection status
	if _settings_panel:
		_settings_panel.update_cli_status(_claude_client.has_claude_cli())

	# Apply saved auth mode
	var saved_mode: int = _settings_panel.get_auth_mode() if _settings_panel else 0
	if saved_mode == 1:
		_claude_client.set_auth_mode(GodotForgeClaudeClient.AuthMode.CLAUDE_CODE)


func _setup_tools() -> void:
	_tool_registry = GodotForgeToolRegistry.new()
	_tool_registry.setup()


func _on_send_pressed() -> void:
	var text := _input_field.text.strip_edges()
	if text == "":
		return

	_add_bubble(MessageBubble.Role.USER, text)
	_input_field.text = ""
	_set_busy(true)
	_claude_client.send_message(text)


func _on_response_received(content: Array) -> void:
	var has_tool_use := false

	for block in content:
		if block is Dictionary:
			match block.get("type", ""):
				"text":
					_add_bubble(MessageBubble.Role.ASSISTANT, block.get("text", ""))
				"tool_use":
					has_tool_use = true
					var tool_name: String = block.get("name", "")
					var tool_input: Dictionary = block.get("input", {})
					var tool_id: String = block.get("id", "")

					_add_bubble(MessageBubble.Role.TOOL, "Running: %s" % tool_name)

					# Execute tool
					var result := _tool_registry.execute(tool_name, tool_input)
					var result_text: String = result.get("result", "")
					var is_error: bool = result.get("is_error", false)

					if is_error:
						_add_bubble(MessageBubble.Role.ERROR, result_text)
					else:
						_add_bubble(MessageBubble.Role.TOOL, result_text)

					# Send result back to Claude
					_claude_client.get_conversation().add_tool_result(tool_id, result_text, is_error)

	if has_tool_use:
		# Continue the conversation so Claude can see tool results
		_claude_client.send_tool_results()
	else:
		_set_busy(false)


func _on_error(message: String) -> void:
	_add_bubble(MessageBubble.Role.ERROR, message)
	_set_busy(false)


func _add_bubble(role: MessageBubble.Role, text: String) -> void:
	var bubble := MessageBubble.new()
	bubble.setup(role, text)
	_message_container.add_child(bubble)

	# Auto-scroll to bottom
	await get_tree().process_frame
	_scroll_container.scroll_vertical = int(_scroll_container.get_v_scroll_bar().max_value)


func _set_busy(busy: bool) -> void:
	_send_button.disabled = busy
	_input_field.editable = not busy
	_status_label.text = "Thinking..." if busy else ""


func _clear_chat() -> void:
	for child in _message_container.get_children():
		child.queue_free()
	_claude_client.get_conversation().clear()
	_add_bubble(MessageBubble.Role.ASSISTANT, "Chat cleared. How can I help?")


func _show_settings() -> void:
	_settings_panel.popup_centered()


func _on_settings_changed(settings: Dictionary) -> void:
	# Handle API key save action
	if settings.get("action") == "save_api_key":
		var key: String = settings.get("api_key", "")
		if key != "":
			_claude_client.save_api_key(key)
			_add_bubble(MessageBubble.Role.TOOL, "API key saved.")
		return

	var auth_mode: int = settings.get("auth_mode", 0)
	if auth_mode == 0:
		_claude_client.set_auth_mode(GodotForgeClaudeClient.AuthMode.API_KEY)
	else:
		_claude_client.set_auth_mode(GodotForgeClaudeClient.AuthMode.CLAUDE_CODE)

	_claude_client.set_model(settings.get("model", ""))
	_claude_client.set_max_tokens(settings.get("max_tokens", 4096))

	var mode_name := "API Key" if auth_mode == 0 else "Claude Code (Max/Pro)"
	_add_bubble(MessageBubble.Role.TOOL, "Settings updated. Auth: %s" % mode_name)


func _input(event: InputEvent) -> void:
	# Ctrl+Enter to send
	if event is InputEventKey and event.pressed:
		if event.ctrl_pressed and event.keycode == KEY_ENTER:
			_on_send_pressed()
			get_viewport().set_input_as_handled()
