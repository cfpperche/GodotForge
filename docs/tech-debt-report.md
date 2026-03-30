# GodotForge Tech Debt Report

**Scan date:** 2026-03-30
**Scope:** `mcp-server/src/`, `addons/godotforge/`, `blender-addon/godotforge/`, `web-client/src/`
**Method:** Static analysis — file sizes, grep patterns, structural review. No source code was modified.

---

## Summary Table

| Severity | Count | Category |
|---|---|---|
| Critical | 3 | Zero test coverage on core runtime paths; Blender handlers have no exception handling; ConfigManager re-instantiated per tool call |
| High | 4 | Massive file bloat (4 files > 500 lines); Tool definitions duplicated across server.ts + chat.ts; 5 separate polling implementations; `print()` in production GDScript |
| Medium | 4 | `execSync` blocks the event loop in hot paths; `any` in docs parser; magic numbers without constants; `getToolDefinitions()` diverged from zod schemas |
| Low | 3 | Single test file covers one module; no vitest config for web-client; `as any` in the one existing test |

---

## Critical

### C-1: Zero test coverage on all core runtime paths

**Risk:** Reliability. Any refactor, dependency update, or new tool registration can silently break the primary value surface.

The Vitest framework is installed and `vitest run` is wired into `npm test`. There is exactly **one test file** in the entire project:

```
mcp-server/src/docs/search.test.ts   — 117 lines, covers searchDocs + getClassReference only
```

Modules with **zero test coverage**:

| Module | Why it matters |
|---|---|
| `tool-handlers.ts` | Dispatches all 134 tools; guardrail logic, event log, confirmation flow |
| `chat.ts` | API loop, compaction trigger, SDK session resume, continuation logic |
| `bridge.ts` | HTTP client to Godot plugin; error messages users see when Godot is down |
| `blender-bridge.ts` | TCP socket client; framing, length prefix, timeout handling |
| `guardrails.ts` | Security gating — untested means bypass paths are invisible |
| `memory/store.ts` | 50KB cap logic, archival; data loss if cap check is wrong |
| `config.ts` | API key resolution, path detection; wrong key = silent auth failures |
| `pipeline.ts` | Blender→Godot asset flow; the primary cross-tool integration |
| `assets/handlers.ts` | Download, unzip, Godot rescan; filesystem side-effects |
| `confirmations.ts` | Timeout/cleanup logic; memory leak potential |
| `webhooks.ts` | Retry with backoff; untested retry = silent delivery failures |

**Remediation:** Create `mcp-server/src/__tests__/` and cover at minimum: `guardrails`, `tool-handlers` dispatch table, `memory/store` cap logic, `bridge` error states, `confirmations` timeout. Use the existing `search.test.ts` as the pattern (mock at boundaries only).

---

### C-2: Blender Python handlers have no exception handling at the call site

**Risk:** Reliability. A `bpy.ops` call that fails (e.g., wrong context, missing object, mode conflict) raises an exception that propagates up to the TCP server's bare `except Exception as e` handler — logging a raw Python traceback to the Blender console, sending no structured error to the caller, and leaving Blender in an undefined edit-mode state.

**Location:** `blender-addon/godotforge/handlers.py` — 39 handler functions, **zero `try/except` blocks** in any of them. The server wraps the dispatcher (`server.py:65-87`) but that only catches JSON decode errors and generic exceptions at the dispatch level; it does not recover per-tool state.

**Affected count:** 47 `bpy.ops.*` calls in `handlers.py` with no individual error boundary.

**Remediation:** Each handler should wrap its bpy operations in `try/except Exception as e` and return `{"result": str(e), "is_error": True}`. The server.py dispatch already calls `handle(args)` — callers expect that contract. A decorator or wrapper function can enforce the pattern without touching each function.

---

### C-3: ConfigManager re-instantiated on every AI tool call

**Risk:** Reliability under load / correctness. `executeToolInner` in `tool-handlers.ts` creates `new ConfigManager(root)` **11 times** — once per AI service namespace block (Meshy, Blockade, ElevenLabs, Rodin, Tripo, DALL-E, Suno, HuggingFace, Stability, assets.download_sketchfab, and one in http.ts). Each instantiation reads `config.json` from disk. Under concurrent requests this races with writes from the settings endpoints.

