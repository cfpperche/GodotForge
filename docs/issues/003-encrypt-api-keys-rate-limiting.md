# Issue 003: Encrypt API Keys + Rate Limiting

**Priority:** High
**Effort:** Small (1-2 days)
**Category:** Security
**Pain Point:** No authentication, plaintext API keys (~440 LOC)

## Problem

API keys for 14 services are stored in plaintext JSON (`~/.godotforge/config.json`). The HTTP server has no rate limiting, permissive CORS, and zero request authentication. While localhost-only mitigates remote attacks, local malware or rogue browser tabs can exfiltrate keys or abuse the API.

### Current State

- `config.ts` (332 lines): Keys stored as `{"keys": {"anthropic": "sk-...", ...}}`
- **No encryption**: Anyone with filesystem access reads all keys
- **No rate limiting**: Unlimited requests to all endpoints
- **CORS `*`**: Any browser tab on localhost can call the API
- **No request auth**: Session IDs are self-assigned strings
- **No audit trail**: Config changes via `/config` POST not logged
- **No key rotation**: Keys never expire

### MCP Spec Context

MCP spec 2025-11-25 defines **OAuth 2.1** for remote MCP servers. However, GodotForge is **local-first** — full OAuth is overkill for now. The real risks are:

1. Plaintext keys on disk
2. Unrestricted API access from any local process
3. No abuse prevention

## Proposed Solution

### Phase 1: Key Encryption (Day 1)

1. **Encrypt keys at rest** using AES-256-GCM
   - Derive encryption key from machine-specific data (hostname + username + salt)
   - `config.json` stores `{"keys": {"anthropic": "enc:v1:base64..."}}`
   - Transparent: `getKey()` decrypts, `setKey()` encrypts
   - Migration: On first read, detect plaintext keys and auto-encrypt

2. **Never return key values via API**
   - `GET /keys` already returns only `{configured: true, source: "config"}` (verified)
   - Ensure no other endpoint leaks key values

### Phase 2: Rate Limiting (Day 1)

1. **Sliding window rate limiter** on HTTP server
   - Default: 100 requests/minute per endpoint category
   - Categories: chat (20/min), tools (100/min), files (200/min), config (10/min)
   - Return `429 Too Many Requests` with `Retry-After` header

2. **CORS restriction**
   - Change from `*` to explicit origins: `http://localhost:5173` (web copilot)
   - Allow configurable additional origins

### Phase 3: Request Authentication (Day 2)

1. **Bearer token for HTTP API**
   - Generate random token on first start, save to `.godotforge/http-token`
   - All HTTP requests require `Authorization: Bearer <token>`
   - Godot plugin reads token from file on MCP spawn
   - Web copilot reads token from `/health` endpoint (first-request bootstrap)

2. **Audit logging for config changes**
   - Log all `/config`, `/keys`, `/settings` mutations to event log
   - Include timestamp, endpoint, and change summary (not key values)

### Future: OAuth 2.1 (when remote deployment needed)

- Not needed for local-first use case
- Implement when/if GodotForge becomes a cloud service
- MCP spec provides full OAuth 2.1 with PKCE, Resource Indicators

## Files to Modify

| File | Change |
|------|--------|
| `mcp-server/src/config.ts` | AES encryption for key storage + auto-migration |
| `mcp-server/src/http.ts` | Rate limiter middleware + CORS restriction + Bearer auth |
| New: `mcp-server/src/http/rate-limiter.ts` | Sliding window rate limiter |
| New: `mcp-server/src/http/auth.ts` | Bearer token generation + validation |
| `mcp-server/src/events.ts` | Audit log for config mutations |
| `addons/godotforge/plugin.gd` | Read http-token on MCP spawn |
| `web-client/src/lib/api.ts` | Send Bearer token with requests |

## Verification

- [ ] Keys in config.json are encrypted (`enc:v1:...` format)
- [ ] Existing plaintext keys auto-migrated on first read
- [ ] `getKey()` returns decrypted value transparently
- [ ] Rate limiter returns 429 after threshold
- [ ] CORS blocks requests from non-whitelisted origins
- [ ] Bearer token required for all non-health endpoints
- [ ] Config changes logged to events.jsonl
- [ ] Godot plugin passes Bearer token to HTTP requests
- [ ] Web copilot obtains and uses Bearer token
