@tool
class_name GodotForgeSettingsPanel
extends AcceptDialog

signal settings_changed(settings: Dictionary)

const MODELS := ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-4-5-20251001"]
const MODEL_LABELS := ["Sonnet 4 (recommended)", "Opus 4", "Haiku 4.5 (fast)"]
const AUTH_MODES := ["API Key", "Claude Code (Max/Pro plan)"]
const SETTINGS_PATH := "res://addons/godotforge/.settings"

var _auth_dropdown: OptionButton
var _api_key_input: LineEdit
var _api_key_container: HBoxContainer
var _model_dropdown: OptionButton
var _max_tokens_slider: HSlider
var _max_tokens_label: Label
var _memory_toggle: CheckButton
var _version_label: Label
var _usage_label: Label
var _cli_status_label: Label

var current_settings := {
	"auth_mode": 0,  # 0 = API Key, 1 = Claude Code
	"model": MODELS[0],
	"max_tokens": 4096,
	"memory_enabled": true,
}


func _init() -> void:
	title = "GodotForge Settings"
	min_size = Vector2(420, 380)

	var vbox := VBoxContainer.new()
	vbox.custom_minimum_size = Vector2(400, 340)

	# Auth mode selector
	var auth_label := Label.new()
	auth_label.text = "Authentication"
	vbox.add_child(auth_label)

	_auth_dropdown = OptionButton.new()
	for label in AUTH_MODES:
		_auth_dropdown.add_item(label)
	_auth_dropdown.item_selected.connect(_on_auth_selected)
	vbox.add_child(_auth_dropdown)

	# API key input (shown when API Key mode selected)
	_api_key_container = HBoxContainer.new()
	_api_key_input = LineEdit.new()
	_api_key_input.placeholder_text = "sk-ant-..."
	_api_key_input.secret = true
	_api_key_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_api_key_container.add_child(_api_key_input)
	var save_key_btn := Button.new()
	save_key_btn.text = "Save"
	save_key_btn.pressed.connect(_on_save_api_key)
	_api_key_container.add_child(save_key_btn)
	vbox.add_child(_api_key_container)

	# CLI status (shown when Claude Code mode selected)
	_cli_status_label = Label.new()
	_cli_status_label.text = ""
	_cli_status_label.add_theme_font_size_override("font_size", 12)
	_cli_status_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
	vbox.add_child(_cli_status_label)

	vbox.add_child(HSeparator.new())

	# Model selector
	var model_label := Label.new()
	model_label.text = "Model (API Key mode only)"
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


func _on_auth_selected(index: int) -> void:
	current_settings["auth_mode"] = index
	_model_dropdown.disabled = (index == 1)
	_api_key_container.visible = (index == 0)
	_cli_status_label.visible = (index == 1)


func _on_save_api_key() -> void:
	var key := _api_key_input.text.strip_edges()
	if key != "":
		current_settings["api_key_saved"] = true
		settings_changed.emit({"action": "save_api_key", "api_key": key})


func _on_model_selected(index: int) -> void:
	current_settings["model"] = MODELS[index]


func _on_tokens_changed(value: float) -> void:
	current_settings["max_tokens"] = int(value)
	_max_tokens_label.text = str(int(value))


func _on_confirmed() -> void:
	current_settings["memory_enabled"] = _memory_toggle.button_pressed
	_save_settings()
	settings_changed.emit(current_settings)


func update_cli_status(found: bool) -> void:
	if found:
		_cli_status_label.text = "Claude Code CLI detected"
		_cli_status_label.add_theme_color_override("font_color", Color(0.4, 0.8, 0.4))
	else:
		_cli_status_label.text = "Claude Code CLI not found — install with: npm i -g @anthropic-ai/claude-code"
		_cli_status_label.add_theme_color_override("font_color", Color(0.8, 0.5, 0.3))


func update_usage(input_tokens: int, output_tokens: int) -> void:
	_usage_label.text = "Last request: %d in / %d out tokens" % [input_tokens, output_tokens]


func get_auth_mode() -> int:
	return current_settings.get("auth_mode", 0)


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
	_auth_dropdown.select(current_settings.get("auth_mode", 0))
	var model_idx := MODELS.find(current_settings["model"])
	if model_idx >= 0:
		_model_dropdown.select(model_idx)
	_max_tokens_slider.value = current_settings["max_tokens"]
	_max_tokens_label.text = str(current_settings["max_tokens"])
	_memory_toggle.button_pressed = current_settings.get("memory_enabled", true)
	var auth_mode: int = current_settings.get("auth_mode", 0)
	_model_dropdown.disabled = (auth_mode == 1)
	_api_key_container.visible = (auth_mode == 0)
	_cli_status_label.visible = (auth_mode == 1)