```typescript
// tool-handlers.ts line 508, 523, 539, 550, 562, 587, 597, 609, 619, and more
const cfg = new ConfigManager(root);
```

`ConfigManager` is already injected into `executeTool()`'s call site from `http.ts` and `server.ts`. It should be threaded through as a parameter, not reconstructed per tool call.

**Remediation:** Add `config?: ConfigManager` to the `executeTool` signature. Pass it down into `executeToolInner`. Fall back to `new ConfigManager(root)` only when not provided. This is a two-step change: signature update + call-site thread-through.

---

## High

### H-1: Four files exceed 500 lines — violates single-responsibility

| File | Lines | Problem |
|---|---|---|
| `mcp-server/src/server.ts` | 1235 | 96 `server.tool()` registrations in one file. It is a flat list of tool schemas and delegates — no logic — but it is impossible to navigate and will grow without bound as tools are added. |
| `mcp-server/src/chat.ts` | 897 | Handles: API loop, SDK session resume, compaction, continuation, rule loading, skill resolution, agent resolution, streaming, tool dispatch. Too many responsibilities. |
| `mcp-server/src/http.ts` | 871 | HTTP routing, Blender provisioning, connection health checks, port-file management, settings endpoints, event log endpoints, webhook endpoints, SSE streaming — all in one class. |
| `mcp-server/src/tool-handlers.ts` | 690 | Tool dispatch for 134 tools, guardrail integration, event log, confirmation flow. The AI tool dispatch block alone is 150 lines of repeated `if (toolName.startsWith(...))` / `new ConfigManager` / dynamic import. |

**Remediation:**
- `server.ts`: Extract tool registrations into grouped files (e.g., `server-editor-tools.ts`, `server-blender-tools.ts`, `server-ai-tools.ts`) and import/call a `registerXxxTools(server, runTool)` function.
- `chat.ts`: Extract `getToolDefinitions()` (it is already a standalone function — it should live in `tools.ts`). Extract `loadRules()`, `loadSkills()` plumbing into `studio/` helpers.
- `http.ts`: Extract route handlers into a `routes/` directory. The provisioning logic (`provisionBlenderAddon`) belongs in its own module.
- `tool-handlers.ts`: Extract the AI dispatch block into `ai/dispatcher.ts`. The pattern is already consistent enough to be a registry.

---

### H-2: Tool definitions exist in two out-of-sync places

**Risk:** Bugs. New tools added to `server.ts` (zod schemas) are not automatically reflected in `chat.ts`'s `getToolDefinitions()` (raw objects). The API-key auth path uses `getToolDefinitions()` exclusively. If these diverge, the LLM in API-key mode does not know about new tools.

**Evidence:** `server.ts` has 96 `server.tool()` registrations. `getToolDefinitions()` in `chat.ts` returns 32 entries — all the non-AI tools. The 42 AI tools added in Phase D are **only available in Agent SDK mode**, not API-key mode.

The rules note: "Tool definitions exist in TWO places by design (`claude_tools.gd` + `tools.ts`) — this is the ONE accepted duplication." This duplication between `server.ts` and `chat.ts` is **not** that accepted pair. It is an accidental second source of truth.

**Remediation:** `getToolDefinitions()` should be derived from `TOOLS` in `tools.ts` and the blender/pipeline/AI tool lists, not hand-coded. Alternatively, document the gap explicitly and gate API-key mode tools on the tools that `getToolDefinitions()` covers.

---

### H-3: Five independent polling implementations across AI services

**Risk:** Maintenance burden / subtle bugs. Each AI service (Meshy, Rodin, Tripo, Suno, Blockade) implements its own `pollXxxDone()` function. All five follow the same pattern: `while (Date.now() < deadline)` → fetch status → check terminal state → sleep 5s → throw timeout. The implementations differ only in the status field names and terminal state values.

This means a fix to polling (e.g., adding jitter, changing error handling on 5xx during poll, adding a cancel signal) must be applied five times.

