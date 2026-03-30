---
description: Conventional Commits standard for git history
paths: ["**"]
audience: internal
---

# Conventional Commits

Format: `type(scope): description`

## Types
- `feat` — new feature or tool
- `fix` — bug fix
- `docs` — documentation only
- `refactor` — code change that neither fixes nor adds
- `test` — adding or updating tests
- `chore` — build, deps, config, CI

## Scopes
- `plugin` — GDScript plugin code
- `mcp` — MCP server TypeScript code
- `tools` — tool handlers (scene, node, script)
- `ui` — chat panel, message bubble
- `api` — claude_client, http_server, bridge
- `docs` — documentation files

## Rules
- Subject line < 72 characters, imperative mood ("add", not "added").
- Body explains WHY, not WHAT (the diff shows what).
- One logical change per commit. Don't mix feat + refactor.
- Breaking changes: add `!` after type — `feat(api)!: change tool result format`.
