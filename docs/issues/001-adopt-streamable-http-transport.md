# Issue 001: Adopt MCP Streamable HTTP Transport

**Priority:** High
**Effort:** Medium (3-5 days)
**Category:** Infrastructure
**Pain Point:** HTTP transport is 100% custom (~1,200 LOC)

## Problem

The MCP server uses a hand-built HTTP server (`http.createServer()`) with 40+ manually routed endpoints, custom SSE, manual CORS, and no middleware chain. This was necessary when MCP only supported stdio — but the **MCP spec 2025-03-26** introduced **Streamable HTTP** as an official transport.

### Current State

- `http.ts` (456 lines): Manual route switch, request parsing, response serialization
- `http/handlers.ts` (298 lines): Route handler implementations
- `http/files.ts` (148 lines): File serving + WebSocket
- `http/utils.ts` (28 lines): JSON helpers + port file I/O
- **Total: ~1,200 lines** of custom HTTP infrastructure
- No API versioning, no middleware chain, no OpenAPI spec
- Manual CORS (`Access-Control-Allow-Origin: *`)

### MCP Spec Solution

Streamable HTTP (spec 2025-03-26):
- Single HTTP endpoint: POST (client→server) + GET (server→client SSE)
- Session management via `Mcp-Session-Id` header
- Works with load balancers, proxies, serverless
- `@modelcontextprotocol/sdk` has `StreamableHTTPServerTransport`

## Proposed Solution

**Two-layer architecture:**

1. **MCP Transport Layer** — Adopt `StreamableHTTPServerTransport` for tool calls
   - Replace stdio-only MCP transport with Streamable HTTP
   - Session IDs managed by SDK
   - Tool execution via standard MCP protocol

2. **Application API Layer** — Keep custom HTTP for dashboard endpoints
   - `/files/*`, `/keys`, `/settings`, `/config`, `/webhooks`, `/events`
   - These are NOT MCP protocol — they're GodotForge dashboard API
   - Consider migrating to a lightweight framework (Hono, Fastify) for middleware support

### Expected Reduction

- ~300-400 lines removed (MCP transport routing moved to SDK)
- Remaining ~800 lines are application API (stays custom but can be cleaner)

## Files to Modify

| File | Change |
|------|--------|
| `mcp-server/src/index.ts` | Replace stdio/custom HTTP with StreamableHTTPServerTransport |
| `mcp-server/src/http.ts` | Remove MCP tool routing, keep dashboard API |
| `mcp-server/src/server.ts` | Wire to new transport |
| `mcp-server/package.json` | Update `@modelcontextprotocol/sdk` to latest |

## Verification

- [ ] MCP tools work via Streamable HTTP (Claude Code, Cursor)
- [ ] stdio transport still works as fallback
- [ ] Dashboard API endpoints unchanged (/files, /keys, /settings)
- [ ] SSE streaming for chat still works
- [ ] WebSocket file watcher still works
- [ ] Godot plugin auto-spawn still works
