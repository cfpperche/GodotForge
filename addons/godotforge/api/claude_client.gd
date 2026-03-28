@tool
class_name GodotForgeClaudeClient
extends Node

signal response_received(content: Array)
signal error_occurred(message: String)

enum AuthMode { API_KEY, CLAUDE_CODE }

const API_URL := "https://api.anthropic.com/v1/messages"
const DEFAULT_MODEL := "claude-sonnet-4-20250514"
const DEFAULT_MAX_TOKENS := 4096
const API_VERSION := "2023-06-01"

var _http_request: HTTPRequest
var _api_key_manager: GodotForgeApiKeyManager
var _conversation: GodotForgeConversation
var _system_prompt: String = ""
var _is_busy: bool = false
var _model: String = DEFAULT_MODEL
var _max_tokens: int = DEFAULT_MAX_TOKENS
var _auth_mode: AuthMode = AuthMode.API_KEY
var _claude_cli_path: String = ""
var _cli_thread: Thread


func _ready() -> void:
	_http_request = HTTPRequest.new()
	_http_request.timeout = 120.0
	add_child(_http_request)
	_http_request.request_completed.connect(_on_request_completed)

	_api_key_manager = GodotForgeApiKeyManager.new()
	_conversation = GodotForgeConversation.new()
	_cli_thread = Thread.new()

	_detect_claude_cli()


func set_system_prompt(prompt: String) -> void:
	_system_prompt = prompt


func get_conversation() -> GodotForgeConversation:
	return _conversation


func is_busy() -> bool:
	return _is_busy


func set_auth_mode(mode: AuthMode) -> void:
	_auth_mode = mode


func get_auth_mode() -> AuthMode:
	return _auth_mode


func has_claude_cli() -> bool:
	return _claude_cli_path != ""


func send_message(user_message: String) -> void:
	if _is_busy:
		error_occurred.emit("Already processing a request.")
		return

	if _auth_mode == AuthMode.API_KEY:
		if not _api_key_manager.has_key():
			if not _api_key_manager.load_key():
				error_occurred.emit("No API key found. Set ANTHROPIC_API_KEY or configure in settings.")
				return

	if _auth_mode == AuthMode.CLAUDE_CODE:
		if _claude_cli_path == "":
			error_occurred.emit("Claude Code CLI not found. Install it with: npm install -g @anthropic-ai/claude-code")
			return

	_conversation.add_user_message(user_message)

	if _auth_mode == AuthMode.API_KEY:
		_send_api_request()
	else:
		_send_claude_cli_request()


func send_tool_results() -> void:
	if _auth_mode == AuthMode.API_KEY:
		_send_api_request()
	else:
		_send_claude_cli_request()


# ==================== API Key Mode ====================

func _send_api_request() -> void:
	_is_busy = true

	var body := {
		"model": _model,
		"max_tokens": _max_tokens,
		"messages": _conversation.get_messages_for_api(),
	}

	if _system_prompt != "":
		body["system"] = _build_enhanced_prompt()

	var tools := GodotForgeClaudeTools.get_tool_definitions()
	if tools.size() > 0:
		body["tools"] = tools

	var headers := PackedStringArray([
		"Content-Type: application/json",
		"x-api-key: " + _api_key_manager.get_key(),
		"anthropic-version: " + API_VERSION,
	])

	var json_body := JSON.stringify(body)
	var err := _http_request.request(API_URL, headers, HTTPClient.METHOD_POST, json_body)
	if err != OK:
		_is_busy = false
		error_occurred.emit("HTTP request failed: %s" % error_string(err))


func _on_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	_is_busy = false

	if result != HTTPRequest.RESULT_SUCCESS:
		error_occurred.emit("Request failed (result: %d)" % result)
		return

	var json := JSON.new()
	var parse_err := json.parse(body.get_string_from_utf8())
	if parse_err != OK:
		error_occurred.emit("Failed to parse response JSON.")
		return

	var data: Dictionary = json.data

	if response_code != 200:
		var err_msg: String = data.get("error", {}).get("message", "Unknown API error (HTTP %d)" % response_code)
		error_occurred.emit(err_msg)
		return

	var content: Array = data.get("content", [])
	_conversation.add_assistant_message(content)
	response_received.emit(content)


# ==================== Claude Code CLI Mode ====================