**Evidence:**
- `meshy.ts:341` — `pollUntilDone`
- `rodin.ts:126` — `pollRodinDone`
- `tripo.ts:200` — `pollTripoDone`
- `suno.ts:124` — `pollSunoDone`
- `blockade.ts:133` — `pollSkyboxDone`

**Remediation:** Extract a generic `pollUntil<T>` helper in `ai/poll.ts`:

```typescript
export async function pollUntil<T>(
  fetchFn: () => Promise<T>,
  isDone: (result: T) => boolean,
  opts: { intervalMs: number; maxWaitMs: number; taskLabel: string }
): Promise<T>
```

Each service wraps their status fetch in this. Net: ~60 lines removed, one place to fix.

---

### H-4: `print()` used in production GDScript plugin — violates plugin rules

**Risk:** Noise / rule violation. The project's own `gdscript-plugin.md` rule states: "No `print()` in production — use signals to surface info to the UI." The plugin uses `print()` in 11 places.

**Affected files:** `plugin.gd` (8 calls), `api/http_server.gd` (3 calls).

These calls go to the Godot output panel — visible to users and mixed with game output during development. The plugin should emit signals or use `push_error`/`push_warning` for anything non-informational.

**Remediation:** Replace status `print()` calls with structured signals (e.g., `server_started.emit(port)` already exists). Replace error-condition prints with `push_error()`.

---

## Medium

### M-1: `execSync` blocks the Node.js event loop in non-trivial paths

**Risk:** Server hangs under concurrent requests. Three locations use synchronous process execution:

- `config.ts:191` — `cmd.exe /C echo %TEMP%` — runs on startup to detect Windows temp path. Acceptable if truly once.
- `http.ts:674` — `cmd.exe /C echo %USERNAME%` — runs on every GET /dashboard request to populate username in the template. **This is in a request handler.**
- `http.ts:724` — Blender addon installation: `"${blenderPath}" --background --python "${enableScript}"` — runs synchronously, blocking the HTTP server for the entire duration of Blender's startup. Blender startup can take 2–10 seconds.
- `pipeline.ts:11` — imports `execSync` (need to verify actual usage).

**Remediation:**
- `http.ts:674`: Cache the username at startup, not per request.
- `http.ts:724`: Replace Blender auto-provision with `spawn()` / `execFile()` (async). The provisioning result can be reported via a separate `/provision-status` endpoint or logged.

---

### M-2: `any` type in docs parser bypasses type safety

**Risk:** Maintenance. `docs/parser.ts` uses `any` in 7 places for XML-parsed objects from the Godot docs. This means shape changes in the XML schema are invisible to the compiler and produce runtime errors.

**Affected lines:** `parser.ts:64, 75, 87, 101, 113, 120, 136`

The project's `typescript-mcp.md` rule states: "No `any` type — use `unknown` and narrow."

**Remediation:** Define interfaces for the parsed XML node shapes (`ParsedMethod`, `ParsedMember`, `ParsedSignal`, `ParsedConstant`) and use Zod or manual narrowing when iterating.

---

### M-3: Magic numbers without named constants

**Risk:** Maintenance / accidental misconfiguration. Several hardcoded numeric limits appear directly in logic rather than as named constants:

| Location | Value | Meaning |
|---|---|---|
| `chat.ts:80` | `16384` | max_tokens default |
| `chat.ts:642` | `20` | Compaction trigger (messages > 20) |
| `chat.ts:603` | `10` | MAX_TOOL_LOOPS |
| `chat.ts:626` | `3` | Max continuation rounds |
| `memory/store.ts:132` | `50 * 1024` | Memory cap bytes (named but inline) |
| `events.ts:10` | `10 * 1024 * 1024` | Event log max file size (named but inline) |

The top three are especially impactful: `MAX_TOOL_LOOPS` is already a named constant at line 16, but `20` and `3` are inline. The `16384` default is duplicated between `chat.ts:80` and the `ChatSettings` interface default.

**Remediation:** Extract `MAX_CONTEXT_MESSAGES`, `MAX_CONTINUATION_ROUNDS` as constants alongside `MAX_TOOL_LOOPS`.

---

### M-4: AI tool registrations in `server.ts` are not reflected in `tools.ts`

