---
description: TypeScript-specific coding standards for the MCP server
paths: ["mcp-server/src/**"]
---

# TypeScript MCP Server Rules

- ESM modules only (`import`, not `require`).
- Use `zod` for all tool input validation.
- Use native `fetch` (Node 22+) — no axios or node-fetch.
- All file paths must be resolved and validated against project root before access.
- MCP SDK types stay in `server.ts` — the bridge only deals with plain objects.
- Log to stderr (`console.error`), never stdout (stdout is the MCP transport).
- Handle bridge errors (Godot not running) gracefully — return actionable error messages.
- No `any` type — use `unknown` and narrow.
- Keep tool handlers thin — delegate to bridge, don't add business logic in server.ts.
