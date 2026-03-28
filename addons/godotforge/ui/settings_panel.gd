@tool
class_name GodotForgeSettingsPanel
extends AcceptDialog

signal settings_changed(settings: Dictionary)

const MODELS := ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-4-5-20251001"]
const MODEL_LABELS := ["Sonnet 4 (recommended)", "Opus 4", "Haiku 4.5 (fast)"]

var _api_key_input: LineEdit
var _model_dropdown: OptionButton
var _max_tokens_slider: HSlider
var _max_tokens_label: Label
var _memory_toggle: CheckButton
var _version_label: Label


func _init() -> void:
	title = "GodotForge Settings"
	min_size = Vector2(420, 320)

	var vbox := VBoxContainer.new()
	vbox.custom_minimum_size = Vector2(400, 280)

	# API Key
	var key_label := Label.new()
	key_label.text = "Anthropic API Key"
	vbox.add_child(key_label)

	var key_row := HBoxContainer.new()
	_api_key_input = LineEdit.new()
	_api_key_input.placeholder_text = "sk-ant-... (or set ANTHROPIC_API_KEY env var)"
	_api_key_input.secret = true
	_api_key_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	key_row.add_child(_api_key_input)
	vbox.add_child(key_row)

	vbox.add_child(HSeparator.new())

	# Model
	var model_label := Label.new()
	model_label.text = "Model"
	vbox.add_child(model_label)

	_model_dropdown = OptionButton.new()
	for i in MODEL_LABELS.size():
		_model_dropdown.add_item(MODEL_LABELS[i], i)
	vbox.add_child(_model_dropdown)

	vbox.add_child(HSeparator.new())

	# Max tokens
	var tokens_header := HBoxContainer.new()
	var tokens_label := Label.new()
	tokens_label.text = "Max Tokens"
	tokens_header.add_child(tokens_label)
	tokens_header.add_spacer(false)
	_max_tokens_label = Label.new()
	_max_tokens_label.text = "4096"
	tokens_header.add_child(_max_tokens_label)
	vbox.add_child(tokens_header)

	_max_tokens_slider = HSlider.new()
	_max_tokens_slider.min_value = 1024
	_max_tokens_slider.max_value = 8192
	_max_tokens_slider.step = 512
	_max_tokens_slider.value = 4096
	_max_tokens_slider.value_changed.connect(func(v): _max_tokens_label.text = str(int(v)))
	vbox.add_child(_max_tokens_slider)

	vbox.add_child(HSeparator.new())

	# Memory
	_memory_toggle = CheckButton.new()
	_memory_toggle.text = "Inject project memory into context"
	_memory_toggle.button_pressed = true
	vbox.add_child(_memory_toggle)

	vbox.add_child(HSeparator.new())

	# Version
	_version_label = Label.new()
	_version_label.text = "GodotForge v0.1.0 — MCP Backend"
	_version_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.4))
	vbox.add_child(_version_label)

	add_child(vbox)
	confirmed.connect(_on_confirmed)


func _on_confirmed() -> void:
	var settings := {}
	var key := _api_key_input.text.strip_edges()
	if key != "":
		settings["api_key"] = key
	settings["model"] = MODELS[_model_dropdown.selected]
	settings["max_tokens"] = int(_max_tokens_slider.value)
	settings["memory_enabled"] = _memory_toggle.button_pressed
	settings_changed.emit(settings)
