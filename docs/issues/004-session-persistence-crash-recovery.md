# Issue 004: Session Persistence + Crash Recovery

**Priority:** Medium
**Effort:** Medium (2-3 days)
**Category:** Reliability
**Pain Point:** Stateless by design — sessions lost on server restart (~955 LOC custom state)

## Problem

Chat sessions are stored in an in-memory `Map<string, Message[]>` inside `ChatEngine`. Server restart (crash, Godot close/reopen, manual restart) wipes all conversation history. The memory engine persists facts/patterns, but the conversation itself is volatile.

### Current State

- `chat.ts`: `private sessions = new Map<string, Message[]>()` — **in-memory only**
- `memory/store.ts` (193 lines): Persists to `.godotforge/memory.md` — **survives restart**
- `memory/search.ts` (147 lines): SQLite FTS5 `.godotforge/memory.db` — **survives restart**
- `context/builder.ts` (435 lines): Rebuilt fresh per request — **stateless by design**
- Web copilot: `sessionStorage` for messages — **survives page refresh, not tab close**
- No task persistence: Active AI polling lost on crash

### What Survives Restart

| Component | Persists? | Storage |
|-----------|-----------|---------|
| Project memory (facts/patterns) | Yes | `.godotforge/memory.md` + `.db` |
| Session logs | Yes | `.godotforge/sessions/YYYY-MM-DD.md` |
| API keys | Yes | `~/.godotforge/config.json` |
| Chat messages | **No** | In-memory Map |
| Active AI tasks | **No** | In-memory polling |
| Compacted summaries | **No** | In-memory Map |

### Impact

- User restarts Godot → loses entire conversation in native chat
- MCP server crashes during Suno generation → task lost, credits spent
- Web copilot refresh → sessionStorage survives, but server-side session gone
- Context builder works fresh each time (acceptable — rebuilt from memory + project scan)

## Proposed Solution

### Phase 1: Session Persistence (Day 1-2)

1. **SQLite session store** at `.godotforge/sessions.db`
   - Table: `sessions (id TEXT PRIMARY KEY, project TEXT, messages TEXT, created_at TEXT, updated_at TEXT)`
   - Serialize messages as JSON
   - Write-through: Every message append writes to DB
   - Read on session resume: `ChatEngine.getOrCreateSession()` checks DB first

2. **Session TTL + cleanup**
   - Sessions expire after 7 days of inactivity
   - Max 50 sessions per project (LRU eviction)
   - Cleanup on server start

3. **Compaction persistence**
   - Store compacted summary in session record
   - On resume, load compacted summary + recent messages

### Phase 2: Task Recovery (Day 2-3)

1. **Task persistence table** in `sessions.db`
   - `tasks (id TEXT PRIMARY KEY, tool TEXT, args TEXT, status TEXT, external_id TEXT, created_at TEXT)`
   - On server start, check for `status = "working"` tasks
   - Resume polling for recoverable tasks (Meshy, Tripo, Suno — they have task IDs)
   - Mark as `failed` if external service reports completion/failure

2. **Recovery flow:**
   - Server starts → reads `tasks` table → finds incomplete tasks
   - For each: check external API status → resume poll or mark failed
   - Notify client via SSE if connected

### Phase 3: Web Copilot Sync (Day 3)

1. **Server-side session as source of truth**
   - Web copilot loads messages from `GET /chat/history?session_id=X`
   - Remove `sessionStorage` dependency for messages
   - Keep `localStorage` for session ID only

2. **Multi-tab sync**
   - All tabs with same session ID see same messages
   - New messages broadcast via SSE to all connected clients

## Files to Create

| File | Purpose |
|------|---------|
| `mcp-server/src/chat/session-store.ts` | SQLite session persistence |
| `mcp-server/src/tasks.ts` | Task registry with persistence (shared with Issue 002) |

## Files to Modify

| File | Change |
|------|--------|
| `mcp-server/src/chat.ts` | Write-through to session store, load on resume |
| `mcp-server/src/chat/api-mode.ts` | Persist compacted summaries |
| `mcp-server/src/http.ts` | Add `GET /chat/history` endpoint |
| `mcp-server/src/index.ts` | Recovery check on startup |
| `web-client/src/hooks/use-chat.ts` | Load from server instead of sessionStorage |

## Verification

- [ ] Restart MCP server → resume previous conversation
- [ ] Web copilot page refresh → messages reload from server
- [ ] Start Suno generation → kill server → restart → task resumes or reports status
- [ ] Sessions older than 7 days auto-cleaned
- [ ] Max 50 sessions per project enforced
- [ ] Compacted summaries persist across restarts
- [ ] Multiple browser tabs see same conversation
