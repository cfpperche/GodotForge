@tool
class_name GodotForgeClaudeClient
extends Node

signal response_received(content: Array)
signal error_occurred(message: String)

const API_URL := "https://api.anthropic.com/v1/messages"
const MODEL := "claude-sonnet-4-20250514"
const MAX_TOKENS := 4096
const API_VERSION := "2023-06-01"

var _http_request: HTTPRequest
var _api_key_manager: GodotForgeApiKeyManager
var _conversation: GodotForgeConversation
var _system_prompt: String = ""
var _is_busy: bool = false


func _ready() -> void:
	_http_request = HTTPRequest.new()
	_http_request.timeout = 60.0
	add_child(_http_request)
	_http_request.request_completed.connect(_on_request_completed)

	_api_key_manager = GodotForgeApiKeyManager.new()
	_conversation = GodotForgeConversation.new()


func set_system_prompt(prompt: String) -> void:
	_system_prompt = prompt


func get_conversation() -> GodotForgeConversation:
	return _conversation


func is_busy() -> bool:
	return _is_busy


func send_message(user_message: String) -> void:
	if _is_busy:
		error_occurred.emit("Already processing a request.")
		return

	if not _api_key_manager.has_key():
		if not _api_key_manager.load_key():
			error_occurred.emit("No API key found. Set ANTHROPIC_API_KEY or save key via settings.")
			return

	_conversation.add_user_message(user_message)
	_send_request()


func send_tool_results() -> void:
	_send_request()


func _send_request() -> void:
	_is_busy = true

	var body := {
		"model": MODEL,
		"max_tokens": MAX_TOKENS,
		"messages": _conversation.get_messages_for_api(),
	}

	if _system_prompt != "":
		body["system"] = _system_prompt

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
		error_occurred.emit("HTTP request failed with error: %s" % error_string(err))


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
	var stop_reason: String = data.get("stop_reason", "")

	# Store assistant response in conversation
	_conversation.add_assistant_message(content)

	response_received.emit(content)


func save_api_key(key: String) -> void:
	_api_key_manager.save_key(key)
