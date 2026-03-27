---
description: Security by default — protect API keys, enforce boundaries
paths: ["addons/godotforge/**", "mcp-server/src/**"]
---

# Security by Default

- **API keys**: never log, never commit, never send over unencrypted channels. `.api_key` is in `.gitignore`.
- **Localhost only**: HTTP server binds to `127.0.0.1`, never `0.0.0.0`. No exceptions.
- **Path traversal**: all file operations must validate paths are within project root. Use `resolve()` + `startsWith()` in TypeScript, check `res://` prefix in GDScript.
- **No auth tokens**: GodotForge never reads, stores, or proxies OAuth tokens or subscription credentials. MCP clients handle their own auth.
- **Input validation**: never trust tool input. Validate types, check for empty strings, reject unknown node types before calling EditorInterface.
- **No eval/exec**: never execute arbitrary code from user input or API responses.
- **Minimal permissions**: the plugin only accesses `res://` project files. Never touch OS-level paths outside the project.