**Risk:** Maintenance. `tools.ts` exports `TOOLS` (the 32 base tools) and `EDITOR_TOOLS` (the editor tool name set). The 42 AI tools added in Phase D are registered directly in `server.ts` and dispatched in `tool-handlers.ts` but are absent from `tools.ts`. This means `EDITOR_TOOL_NAMES` in `tool-handlers.ts` only covers editor tools — AI tool names are tested via `startsWith("ai.")` string prefix instead of a set lookup, which is inconsistent with the established pattern.

**Remediation:** Add `AI_TOOL_NAMES` set to `tools.ts` (or to `ai/tools.ts`) so the dispatch in `tool-handlers.ts` can use set membership instead of prefix branching.

---

## Low

### L-1: The single test file uses `as any` to pass mocks

**Risk:** Low. `docs/search.test.ts` passes mock database objects as `as any` to avoid type errors. This is a minor pragmatic choice in a test file, but it means the mock interface can diverge from the real `Database` type silently.

**Remediation:** Define a `MockDb` interface or use `satisfies` to narrow the mock to the subset of `Database` that `searchDocs` / `getClassReference` actually use.

---

### L-2: Web client has no tests and no Vitest config

**Risk:** Low today, higher as the React components grow. The `web-client/` has no test files, no `vitest.config.ts`, and no `@testing-library/react` dependency. The hooks (`use-chat.ts`, `use-health.ts`, `use-project.ts`) contain non-trivial logic (session management, auto-scroll detection, streaming SSE parsing) that is untestable in the current state.

**Remediation:** Add Vitest + `@testing-library/react` to `web-client/package.json`. Priority tests: `use-chat.ts` session isolation logic, `use-health.ts` connection state machine.

---

### L-3: `docs/search.test.ts` covers the happy path but not the error path

**Risk:** Low. The existing test covers: FTS query building, kind filter, no-filter case, limit default, null-return on missing class, full class assembly, invalid params_json. It does not test: DB prepare throwing an error, the FTS query returning a `null` row mid-iteration, or `params_json` being `undefined` vs `null` (both are handled but only `null` is tested).

**Remediation:** Add three negative-path tests to close coverage on the parsing branches.

---

## Coverage Gap Map

```
Module                          Unit Tests    Integration Tests    Status
─────────────────────────────────────────────────────────────────────────
docs/search.ts                  PARTIAL       none                 1 file, partial
docs/parser.ts                  none          none                 GAP
tool-handlers.ts                none          none                 GAP — highest priority
guardrails.ts                   none          none                 GAP — security boundary
chat.ts                         none          none                 GAP
bridge.ts                       none          none                 GAP
blender-bridge.ts               none          none                 GAP
memory/store.ts                 none          none                 GAP
config.ts                       none          none                 GAP
pipeline.ts                     none          none                 GAP
assets/handlers.ts              none          none                 GAP
confirmations.ts                none          none                 GAP
webhooks.ts                     none          none                 GAP
ai/* (9 modules)                none          none                 GAP
web-client/hooks/*              none          none                 GAP
blender-addon/handlers.py       none          none                 GAP
addons/godotforge/**            none          none                 GAP (no GUT)
```

**Estimated coverage:** < 2% of production code paths.

---

## Recommended Remediation Order

1. **C-3** — Fix ConfigManager instantiation (1–2 hours, zero risk, immediate perf + correctness gain).
2. **C-2** — Wrap Blender handlers in per-function try/except (2 hours, prevents Blender addon crashes from propagating silently).
3. **H-3** — Extract generic `pollUntil` helper (1 hour, reduce 5 copies to 1).
4. **H-4** — Replace `print()` with signals/push_error in plugin (30 minutes).
5. **C-1** — Add tests for `guardrails.ts`, `memory/store.ts`, `tool-handlers.ts` dispatch (4–6 hours — these are the highest-value test targets given they are both complex and completely untested).
6. **M-1** — Make Blender provisioning async (2 hours, prevents HTTP server stall).
7. **H-1/H-2** — File decomposition and tool definition unification (1–2 days, plan first to avoid breaking the build).

---

*This report was generated by static analysis only. No source code was modified.*
