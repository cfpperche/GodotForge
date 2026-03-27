---
description: Clean Architecture layer boundaries and dependency rules
paths: ["addons/godotforge/**", "mcp-server/src/**"]
---

# Clean Architecture

- **Layers don't skip**: UI → API → Tools → EditorInterface. The chat panel never calls EditorInterface directly.
- **Dependencies point inward**: tools don't know about HTTP server or MCP. They receive input, return output.
- **Boundary objects**: tool input is always `Dictionary`, output is always `{"result": String, "is_error"?: bool}`.
- **No framework leakage**: MCP SDK types stay in `server.ts`. Godot types stay in `tools/`. The bridge is the translation layer.
- Prefer composition over inheritance. Tools are registered, not subclassed into a hierarchy.
- Security at boundaries: validate all paths against project root, bind only to localhost, never log API keys.
