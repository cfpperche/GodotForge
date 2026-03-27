---
description: Consistent error handling patterns across plugin and MCP
paths: ["addons/godotforge/**", "mcp-server/src/**"]
---

# Error Handling

## Plugin (GDScript)
- Tools always return `{"result": "message", "is_error": true}` on failure. Never return null or throw.
- Validate inputs at the top of every tool function. Return early with a clear error message.
- HTTP server returns proper status codes: 400 (bad input), 404 (not found), 422 (tool error), 500 (internal).
- Never silently swallow errors. If something fails, the user must know why.

## MCP Server (TypeScript)
- Bridge errors (Godot not running) return `isError: true` with actionable message: "Please open Godot and enable the plugin."
- Use try/catch at tool boundaries only. Don't catch inside business logic.
- Never expose stack traces to the user. Log them to stderr, return a human-readable message.
- Graceful degradation: local tools work without Godot, editor tools fail with clear guidance.

## Messages
- Error messages must be actionable: say what went wrong AND what to do about it.
- Bad: `"Error"`. Good: `"Node not found: Player/Sprite2D. Make sure the scene is open in the editor."`
- Include the input that caused the error when it helps debugging.
