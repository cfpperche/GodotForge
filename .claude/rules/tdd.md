---
description: Test-Driven Development rules for all code changes
paths: ["addons/godotforge/**", "mcp-server/src/**"]
audience: internal
---

# TDD (Test-Driven Development)

- Write tests BEFORE implementation. Red → Green → Refactor.
- Every new tool, feature, or bugfix must have a corresponding test.
- MCP server: use Vitest. Plugin: use GUT (Godot Unit Testing) or curl-based integration tests in `tests/`.
- Never merge code without passing tests.
- Tests must be fast, isolated, and deterministic.
