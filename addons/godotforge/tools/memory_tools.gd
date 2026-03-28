@tool
extends GodotForgeToolBase

const MEMORY_DIR := "res://.godotforge"
const MEMORY_FILE := "res://.godotforge/memory.md"
const MEMORY_TEMPLATE := """# GodotForge Project Memory

## Conventions

## Patterns

## Decisions

## Architecture
"""


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"save_memory":
			return _save_memory(input)
		"search_memory":
			return _search_memory(input)
		"get_project_memory":
			return _get_project_memory()
		_:
			return {"result": "Unknown memory tool: %s" % tool_name, "is_error": true}


func _save_memory(input: Dictionary) -> Dictionary:
	var category: String = input.get("category", "")
	var content: String = input.get("content", "")

	if category == "":
		return {"result": "Missing 'category' parameter.", "is_error": true}
	if content == "":
		return {"result": "Missing 'content' parameter.", "is_error": true}

	_ensure_memory_dir()

	var timestamp := Time.get_datetime_string_from_system(true)
	var entry := "- [%s] %s" % [timestamp, content]

	var existing := _read_memory()
	if existing == "":
		existing = MEMORY_TEMPLATE

	var section_header := "## %s" % category
	var section_idx := existing.find(section_header)

	if section_idx == -1:
		existing += "\n%s\n\n%s\n" % [section_header, entry]
	else:
		var after_header := section_idx + section_header.length()
		var next_section := existing.find("\n## ", after_header)
		var insert_at := next_section if next_section != -1 else existing.length()
		var before := existing.substr(0, insert_at).strip_edges()
		var after := existing.substr(insert_at)
		existing = "%s\n%s\n%s" % [before, entry, after]

	var file := FileAccess.open(MEMORY_FILE, FileAccess.WRITE)
	if not file:
		return {"result": "Failed to write memory file.", "is_error": true}
	file.store_string(existing)

	return {"result": "Saved to %s: %s" % [category, content]}


func _search_memory(input: Dictionary) -> Dictionary:
	var query: String = input.get("query", "")
	if query == "":
		return {"result": "Missing 'query' parameter.", "is_error": true}

	var memory := _read_memory()
	if memory == "":
		return {"result": "No memory entries found."}

	# Simple text search (GDScript doesn't have FTS5)
	var query_lower := query.to_lower()
	var lines := memory.split("\n")
	var results: PackedStringArray = []

	for line in lines:
		if line.begins_with("- [") and query_lower in line.to_lower():
			results.append(line)

	if results.size() == 0:
		return {"result": "No memory entries matching '%s'." % query}

	return {"result": "%d entries found:\n\n%s" % [results.size(), "\n".join(results)]}


func _get_project_memory() -> Dictionary:
	var memory := _read_memory()
	if memory == "":
		return {"result": "No project memory yet. Use save_memory to start."}

	var line_count := memory.split("\n").size()
	var entry_count := memory.count("- [")
	var size_kb := "%.1f" % (memory.length() / 1024.0)

	var header := "Memory: %d entries, %sKB" % [entry_count, size_kb]
	return {"result": "%s\n\n%s" % [header, memory]}


func _read_memory() -> String:
	if not FileAccess.file_exists(MEMORY_FILE):
		return ""
	var file := FileAccess.open(MEMORY_FILE, FileAccess.READ)
	if not file:
		return ""
	return file.get_as_text()


func _ensure_memory_dir() -> void:
	if not DirAccess.dir_exists_absolute(MEMORY_DIR):
		DirAccess.make_dir_recursive_absolute(MEMORY_DIR)
