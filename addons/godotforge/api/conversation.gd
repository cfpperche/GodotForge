@tool
class_name GodotForgeConversation
extends RefCounted

var messages: Array[Dictionary] = []
var _max_messages: int = 100


func add_user_message(content: String) -> void:
	messages.append({"role": "user", "content": content})
	_trim()


func add_assistant_message(content) -> void:
	# content can be String or Array (with text + tool_use blocks)
	messages.append({"role": "assistant", "content": content})
	_trim()


func add_tool_result(tool_use_id: String, result: String, is_error: bool = false) -> void:
	var block := {
		"type": "tool_result",
		"tool_use_id": tool_use_id,
		"content": result,
	}
	if is_error:
		block["is_error"] = true

	# Tool results go in a user message
	# Check if last message is already a user message with tool results
	if messages.size() > 0 and messages[-1]["role"] == "user":
		var last_content = messages[-1]["content"]
		if last_content is Array:
			last_content.append(block)
			return

	messages.append({"role": "user", "content": [block]})


func get_messages_for_api() -> Array[Dictionary]:
	return messages.duplicate(true)


func clear() -> void:
	messages.clear()


func _trim() -> void:
	while messages.size() > _max_messages:
		messages.pop_front()
