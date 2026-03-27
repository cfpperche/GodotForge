@tool
class_name GodotForgeApiKeyManager
extends RefCounted

const KEY_FILE_PATH := "res://addons/godotforge/.api_key"
const ENV_VAR_NAME := "ANTHROPIC_API_KEY"

var _api_key: String = ""


func load_key() -> bool:
	# Try environment variable first
	var env_key := OS.get_environment(ENV_VAR_NAME)
	if env_key != "":
		_api_key = env_key
		return true

	# Try file
	if FileAccess.file_exists(KEY_FILE_PATH):
		var file := FileAccess.open(KEY_FILE_PATH, FileAccess.READ)
		if file:
			_api_key = file.get_as_text().strip_edges()
			return _api_key != ""

	return false


func save_key(key: String) -> void:
	_api_key = key
	var file := FileAccess.open(KEY_FILE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(key)


func get_key() -> String:
	return _api_key


func has_key() -> bool:
	return _api_key != ""