func _send_claude_cli_request() -> void:
	_is_busy = true

	if _cli_thread.is_started():
		_cli_thread.wait_to_finish()

	_cli_thread.start(_run_claude_cli)


func _run_claude_cli() -> void:
	# Build the prompt with conversation context
	var prompt := _build_cli_prompt()

	# Run claude --print with system prompt
	var args := PackedStringArray([
		"--print",
		"--output-format", "text",
		"--max-turns", "1",
	])

	if _system_prompt != "":
		args.append("--system-prompt")
		args.append(_build_enhanced_prompt())

	args.append(prompt)

	var output := []
	var exit_code := OS.execute(_claude_cli_path, args, output, true, false)

	# Process result on main thread
	call_deferred("_on_cli_completed", exit_code, output)


func _on_cli_completed(exit_code: int, output: Array) -> void:
	_is_busy = false

	if _cli_thread.is_started():
		_cli_thread.wait_to_finish()

	if exit_code != 0:
		var err_text := ""
		for line in output:
			err_text += str(line)
		error_occurred.emit("Claude Code error (exit %d): %s" % [exit_code, err_text.substr(0, 500)])
		return

	var response_text := ""
	for line in output:
		response_text += str(line)

	if response_text.strip_edges() == "":
		error_occurred.emit("Claude Code returned empty response.")
		return

	# Create a content array matching the API format
	var content: Array = [{"type": "text", "text": response_text.strip_edges()}]
	_conversation.add_assistant_message(content)
	response_received.emit(content)


func _build_cli_prompt() -> String:
	# Get the last user message as the prompt
	var messages := _conversation.get_messages_for_api()
	if messages.size() == 0:
		return ""

	# Build context from recent conversation
	var parts: PackedStringArray = []

	# Include recent conversation context (last few exchanges)
	var start_idx := maxi(0, messages.size() - 6)
	for i in range(start_idx, messages.size()):
		var msg: Dictionary = messages[i]
		var role: String = msg.get("role", "")
		var content = msg.get("content", "")
		if content is String:
			parts.append("%s: %s" % [role, content])
		elif content is Array:
			for block in content:
				if block is Dictionary and block.get("type") == "text":
					parts.append("%s: %s" % [role, block.get("text", "")])

	return "\n\n".join(parts)


func _detect_claude_cli() -> void:
	if OS.get_name() == "Windows":
		_detect_claude_cli_windows()
	else:
		_detect_claude_cli_unix()


func _detect_claude_cli_windows() -> void:
	# Try common Windows npm global paths
	var username := OS.get_environment("USERNAME")
	var candidates := [
		"C:/Users/%s/AppData/Roaming/npm/claude.cmd" % username,
		"C:/Users/%s/.local/bin/claude.cmd" % username,
	]
	for path in candidates:
		if FileAccess.file_exists(path):
			_claude_cli_path = path
			return

	# Try where.exe as fallback
	var output := []
	var err := OS.execute("where.exe", ["claude"], output, true, false)
	if err == 0 and output.size() > 0:
		var found := str(output[0]).strip_edges().split("\n")[0].strip_edges()
		if found != "":
			_claude_cli_path = found


func _detect_claude_cli_unix() -> void:
	# Try common Unix paths first (no subprocess needed)
	var home := OS.get_environment("HOME")
	var candidates := [
		"/usr/local/bin/claude",
		"/usr/bin/claude",
		home + "/.local/bin/claude",
		home + "/.npm-global/bin/claude",
	]
	for path in candidates:
		if FileAccess.file_exists(path):
			_claude_cli_path = path
			return


# ==================== Settings ====================

func set_model(model: String) -> void:
	if model != "":
		_model = model


func set_max_tokens(tokens: int) -> void:
	if tokens >= 1024 and tokens <= 8192:
		_max_tokens = tokens


func save_api_key(key: String) -> void:
	_api_key_manager.save_key(key)


func _build_enhanced_prompt() -> String:
	var prompt := _system_prompt
	var memory := _read_memory_file()
	if memory != "":
		prompt += "\n\n<project-memory>\n" + memory + "\n</project-memory>"
	return prompt


func _read_memory_file() -> String:
	var path := "res://.godotforge/memory.md"
	if not FileAccess.file_exists(path):
		return ""
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return ""
	var content := file.get_as_text()
	if content.length() > 32000:
		content = content.substr(0, 32000) + "\n[Memory truncated]"
	return content
