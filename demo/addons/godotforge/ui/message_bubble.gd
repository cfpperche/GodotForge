@tool
class_name GodotForgeMessageBubble
extends MarginContainer

enum Role { USER, ASSISTANT, TOOL, ERROR }

var _role: Role = Role.USER
var _label: RichTextLabel


func _init() -> void:
	_label = RichTextLabel.new()
	_label.bbcode_enabled = true
	_label.fit_content = true
	_label.scroll_active = false
	_label.selection_enabled = true
	_label.custom_minimum_size = Vector2(0, 30)
	add_child(_label)


func setup(role: Role, text: String) -> void:
	_role = role
	add_theme_constant_override("margin_left", 8)
	add_theme_constant_override("margin_right", 8)
	add_theme_constant_override("margin_top", 4)
	add_theme_constant_override("margin_bottom", 4)

	match role:
		Role.USER:
			_label.text = "[b]You:[/b] %s" % _escape(text)
		Role.ASSISTANT:
			_label.text = _format_assistant_text(text)
		Role.TOOL:
			_label.text = "[color=#8888ff]⚙ %s[/color]" % _escape(text)
		Role.ERROR:
			_label.text = "[color=#ff6666]✗ %s[/color]" % _escape(text)


func _format_assistant_text(text: String) -> String:
	# Simple markdown-like formatting for code blocks
	var result := "[b]Claude:[/b] "
	var in_code_block := false
	var lines := text.split("\n")

	for line in lines:
		if line.begins_with("```"):
			in_code_block = not in_code_block
			if in_code_block:
				result += "\n[code]"
			else:
				result += "[/code]\n"
			continue

		if in_code_block:
			result += _escape(line) + "\n"
		else:
			result += _escape(line) + "\n"

	if in_code_block:
		result += "[/code]"

	return result.strip_edges()


func _escape(text: String) -> String:
	return text.replace("[", "[lb]")
