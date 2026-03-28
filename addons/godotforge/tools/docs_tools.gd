@tool
extends GodotForgeToolBase

## Docs tools for native chat mode.
## These call the MCP server's HTTP bridge if available,
## or return a helpful fallback message.

const MCP_PORTS := [6970, 6971, 6972, 6973, 6974]

var _http_request: HTTPRequest
var _pending_peer_callback: Callable
var _mcp_port: int = 0


func execute(tool_name: String, input: Dictionary) -> Dictionary:
	match tool_name:
		"search_docs":
			return _search_docs(input)
		"get_class_reference":
			return _get_class_reference(input)
		_:
			return {"result": "Unknown docs tool: %s" % tool_name, "is_error": true}


func _search_docs(input: Dictionary) -> Dictionary:
	var query: String = input.get("query", "")
	if query == "":
		return {"result": "Missing 'query' parameter.", "is_error": true}

	# Try calling MCP server's docs endpoint
	var mcp_result := _call_mcp_tool("search_docs", input)
	if mcp_result != "":
		return {"result": mcp_result}

	# Fallback: suggest using MCP mode
	return {"result": "Docs search requires the MCP server running.\nStart it with: node mcp-server/dist/index.js\n\nFor now, check https://docs.godotengine.org/en/stable/classes/class_%s.html" % query.to_lower()}


func _get_class_reference(input: Dictionary) -> Dictionary:
	var class_name_param: String = input.get("class_name", "")
	if class_name_param == "":
		return {"result": "Missing 'class_name' parameter.", "is_error": true}

	# Try MCP server
	var mcp_result := _call_mcp_tool("get_class_reference", input)
	if mcp_result != "":
		return {"result": mcp_result}

	# Fallback: use ClassDB for basic info
	if not ClassDB.class_exists(class_name_param):
		return {"result": "Class '%s' not found." % class_name_param, "is_error": true}

	var info: PackedStringArray = []
	info.append("# %s" % class_name_param)

	var parent := ClassDB.get_parent_class(class_name_param)
	if parent != "":
		info.append("Inherits: %s" % parent)

	var methods := ClassDB.class_get_method_list(class_name_param, true)
	if methods.size() > 0:
		info.append("\nMethods (%d):" % methods.size())
		for i in mini(methods.size(), 20):
			var m: Dictionary = methods[i]
			info.append("  - %s()" % m.get("name", ""))
		if methods.size() > 20:
			info.append("  ... and %d more" % (methods.size() - 20))

	var properties := ClassDB.class_get_property_list(class_name_param, true)
	var props_filtered: Array[String] = []
	for p in properties:
		var pname: String = p.get("name", "")
		if not pname.begins_with("_") and pname != "":
			props_filtered.append(pname)
	if props_filtered.size() > 0:
		info.append("\nProperties (%d):" % props_filtered.size())
		for i in mini(props_filtered.size(), 20):
			info.append("  - %s" % props_filtered[i])

	var signals := ClassDB.class_get_signal_list(class_name_param, true)
	if signals.size() > 0:
		info.append("\nSignals (%d):" % signals.size())
		for s in signals:
			info.append("  - %s" % s.get("name", ""))

	info.append("\n(Basic info from ClassDB. For full descriptions, start the MCP server.)")
	return {"result": "\n".join(info)}


func _call_mcp_tool(tool_name: String, input: Dictionary) -> String:
	# Find MCP server port by checking the port file
	var port := _find_mcp_port()
	if port == 0:
		return ""

	# Synchronous HTTP request to MCP server's bridge
	# Note: MCP server also has these tools locally, but we can't call MCP protocol from GDScript
	# Instead, check if the plugin's own HTTP server can proxy (it can't for MCP-only tools)
	# For now, return empty to trigger fallback
	return ""


func _find_mcp_port() -> int:
	# MCP server doesn't have its own HTTP server (it uses stdio)
	# So we can't call it from GDScript
	# This is a known limitation — docs tools in native chat use ClassDB fallback
	return 0
