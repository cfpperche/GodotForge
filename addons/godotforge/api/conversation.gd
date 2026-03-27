@tool
class_name GodotForgeConversation
extends RefCounted

signal compaction_needed(old_messages: Array[Dictionary])

var messages: Array[Dictionary] = []
var _max_messages: int = 100
var _compact_threshold: int = 20
var _keep_recent: int = 6


func add_user_message(content: String) -> void:
	messages.append({"role": "user", "content": content})
	_check_compaction()
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


func compact_with_summary(summary: String) -> void:
	## Replace old messages with a summary, keeping recent messages intact.
	if messages.size() <= _keep_recent:
		return

	var recent := messages.slice(-_keep_recent)
	messages.clear()

	# Add summary as first message
	messages.append({"role": "user", "content": "[Previous conversation summary]: " + summary})
	messages.append({"role": "assistant", "content": "Understood. I have the context from our previous conversation."})

	# Re-add recent messages
	for msg in recent:
		messages.append(msg)


func get_old_messages_text() -> String:
	## Extract text from old messages (everything except the most recent ones).
	if messages.size() <= _keep_recent:
		return ""

	var old_msgs := messages.slice(0, -_keep_recent)
	var texts: PackedStringArray = []

	for msg in old_msgs:
		var role: String = msg.get("role", "")
		var content = msg.get("content", "")
		if content is String:
			texts.append("%s: %s" % [role, content])
		elif content is Array:
			for block in content:
				if block is Dictionary and block.get("type") == "text":
					texts.append("%s: %s" % [role, block.get("text", "")])

	return "\n".join(texts)


func _check_compaction() -> void:
	if messages.size() >= _compact_threshold:
		var old_messages := messages.slice(0, -_keep_recent)
		compaction_needed.emit(old_messages)


func _trim() -> void:
	while messages.size() > _max_messages:
		messages.pop_front()
