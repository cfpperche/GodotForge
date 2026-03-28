# CLAUDE.md — GodotForge Agent Instructions

## What is GodotForge

GodotForge is a hybrid AI Copilot for Godot Engine: a **native Godot editor plugin** (GDScript) + a **unified MCP server backend** (TypeScript). The MCP server is the single brain — it handles LLM calls, docs, memory, context, and tool orchestration. The plugin is a thin UI + EditorInterface bridge.

## Environment

- **Godot**: `"/mnt/c/Tools/Godot/Godot_v4.6.1-stable_win64.exe"` (Windows binary, called from WSL2)
- **Launch editor**: `"/mnt/c/Tools/Godot/Godot_v4.6.1-stable_win64.exe" --editor --path "$(wslpath -w /home/goat/GodotForge)"`
- **Close Godot**: `/mnt/c/Windows/System32/taskkill.exe /F /IM "Godot_v4.6.1-stable_win64.exe"` (pkill doesn't work for Windows processes)
- **Always close Godot** when done testing — don't leave it running in the background

## Architecture

```
Claude Code / Cursor ──► MCP Server (stdio) ──┐
                                               ├──► Plugin HTTP :6970 (EditorInterface)
Chat Panel ────────────► MCP Server (HTTP :6980) ──┘
                              │
                              ├── Claude API / Claude CLI (LLM)
                              ├── Docs Engine (SQLite FTS5, 912 classes)
                              ├── Memory Engine (FTS5 + markdown)
                              ├── Context Builder (token-budgeted)
                              └── Tool Handlers (32 tools)
```

- **MCP Server** (`mcp-server/`): Unified backend. Dual transport: stdio (MCP clients) + HTTP (native chat). Handles LLM, docs, memory, context, tool routing.
- **Plugin** (`addons/godotforge/`): Thin layer. UI (chat panel, settings) + EditorInterface bridge (24 editor tools on localhost:6970). Auto-spawns MCP server.
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
  tool-handlers.ts                → Shared tool execution logic (editor + local)
  bridge.ts                       → HTTP client → plugin :6970
  tools.ts                        → Tool metadata constants
  docs/                           → Docs engine (SQLite FTS5, 912 Godot classes)
    types.ts / db.ts / parser.ts / downloader.ts / indexer.ts / search.ts
  memory/                         → Memory engine (FTS5 + markdown)
    store.ts / search.ts
  context/                        → Context builder (token-budgeted)
    builder.ts / scanner.ts
```

## 32 Tools

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

### Local Tools (8 — run in MCP server, no Godot needed)
| Tool | Description |
|------|-------------|
| `get_project_context` | Project metadata (name, version, scenes, scripts) |
| `read_file` | Read any project file |
| `list_files` | List directory contents |
| `search_docs` | FTS5 search across 912 Godot classes |
| `get_class_reference` | Full class reference |
| `save_memory` | Persist fact/pattern/decision |
| `search_memory` | FTS5 search over memory |
| `get_project_memory` | Full memory contents |

## Completed Features

- **Phase 1**: Plugin + 6 editor tools + HTTP server + native chat
- **Phase 2**: MCP server + bridge + stdio transport
- **Phase 3**: Docs engine (SQLite FTS5, 912 classes, version-aware 4.1-4.6)
- **Phase 4**: Memory + context engine (persistent memory, session logs, context builder)
- **Phase 5**: Advanced editor tools (remove, rename, duplicate, move, edit_script)
- **Phase 6**: Runtime tools (run, stop, screenshot, game status)
- **Phase 7**: Polish (settings UI, README, npm packaging)
- **Phase 8**: Critical tools (execute_editor_script, add_resource, add_scene_instance, save_scene, get_node_properties, connect_signal, set_project_setting, get_editor_errors)
- **Refactoring**: Unified MCP backend (plugin is thin client, MCP handles LLM + tools)

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

# Start MCP (HTTP-only, for native chat)
node mcp-server/dist/index.js --http-only --project-root /path/to/project

# Start MCP (stdio, for Claude Code)
claude mcp add godotforge -- node mcp-server/dist/index.js --project-root /path/to/project

# Test plugin endpoints
curl http://localhost:6970/health
curl -X POST http://localhost:6970/tools/create_scene -d '{"path":"res://test.tscn","root_type":"Node2D"}'

# Test MCP chat
curl -X POST http://localhost:6980/chat -d '{"message":"hello"}'
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
