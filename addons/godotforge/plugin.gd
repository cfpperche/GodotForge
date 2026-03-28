@tool
extends EditorPlugin

const ChatPanel = preload("res://addons/godotforge/ui/chat_panel.gd")

var chat_panel_instance: Control
var chat_panel_button: Button
var http_server: GodotForgeHttpServer
var tool_registry: GodotForgeToolRegistry


func _enter_tree() -> void:
	# Setup tool registry
	tool_registry = GodotForgeToolRegistry.new()
	tool_registry.setup()

	# Start HTTP server for MCP bridge
	http_server = GodotForgeHttpServer.new()
	http_server.setup(tool_registry)
	add_child(http_server)
	http_server.start()

	# Setup chat panel
	chat_panel_instance = ChatPanel.new()
	chat_panel_instance.set_tool_registry(tool_registry)
	chat_panel_button = add_control_to_bottom_panel(chat_panel_instance, "GodotForge")

	# Connect UI actions from HTTP server to chat panel
	http_server.ui_action_requested.connect(_on_ui_action)

	print("[GodotForge] Plugin loaded (HTTP server on port %d)." % http_server.get_port())


func _on_ui_action(action: String) -> void:
	match action:
		"open_settings":
			# Make bottom panel visible first
			make_bottom_panel_item_visible(chat_panel_instance)
			chat_panel_instance.open_settings()
		"click_bottom_panel":
			make_bottom_panel_item_visible(chat_panel_instance)


func _exit_tree() -> void:
	if http_server:
		http_server.stop()
		http_server.queue_free()

	if chat_panel_instance:
		remove_control_from_bottom_panel(chat_panel_instance)
		chat_panel_instance.queue_free()

	print("[GodotForge] Plugin unloaded.")
