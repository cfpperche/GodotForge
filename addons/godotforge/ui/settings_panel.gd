@tool
class_name GodotForgeSettingsPanel
extends AcceptDialog

signal settings_changed(settings: Dictionary)

const MODELS := ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-4-5-20251001"]
const MODEL_LABELS := ["Sonnet 4 (recommended)", "Opus 4", "Haiku 4.5 (fast)"]
const SETTINGS_PATH := "res://addons/godotforge/.settings"

var _model_dropdown: OptionButton
var _max_tokens_slider: HSlider
var _max_tokens_label: Label
var _memory_toggle: CheckButton
var _version_label: Label
var _usage_label: Label

var current_settings := {
	"model": MODELS[0],
	"max_tokens": 4096,
	"memory_enabled": true,
}


func _init() -> void:
	title = "GodotForge Settings"
	min_size = Vector2(420, 320)

	var vbox := VBoxContainer.new()
	vbox.custom_minimum_size = Vector2(400, 280)

	# Model selector
	var model_label := Label.new()
	model_label.text = "Model"
	vbox.add_child(model_label)

	_model_dropdown = OptionButton.new()
	for i in MODEL_LABELS.size():
		_model_dropdown.add_item(MODEL_LABELS[i], i)
	_model_dropdown.item_selected.connect(_on_model_selected)
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
	_max_tokens_slider.value_changed.connect(_on_tokens_changed)
	vbox.add_child(_max_tokens_slider)

	vbox.add_child(HSeparator.new())

	# Memory toggle
	_memory_toggle = CheckButton.new()
	_memory_toggle.text = "Inject project memory into system prompt"
	_memory_toggle.button_pressed = true
	vbox.add_child(_memory_toggle)

	vbox.add_child(HSeparator.new())

	# Usage display
	_usage_label = Label.new()
	_usage_label.text = "Last request: —"
	_usage_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	vbox.add_child(_usage_label)

	# Version
	_version_label = Label.new()
	_version_label.text = "GodotForge v0.1.0"
	_version_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.4))
	vbox.add_child(_version_label)

	add_child(vbox)

	confirmed.connect(_on_confirmed)
	_load_settings()


func _on_model_selected(index: int) -> void:
	current_settings["model"] = MODELS[index]


func _on_tokens_changed(value: float) -> void:
	current_settings["max_tokens"] = int(value)
	_max_tokens_label.text = str(int(value))


func _on_confirmed() -> void:
	current_settings["memory_enabled"] = _memory_toggle.button_pressed
	_save_settings()
	settings_changed.emit(current_settings)


func update_usage(input_tokens: int, output_tokens: int) -> void:
	_usage_label.text = "Last request: %d in / %d out tokens" % [input_tokens, output_tokens]


func get_model() -> String:
	return current_settings["model"]


func get_max_tokens() -> int:
	return current_settings["max_tokens"]


func is_memory_enabled() -> bool:
	return current_settings.get("memory_enabled", true)


func _save_settings() -> void:
	var file := FileAccess.open(SETTINGS_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(current_settings))


func _load_settings() -> void:
	if not FileAccess.file_exists(SETTINGS_PATH):
		return
	var file := FileAccess.open(SETTINGS_PATH, FileAccess.READ)
	if not file:
		return
	var json := JSON.new()
	if json.parse(file.get_as_text()) == OK and json.data is Dictionary:
		current_settings.merge(json.data, true)

	# Apply loaded settings to UI
	var model_idx := MODELS.find(current_settings["model"])
	if model_idx >= 0:
		_model_dropdown.select(model_idx)
	_max_tokens_slider.value = current_settings["max_tokens"]
	_max_tokens_label.text = str(current_settings["max_tokens"])
	_memory_toggle.button_pressed = current_settings.get("memory_enabled", true)
