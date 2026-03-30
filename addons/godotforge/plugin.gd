@tool
extends EditorPlugin

const ChatPanel = preload("res://addons/godotforge/ui/chat_panel.gd")

var chat_panel_instance: Control
var chat_panel_button: Button
var http_server: GodotForgeHttpServer
var tool_registry: GodotForgeToolRegistry
var _debugger: GodotForgeDebugger
var _mcp_pid: int = -1


func _enter_tree() -> void:
	# Setup debugger plugin (editor↔game IPC for screenshots, input, state)
	_debugger = GodotForgeDebugger.new()
	add_debugger_plugin(_debugger)

	# Setup tool registry (editor tools only — local tools handled by MCP)
	tool_registry = GodotForgeToolRegistry.new()
	tool_registry.setup(_debugger)

	# Start HTTP server for MCP bridge (editor tool execution)
	http_server = GodotForgeHttpServer.new()
	http_server.setup(tool_registry)
	add_child(http_server)
	http_server.start()
	http_server.ui_action_requested.connect(_on_ui_action)

	# Auto-spawn MCP server if not already running
	_try_spawn_mcp_server()

	# Setup chat panel (thin HTTP client to MCP)
	chat_panel_instance = ChatPanel.new()
	chat_panel_instance.set_tool_registry(tool_registry)
	chat_panel_button = add_control_to_bottom_panel(chat_panel_instance, "GodotForge")

	push_warning("[GodotForge] Plugin loaded (editor bridge port %d)." % http_server.get_port())


func _exit_tree() -> void:
	if _debugger:
		remove_debugger_plugin(_debugger)

	if http_server:
		http_server.stop()
		http_server.queue_free()

	if chat_panel_instance:
		remove_control_from_bottom_panel(chat_panel_instance)
		chat_panel_instance.queue_free()

	_stop_mcp_server()
	push_warning("[GodotForge] Plugin unloaded.")


func _on_ui_action(action: String) -> void:
	match action:
		"open_settings":
			make_bottom_panel_item_visible(chat_panel_instance)
			chat_panel_instance.open_settings()
		"click_bottom_panel":
			make_bottom_panel_item_visible(chat_panel_instance)


func _try_spawn_mcp_server() -> void:
	# Check if MCP is already running
	var port_file := ProjectSettings.globalize_path("res://").path_join(".godotforge/mcp.port")
	if FileAccess.file_exists(port_file):
		var file := FileAccess.open(port_file, FileAccess.READ)
		if file:
			var port := file.get_as_text().strip_edges().to_int()
			if port > 0:
				push_warning("[GodotForge] MCP server already running on port %d." % port)
				return

	# Find the MCP server dist
	var project_path := ProjectSettings.globalize_path("res://")
	var mcp_index := project_path.path_join("mcp-server/dist/index.js")

	# Also check parent dir (for demo/ projects)
	if not FileAccess.file_exists(mcp_index):
		var parent := project_path.get_base_dir()
		mcp_index = parent.path_join("mcp-server/dist/index.js")

	if not FileAccess.file_exists(mcp_index):
		push_warning("[GodotForge] MCP server not found. Start manually: node mcp-server/dist/index.js --http-only")
		return

	# Spawn MCP server in http-only mode
	var args := PackedStringArray([
		mcp_index,
		"--http-only",
		"--project-root", project_path,
	])

	_mcp_pid = OS.create_process("node", args)
	if _mcp_pid > 0:
		push_warning("[GodotForge] Spawned MCP server (PID %d)." % _mcp_pid)
		# Wait a bit for it to start
		await get_tree().create_timer(2.0).timeout
	else:
		push_error("[GodotForge] Failed to spawn MCP server.")


func _stop_mcp_server() -> void:
	if _mcp_pid > 0:
		OS.kill(_mcp_pid)
		_mcp_pid = -1
		# Clean up port file
		var port_file := ProjectSettings.globalize_path("res://").path_join(".godotforge/mcp.port")
		if FileAccess.file_exists(port_file):
			DirAccess.remove_absolute(port_file)
		push_warning("[GodotForge] MCP server stopped.")
