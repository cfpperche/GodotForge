# CLAUDE.md — GodotForge Agent Instructions

## What is GodotForge

GodotForge is an **AI game development hub** that orchestrates Godot Engine, Blender, and external services (assets, AI generators) through a unified MCP server. 4 interfaces (Claude Code, Godot chat, Blender chat, Web copilot) share the same 152 tools, memory, and context.

## Environment

- **Godot**: `"/mnt/c/Tools/Godot/Godot_v4.6.1-stable_win64.exe"` (Windows binary, called from WSL2)
- **Launch editor**: `"/mnt/c/Tools/Godot/Godot_v4.6.1-stable_win64.exe" --editor --path "$(wslpath -w /home/goat/GodotForge)"`
- **Blender**: `"/mnt/c/Program Files/Blender Foundation/Blender 4.2/blender-launcher.exe"`
- **Blender (clean)**: `"/mnt/c/Program Files/Blender Foundation/Blender 4.2/blender-launcher.exe" --python "$(wslpath -w /home/goat/GodotForge/blender-addon/clean_startup.py)"`
- **Close Godot**: `/mnt/c/Windows/System32/taskkill.exe /F /IM "Godot_v4.6.1-stable_win64.exe"` (pkill doesn't work for Windows processes)
- **Close Blender**: `/mnt/c/Windows/System32/taskkill.exe /F /IM "blender.exe"`
- **Always close Godot** when done testing — don't leave it running in the background

## Architecture

```
Web Copilot (React :5173) ──────────┐
Claude Code / Cursor ──► MCP (stdio)──┤
Godot Chat Panel ──► MCP (HTTP :6980)──┤──► Godot Plugin HTTP :6970
Blender Chat Panel ──► MCP (HTTP :6980)──┤──► Blender Addon TCP :8400
                                         │
                                         ├── Claude API / Claude CLI (LLM)
                                         ├── Docs Engine (SQLite FTS5, 912 Godot + 3800 Blender classes)
                                         ├── Memory Engine (FTS5 + markdown, 50KB cap)
                                         ├── Context Builder (8K token budget)
                                         ├── ConfigManager (env vars + config.json, AES-256-GCM encrypted)
                                         ├── Asset Services (Poly Haven, Sketchfab, OpenGameArt, ambientCG, Freesound, Godot Library, jsfxr)
                                         ├── AI Generators (10 services + fal.ai gateway, 55 tools)
                                         ├── TaskRegistry (async AI operations, exponential backoff)
                                         ├── SessionStore (SQLite, per-project persistence)
                                         ├── Pipeline (Blender → Godot asset flow)
                                         ├── File Browser (tree + preview + CodeMirror editor)
                                         ├── Security (Bearer auth, rate limiting, CORS)
                                         └── Web Dashboard (/dashboard)
```

- **MCP Server** (`mcp-server/`): Unified backend. Dual transport: stdio + Streamable HTTP at `/mcp`. Custom HTTP API at `:6980/*`. Web dashboard at `/dashboard`.
- **Plugin** (`addons/godotforge/`): Thin layer. UI (chat panel, settings) + EditorInterface bridge (28 editor tools on localhost:6970). Auto-spawns MCP server.
- **Blender Addon** (`blender-addon/godotforge/`): Python addon. TCP socket :8400 + sidebar chat panel (View3D > GodotForge).
- **Web Copilot** (`web-client/`): React 19 + Tailwind v4 + shadcn/ui. Chat + settings + API keys.
- **Port files**: Plugin → `.godot/godotforge.port`, MCP → `.godotforge/mcp.port`

## Repository Structure

```
addons/godotforge/
  plugin.cfg / plugin.gd          → Editor plugin entry + MCP auto-spawn
  api/http_server.gd              → TCPServer bridge (localhost:6970, 28 editor tools)
  tools/
    tool_registry.gd              → Dispatches to 5 handler classes
    tool_base.gd / scene_tools.gd / node_tools.gd / script_tools.gd
    runtime_tools.gd / editor_tools.gd
  ui/
    chat_panel.gd / settings_panel.gd / message_bubble.gd

mcp-server/src/
  index.ts                        → Dual transport: stdio + Streamable HTTP, --http-only flag
  server.ts                       → MCP server (152 tools via @modelcontextprotocol/sdk)
  chat.ts                         → LLM conversation engine (API key + Claude CLI modes)
  http.ts                         → HTTP server :6980 (/chat, /settings, /context, /files, /mcp, /tasks)
  tool-handlers.ts                → Shared tool execution (editor + blender + local + AI)
  bridge.ts                       → HTTP client → Godot plugin :6970
  blender-bridge.ts / blender-tools.ts → Blender integration (39 tools)
  pipeline.ts                     → Blender → Godot asset pipeline (4 tools)
  config.ts                       → API key manager (env + config.json, AES-256-GCM encryption)
  tasks.ts                        → Async task registry (submit/get/cancel/list, exponential backoff)
  tools.ts                        → Tool metadata constants
  http/
    auth.ts                       → Bearer token auth (timing-safe, ~/.godotforge/http-token)
    rate-limiter.ts               → Sliding window rate limiting per category
    files.ts                      → File browser API + WebSocket live updates
  chat/
    api-mode.ts                   → API key conversation mode
    agent-sdk.ts                  → Agent SDK conversation mode
    session-store.ts              → SQLite session persistence (WAL, 7-day TTL, per-project)
  assets/
    polyhaven.ts / sketchfab.ts / opengameart.ts / handlers.ts
    ambientcg.ts / godot-library.ts / freesound.ts / sfxr.ts
  ai/                             → AI generator clients (10 services + fal.ai gateway)
    meshy.ts / stability.ts / elevenlabs.ts / tripo.ts / suno.ts
    openai-dalle.ts / blockade.ts / rodin.ts / huggingface.ts / fal.ts
    *-handlers.ts                 → Handler functions per service
    poll.ts                       → Shared polling (exponential backoff, jitter, cancellation)
  docs/                           → Docs engine (SQLite FTS5, 912 Godot + 3800 Blender classes)
  studio/                         → .claude/ integration (skills, agents, templates routing)
  memory/                         → Memory engine (FTS5 + markdown, 50KB cap)
  context/                        → Context builder (token-budgeted, auto-RAG)

blender-addon/godotforge/
  __init__.py / server.py / handlers.py / panel.py

web-client/src/
  app.tsx / hooks/ / components/ / lib/api.ts
```

## 152 Tools

| Category | Count | Where | Key Tools |
|----------|-------|-------|-----------|
| **Editor** | 28 | Godot plugin :6970 | create_scene, add_node, set_property, run_scene, take_screenshot, simulate_input, get_runtime_state |
| **Local** | 10 | MCP server | search_docs, get_class_reference, save_memory, read_file, list_files |
| **Blender** | 39 | Blender addon :8400 | create_mesh, create_material, create_armature, export_for_godot, render_image |
| **Pipeline** | 4 | MCP → Blender → Godot | blender_to_godot, blender_to_godot_animated, sync_collision, batch_import |
| **Assets** | 15 | MCP → external APIs | search/download: Poly Haven, Sketchfab, OpenGameArt, ambientCG, Godot Library, Freesound + generate_sfx (jsfxr) |
| **AI Generators** | 55 | MCP → external APIs | Meshy (8), Stability AI (13), ElevenLabs (4), Tripo (7), Suno (4), DALL-E (3), Blockade (3), Rodin (2), HuggingFace (1), fal.ai (12) |
| **Config** | 1 | MCP server | get_service_status |

Full tool reference: see tool tables in `mcp-server/src/server.ts` (zod schemas) or `mcp-server/src/tools.ts` (metadata).

## Security

- **Authentication**: Bearer token auth on all HTTP endpoints. Token auto-generated at `~/.godotforge/http-token` (randomBytes 32 hex). Timing-safe comparison. `/health` exempt.
- **API Key Encryption**: AES-256-GCM with machine-bound PBKDF2 key (hostname+username). Format: `enc:v1:<iv>:<authTag>:<ciphertext>`. Auto-migrates plaintext keys.
- **Rate Limiting**: Sliding window per category — chat 20/min, config 10/min, files 200/min, default 100/min.
- **CORS**: Restricted to known origins (localhost:5173, localhost:6980).
- **Guardrails**: Server-side tool validation — 4 risk levels (safe/moderate/destructive/critical). Content scanning. Root node protection.
- **Guardrail Modes**: yolo (skip all), normal (confirm destructive/critical), strict (confirm all non-read).

## Session & Async

- **Session Persistence**: SQLite `sessions.db` per project, write-through on every response, 7-day TTL, max 50 sessions.
- **Async Tasks**: `TaskRegistry` for long-running AI operations. `GET /tasks`, `GET /tasks/:id`, `DELETE /tasks/:id`. In-memory, 30min TTL.
- **Polling**: Exponential backoff (2s→4s→8s→16s→30s cap), ±20% jitter, `onProgress` + `isCancelled` callbacks.
- **SSE Streaming**: `POST /chat/stream` returns Server-Sent Events (text, tool_use, tool_result, done).

## Forge Ecosystem

Skills and agents are managed by 3 meta-skills + an orchestration rule:

| Skill | Purpose |
|-------|---------|
| `/forge-skill-creator` | Create/update/audit skills. **Always use this — never write SKILL.md manually.** |
| `/forge-agent-creator` | Create/update/audit agents (5-Block Architecture) |
| `/forge-hook-creator` | Create/update/audit hooks (25 events, 4 handler types) |

- **Orchestration**: `.claude/rules/orchestration.md` — decision tree (skill → agent → self), mandatory routing tables
- **Gate Reviewer**: `.claude/agents/gate-reviewer.md` — mandatory at every phase checkpoint, adversarial review with visual inspection
- **Dynamic Tags**: Skills use `{{TEXTURE_SERVICES}}`, `{{AI_3D_SERVICES}}`, etc. — resolved at runtime from tool registry. See `.claude/rules/skill-authoring.md`.
- **20 specialized agents** in `.claude/agents/` — engineering, design, art/audio, narrative, QA
- **7 team pipeline skills** — /team-combat, /team-narrative, /team-ui, /team-level, /team-polish, /team-audio, /team-release

## Languages & Conventions

### GDScript (Plugin)
- All plugin code is `@tool` (runs in editor)
- Use `class_name` for cross-file references
- Prefix private methods/vars with `_`
- Static typing everywhere
- `EditorInterface` is a singleton — access directly, never pass as parameter
- Scene modifications must set `node.owner = root`

### TypeScript (MCP Server)
- ESM modules (`"type": "module"`)
- `zod` for input validation
- Native `fetch` (Node 22+)
- All file paths validated against project root
- Log to stderr (stdout is MCP transport)

## Key Design Decisions

1. **MCP server is the unified backend.** Plugin is thin UI + EditorInterface bridge.
2. **Dual auth**: Claude CLI (Max/Pro plan) or API key (pay-per-token). Auto-detected.
3. **Dual transport**: stdio (Claude Code/Cursor) + Streamable HTTP `:6980/mcp` + custom HTTP `:6980/*`.
4. **Port discovery**: Plugin → `.godot/godotforge.port`, MCP → `.godotforge/mcp.port`.
5. **Plugin auto-spawns MCP** in `--http-only` mode if not already running.
6. **GDScript puro** — no C#, no GDExtensions in the plugin.
7. **Skills use dynamic tags** — resolved at runtime. Never hardcode service names.
8. **Always use `/forge-skill-creator`** to create or update skills. Never write SKILL.md manually.
9. **Gate-reviewer at every phase checkpoint** — producing agent cannot approve its own work.

## Adding a New Editor Tool

1. Add handler in `addons/godotforge/tools/editor_tools.gd` (or new file)
2. Register in `tools/tool_registry.gd`
3. Add to `mcp-server/src/server.ts` (zod schema + editorTool delegate)
4. Add to `EDITOR_TOOL_NAMES` set in `tool-handlers.ts`
5. Add to `getToolDefinitions()` in `chat.ts`
6. Test: `curl -X POST http://localhost:6970/tools/my_tool -d '{...}'`

## Building & Testing

```bash
# Build MCP server
cd mcp-server && npm install && npm run build

# Build Web Copilot
cd web-client && npm install && npm run build

# Start MCP (HTTP-only, for native chat + web copilot)
node mcp-server/dist/index.js --http-only --project-root /path/to/project

# Start Web Copilot (dev mode)
cd web-client && npm run dev  # → http://localhost:5173

# Start MCP (stdio, for Claude Code)
claude mcp add godotforge -- node mcp-server/dist/index.js --project-root /path/to/project

# Test endpoints
curl http://localhost:6970/health              # Godot plugin
curl http://localhost:6980/health              # MCP server
curl http://localhost:6980/dashboard           # Web dashboard
curl -X POST http://localhost:6980/chat -d '{"message":"hello"}'
curl http://localhost:6980/keys                # API key status

# Test Blender addon
echo '{"tool":"health","args":{}}' | nc -w 5 127.0.0.1 8400
```

## Common Pitfalls

- **`node.owner = root`** — always set when adding nodes, or they won't serialize
- **`@tool` required** — every GDScript file in the plugin
- **Port file cleanup** — if Godot/MCP crashes, port files may be stale
- **`--http-only` flag** — use when plugin spawns MCP (no stdio needed)
- **Resources via `add_resource`** — use for shapes, textures, materials (set_property only handles primitives)
- **Bearer auth required** — all HTTP endpoints except `/health` need `Authorization: Bearer <token>`
- **Active project sync** — `~/.godotforge/active-project` must match current project for tools to save correctly

## Related Docs

- `docs/godotforge-prd.md` — Product requirements
- `docs/godotforge-architecture-diagram.md` — Flow diagrams
- `docs/godotforge-concept-brief.md` — Business model
- `docs/decisions/` — Architecture Decision Records
- `docs/CHANGELOG.md` — Feature history by phase
