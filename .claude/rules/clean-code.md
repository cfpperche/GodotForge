---
description: Clean Code standards for readability and maintainability
paths: ["addons/godotforge/**", "mcp-server/src/**"]
---

# Clean Code

- Methods < 20 lines. If longer, extract.
- Names reveal intent: `_create_scene()` not `_cs()`, `get_project_context` not `get_ctx`.
- No magic numbers — use constants (`const DEFAULT_PORT := 6970`).
- No commented-out code. Delete it; git remembers.
- No `print()` in production paths — use structured logging or signals.
- One level of abstraction per function.
- Fail fast, fail loud. Return `{"is_error": true}` with a clear message, never swallow errors silently.
