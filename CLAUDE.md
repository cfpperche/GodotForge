# CLAUDE.md — GodotForge Agent Instructions

## What is GodotForge

GodotForge is an **AI game development hub** that orchestrates Godot Engine, Blender, and external services (assets, AI) through a unified MCP server. 4 interfaces (Claude Code, Godot chat, Blender chat, Web copilot) share the same 89 tools, memory, and context.

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
                                         ├── Docs Engine (SQLite FTS5, 912 classes)
                                         ├── Memory Engine (FTS5 + markdown, 50KB cap)
                                         ├── Context Builder (8K token budget)
                                         ├── ConfigManager (env vars + config.json)
                                         ├── Asset Services (Poly Haven, Sketchfab, OpenGameArt)
                                         ├── Pipeline (Blender → Godot asset flow)
                                         └── Web Dashboard (/dashboard)
```

- **MCP Server** (`mcp-server/`): Unified backend. Dual transport: stdio (MCP clients) + HTTP (native chat). Handles LLM, docs, memory, context, tool routing. Web dashboard at `/dashboard`.
- **Plugin** (`addons/godotforge/`): Thin layer. UI (chat panel, settings) + EditorInterface bridge (24 editor tools on localhost:6970). Auto-spawns MCP server.
- **Blender Addon** (`blender-addon/godotforge/`): Python addon for Blender. TCP socket server :8400 + sidebar chat panel (View3D > GodotForge).
- **Web Copilot** (`web-client/`): React 19 + Tailwind v4 + shadcn/ui. Chat + settings sidebar + API key management.
- **Port files**: Plugin writes `.godot/godotforge.port`, MCP writes `.godotforge/mcp.port`

## Repository Structure

```
addons/godotforge/
  plugin.cfg / plugin.gd          → Editor plugin entry + MCP auto-spawn
  api/
    http_server.gd                → TCPServer bridge (localhost:6970, 24 editor tools)
  tools/
    tool_registry.gd              → Dispatches to 5 handler classes (24 tools)
    tool_base.gd                  → Base class with EditorInterface helpers
    scene_tools.gd                → create_scene, get_scene_tree, open_scene
    node_tools.gd                 → add/remove/rename/duplicate/move_node, set_property
    script_tools.gd               → create/read/edit_script
    runtime_tools.gd              → run/stop_scene, get_game_status, take_screenshot
    editor_tools.gd               → execute_editor_script, add_resource, add_scene_instance,
                                     save_scene, get_node_properties, connect_signal,
                                     set_project_setting, get_editor_errors
  ui/
    chat_panel.gd                 → Thin HTTP client → MCP /chat endpoint
    settings_panel.gd             → Auth mode, model, tokens → MCP /settings
    message_bubble.gd             → BBCode message rendering

mcp-server/src/
  index.ts                        → Dual transport: stdio + HTTP, --http-only flag
  server.ts                       → MCP server (32 tools via @modelcontextprotocol/sdk)
  chat.ts                         → LLM conversation engine (API key + Claude CLI modes)
  http.ts                         → HTTP server on :6980 (/chat, /settings, /context)
  tool-handlers.ts                → Shared tool execution logic (editor + blender + local)
  bridge.ts                       → HTTP client → Godot plugin :6970
  blender-bridge.ts               → TCP socket client → Blender addon :8400
  blender-tools.ts                → Blender tool definitions (39 tools)
  pipeline.ts                     → Blender → Godot asset pipeline (4 tools)
  config.ts                       → API key manager (env + config.json, 12 services)
  tools.ts                        → Tool metadata constants
  assets/                         → Asset service clients
    polyhaven.ts / sketchfab.ts / opengameart.ts / handlers.ts
  docs/                           → Docs engine (SQLite FTS5, 912 Godot + 3800 Blender classes)
    types.ts / db.ts / parser.ts / downloader.ts / indexer.ts / search.ts / blender-docs.ts
  studio/                         → .claude/ integration (skills router, agents context, templates)
    skills.ts / agents.ts / templates.ts
  memory/                         → Memory engine (FTS5 + markdown)
    store.ts / search.ts
  context/                        → Context builder (token-budgeted)
    builder.ts / scanner.ts

