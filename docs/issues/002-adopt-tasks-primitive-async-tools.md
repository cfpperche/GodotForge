# Issue 002: Adopt MCP Tasks Primitive for Async AI Tools

**Priority:** High
**Effort:** Medium (3-5 days)
**Category:** Infrastructure
**Pain Point:** No streaming for long-running tools (~1,500 LOC polling workaround)

## Problem

AI generation tools (Suno 3min, Tripo 20s, Meshy 60s, Stability 10s) block the HTTP response while polling external APIs with a linear 5-second interval. The client sees nothing until completion or timeout (5min). If the server crashes mid-poll, the task is lost.

### Current State

- `ai/poll.ts` (30 lines): Generic `pollUntil()` — linear 5s interval, 5min max
- 10 AI service handlers use `pollUntil()` to block until completion
- No progress updates to client during generation
- No cancellation API
- No exponential backoff
- No job persistence (crash = lost task)
- **~1,500 lines** of polling + handler code across AI services

### MCP Spec Solution

**Tasks primitive** (spec 2025-11-25, experimental):
- `tools/call` returns a task handle immediately (non-blocking)
- Task states: `working` → `completed` | `failed` | `cancelled`
- Client polls via `tasks/get`, `tasks/result`, `tasks/list`
- Results stream back via SSE on `tasks/result` endpoint
- `tasks/cancel` for client-initiated cancellation

## Proposed Solution

### Phase 1: Improve Existing Polling

1. **Exponential backoff** in `poll.ts`: 2s → 4s → 8s → 16s (capped at 30s)
2. **Progress callback**: `pollUntil()` accepts `onProgress(status)` callback
3. **SSE progress events**: Emit `task_progress` events during polling for `/chat/stream`

### Phase 2: Adopt Tasks Primitive

1. **Task registry**: In-memory map of active tasks with status + result
2. **Non-blocking tool calls**: AI tools return task handle immediately
3. **Background polling**: Server polls external API in background, updates task registry
4. **Standard endpoints**: `tasks/get`, `tasks/result`, `tasks/cancel`
5. **SSE delivery**: Stream results to client when ready

### Affected AI Tools (blocking → async)

| Tool | Typical Wait | Priority |
|------|-------------|----------|
| `ai.suno_generate` | 60-180s | High |
| `ai.meshy_text_to_3d` | 30-120s | High |
| `ai.tripo_text_to_3d` | 15-60s | High |
| `ai.fal_rodin` | 30-90s | Medium |
| `ai.fal_trellis` | 10-30s | Medium |
| `ai.stability_generate` | 5-15s | Low (fast enough) |

### Expected Improvement

- Client gets immediate response (task ID) instead of blocking
- Progress updates visible in UI
- Cancellation possible
- Server crash recovery (task registry can be persisted)

## Files to Modify

| File | Change |
|------|--------|
| `mcp-server/src/ai/poll.ts` | Add exponential backoff + progress callback |
| `mcp-server/src/ai/*-handlers.ts` | Return task handle instead of blocking |
| `mcp-server/src/http.ts` | Add tasks/* endpoints |
| `mcp-server/src/server.ts` | Register task management tools |
| New: `mcp-server/src/tasks.ts` | Task registry + lifecycle management |

## Verification

- [ ] `ai.suno_generate` returns task ID immediately
- [ ] `tasks/get` returns current status (working/completed/failed)
- [ ] `tasks/result` streams result when ready
- [ ] `tasks/cancel` stops a running task
- [ ] SSE progress events emitted during polling
- [ ] Exponential backoff reduces API calls by ~60%
- [ ] Existing sync behavior still works for fast tools (<10s)