blender-addon/godotforge/
  __init__.py                     → Blender addon entry point (register/unregister)
  server.py                       → TCP socket server (:8400, JSON protocol)
  handlers.py                     → 39 tool handlers (modeling, materials, animation, render, export)
  panel.py                        → Sidebar chat panel (View3D > GodotForge)

web-client/                       → Web Copilot (React 19 + Vite + Tailwind v4 + shadcn/ui)
  src/app.tsx                     → Two-column layout: chat + sidebar
  src/hooks/                      → use-chat, use-health, use-settings, use-keys
  src/components/chat/            → chat-panel, message, tool-call, chat-input
  src/components/sidebar/         → sidebar, connection-status, api-keys
  src/lib/api.ts                  → HTTP client to MCP :6980
```

## 85 Tools

### Editor Tools (24 — run in plugin via EditorInterface)
| Tool | Description |
|------|-------------|
| `create_scene` | Create .tscn with root node |
| `open_scene` | Open scene in editor |
| `get_scene_tree` | Node hierarchy of current scene |
| `add_node` | Add child node |
| `remove_node` | Remove node |
| `rename_node` | Rename node |
| `duplicate_node` | Deep-copy node + children |
| `move_node` | Reparent node |
| `set_property` | Set node property (Vector2, Color, etc.) |
| `create_script` | Create .gd file, optionally attach |
| `read_script` | Read script content |
| `edit_script` | Full rewrite or find-replace |
| `run_scene` | Play scene |
| `stop_scene` | Stop running scene |
| `get_game_status` | Check if scene is playing |
| `take_screenshot` | Capture editor viewport |
| `execute_editor_script` | Run arbitrary GDScript in editor |
| `add_resource` | Create + assign Resources (shapes, textures, materials) |
| `add_scene_instance` | Instance .tscn as child node |
| `save_scene` | Save current scene to disk |
| `get_node_properties` | Read all properties of a node |
| `connect_signal` | Wire signal → method |
| `set_project_setting` | Set project.godot settings |
| `get_editor_errors` | Read editor log errors/warnings |
| `take_game_screenshot` | Capture running game window (not editor) via debugger IPC |
| `get_runtime_state` | Runtime scene tree: positions, visibility, text, velocities |
| `simulate_input` | Inject input action into running game (press + release) |
| `simulate_input_sequence` | Execute timed sequence of inputs (single call, game-side timing) |

### Local Tools (8 — run in MCP server, no Godot needed)
| Tool | Description |
|------|-------------|
| `get_project_context` | Project metadata (name, version, scenes, scripts) |
| `read_file` | Read any project file |
| `list_files` | List directory contents |
| `search_docs` | FTS5 search across 912 Godot classes |
| `get_class_reference` | Full Godot class reference |
| `search_blender_docs` | FTS5 search across 3800 Blender bpy classes |
| `get_blender_class` | Full bpy.types class reference |
| `save_memory` | Persist fact/pattern/decision |
| `search_memory` | FTS5 search over memory |
| `get_project_memory` | Full memory contents |

### Blender Tools (39 — run in Blender addon via bpy)

**Modeling (11)**: `create_mesh`, `delete_object`, `duplicate_object`, `transform`, `modify`, `boolean`, `join_objects`, `extrude`, `subdivide`, `set_origin`, `separate_mesh`

**Materials (6)**: `create_material`, `assign_material`, `set_material_texture`, `bake_textures`, `delete_material`, `list_materials`

**Animation (8)**: `create_armature`, `add_bone`, `parent_to_armature`, `insert_keyframe`, `create_animation`, `set_animation_range`, `auto_weight_paint`, `list_animations`

**Scene & Render (7)**: `set_camera`, `set_light`, `render_image`, `set_render_settings`, `get_scene_objects`, `get_object_properties`, `get_blender_info`

**Export (4)**: `export_gltf`, `export_for_godot`, `export_with_animations`, `export_fbx`

**UV (1)**: `unwrap_uv`

**Collision (1)**: `generate_collision_hints` (creates -col/-colonly/-trimesh objects for Godot auto-detect)

**Script (1)**: `execute_python` (escape hatch)

### Pipeline Tools (4 — orchestrate Blender → Godot)
| Tool | Description |
|------|-------------|
| `pipeline.blender_to_godot` | Export Blender → GLB → Godot project |
| `pipeline.blender_to_godot_animated` | Export with animations + armatures → Godot |
| `pipeline.sync_collision` | Generate collision hints → export for Godot auto-detect |
| `pipeline.batch_import` | Batch import multiple 3D files into Godot project |

### Asset Tools (7 — external asset services)
| Tool | Description |
|------|-------------|
| `assets.search_polyhaven` | Search 750+ free textures, models, HDRIs |
| `assets.download_polyhaven` | Download with resolution/format + auto Godot rescan |
| `assets.search_sketchfab` | Search downloadable 3D models |
| `assets.download_sketchfab` | Download GLTF (requires API token) |
| `assets.search_opengameart` | Search sprites, sounds, music, 3D |
| `assets.download_asset` | Generic URL download + auto Godot rescan |
| `assets.list_local` | List project assets by type/directory |

### Config Tool (1)
| Tool | Description |
|------|-------------|
| `get_service_status` | Check which services have API keys configured |

## Completed Features

### V1 (Godot Copilot)
- **Phase 1-8**: 32 Godot tools, docs engine (912 classes FTS5), memory engine, context builder, runtime tools, MCP server with dual transport (stdio + HTTP)
- **Refactoring**: Unified MCP backend (plugin is thin client)
- **Demo**: Flappy Bird game created entirely via tools (demo/)

### V2 (Game Dev Hub)
- **Phase A**: Blender addon (Python socket :8400) + BlenderBridge + 17 tools + pipeline.blender_to_godot
- **Phase B**: +22 Blender tools (animation, armature, render, camera, light, collision) + 3 pipeline tools. Total: 39 Blender + 4 Pipeline
- **Phase C**: Asset Services — Poly Haven (750+ textures), Sketchfab, OpenGameArt + generic download + list_local + auto-import (Godot rescan)
- **ConfigManager**: API key management (env vars + .godotforge/config.json) for 12 services. HTTP endpoints + Web Dashboard
- **Blender Copilot**: Sidebar chat panel (View3D > GodotForge) connected to MCP /chat
- **Web Copilot**: React 19 + Tailwind v4 + shadcn/ui. Chat + settings + API keys at :5173
- **Claude CLI Fix**: `--output-format json --mcp-config` for full tool execution via MCP protocol
- **Memory cap**: 50KB limit + auto-archive to .godotforge/archive/
- **Compaction**: Summarize old messages when session > 20, keep 6 recent
- **Blender RAG**: bpy API extraction (3800 classes, 106K members), FTS5 index, auto-inject in context
- **Auto-RAG**: Context builder detects Godot + Blender class names in messages, pre-loads docs
- **Game dev rules**: gameplay-code, gdscript-standards, scene-architecture, shader-code, game-design-docs
- **Phase E rules**: ai-code, network-code, ui-code, prototype-code, test-standards, data-files, narrative
- **Game dev skills**: /create-game, /game-polish, /game-review
- **Phase F skills**: /balance-check, /brainstorm, /perf-profile, /tech-debt, /sprint-plan, /playtest-report, /design-system, /reverse-document
- **Phase G hooks**: session-start, session-stop, pre-compact, detect-gaps, validate-assets
- **Phase H doc templates**: 25 game dev templates in `.claude/templates/` (GDD, TDD, art/sound bible, economy, balance, character, faction, sprint, milestone, ADR, test-plan, playtest, bug-report, changelog, release/patch notes, post-mortem, incident, risk, onboarding, concept, pillars, pitch, level-design)
- **Phase I specialized agents**: 20 agents in `.claude/agents/` — 7 engineering (godot, gdscript, shader, gameplay, tools, performance, blender) + 4 design (economy, level, systems, prototyper) + 3 art/audio (tech-artist, sound-designer, audio-director) + 3 narrative (director, writer, world-builder) + 3 QA (lead, tester, accessibility)
- **Phase J team orchestration**: 7 multi-agent pipeline skills — /team-combat, /team-narrative, /team-ui, /team-level, /team-polish, /team-audio, /team-release
- **Phase K production skills**: 6 production skills — /milestone-review, /retrospective, /estimate, /gate-check, /localize, /map-systems
- **Web Polish**: Config JSON editor, connection status (MCP/Godot/Blender health checks), service tabs (6 categories, 12 services)
- **Auto-Provision**: Godot plugin auto-copied to project on create/switch, Blender addon auto-installed on startup, version comparison + auto-update
- **Studio Integration**: MCP copilot reads .claude/ (rules, skills, agents, templates) — same quality as Claude Code CLI. Skill routing (/commands), agent context injection, template resolution. HTTP endpoints: /skills, /agents, /templates
- **SSE Streaming**: POST /chat/stream returns Server-Sent Events (text, tool_use, tool_result, done). Web client renders incrementally via ReadableStream.
- **Agent Isolation**: POST /chat/agent runs isolated LLM call with agent-specific system prompt. Team skills delegate to real agent sessions, not role injection.
- **Session management**: Agent SDK with session resume, rules injection from .claude/rules/*.md
- **Onboarding wizard**: 5-step first-time setup (Welcome → Project → Paths → Settings → Done)
- **Project switcher**: Header dropdown with recent projects, inline Open/New forms
- **Settings page**: Full-screen 2-column grid + tabbed API keys + config editor

### E2E Validations
- ✅ Flappy Bird (2D game, 32 Godot tools)
- ✅ Red metallic cube (Blender → GLB → Godot 3D scene)
- ✅ Rigged robot character (armature + walk animation + collision → Godot)
- ✅ Poly Haven textured scene (PBR textures + Blender rocks → Godot)

## Languages & Conventions

### GDScript (Plugin)
- All plugin code is `@tool` (runs in editor)
- Use `class_name` for classes referenced across files
- Prefix private methods/vars with `_`
- Use static typing everywhere
- `EditorInterface` is a singleton — access directly, never pass as parameter
- Scene modifications must set `node.owner = root`

### TypeScript (MCP Server)
- ESM modules (`"type": "module"`)
- Use `zod` for input validation
- Use native `fetch` (Node 22+)
- All file paths validated against project root
- Log to stderr (stdout is MCP transport)

## Key Design Decisions

1. **MCP server is the unified backend.** Plugin is thin UI + EditorInterface bridge.
2. **Dual auth**: Claude CLI (Max/Pro plan, no API key) or API key (pay-per-token). Auto-detected.
3. **Dual transport**: stdio (Claude Code/Cursor) + HTTP :6980 (native chat panel).
4. **Port discovery**: Plugin → `.godot/godotforge.port`, MCP → `.godotforge/mcp.port`.
5. **Plugin auto-spawns MCP** in `--http-only` mode if not already running.
6. **GDScript puro** — no C#, no GDExtensions in the plugin.

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
- **`EditorInterface` singleton** — access directly, never pass as parameter
- **Port file cleanup** — if Godot/MCP crashes, port files may be stale
- **`--http-only` flag** — use when plugin spawns MCP (no stdio needed)
- **Resources via `add_resource`** — use for shapes, textures, materials (set_property only handles primitives)

## Related Docs

- `docs/godotforge-prd.md` — Product requirements
- `docs/godotforge-architecture-diagram.md` — Flow diagrams
- `docs/godotforge-concept-brief.md` — Business model
- `docs/decisions/` — Architecture Decision Records
