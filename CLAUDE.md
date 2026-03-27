# CLAUDE.md — GodotForge Agent Instructions

## What is GodotForge

GodotForge is a hybrid AI Copilot for Godot Engine: a **native Godot editor plugin** (GDScript) + an **MCP server** (TypeScript). Users interact with it via Claude Code (Max plan), Cursor, or a native chat panel inside Godot.

## Environment

- **Godot**: `"/mnt/c/Tools/Godot/Godot_v4.6.1-stable_win64.exe"` (Windows binary, called from WSL2)
- **Launch editor**: `"/mnt/c/Tools/Godot/Godot_v4.6.1-stable_win64.exe" --editor --path "$(wslpath -w /home/goat/GodotForge)"`
- **Always close Godot** when done testing — don't leave it running in the background

## Architecture

```
MCP Clients (Claude Code / Cursor) → MCP Server (TypeScript) → HTTP Bridge → Godot Plugin (GDScript)
                                                                              ↑
                                                          Native Chat Panel (API key) ──┘
```

- **Plugin** (`addons/godotforge/`): GDScript, runs inside Godot editor, exposes REST API on `localhost:6970`
- **MCP Server** (`mcp-server/`): TypeScript, runs as separate process, connects to plugin via HTTP

## Repository Structure

```
addons/godotforge/
  plugin.cfg / plugin.gd          → Editor plugin entry point
  api/
    http_server.gd                → TCPServer REST bridge (localhost:6970)
    claude_client.gd              → Direct Claude API client (native chat mode)
    claude_tools.gd               → Tool definitions (JSON schemas)
    conversation.gd               → Message history
    api_key_manager.gd            → API key persistence
  tools/
    tool_registry.gd              → Dispatches tool calls to handlers
    tool_base.gd                  → Base class with EditorInterface helpers
    scene_tools.gd                → create_scene, get_scene_tree
    node_tools.gd                 → add_node, set_property
    script_tools.gd               → create_script, read_script
  ui/
    chat_panel.gd                 → Bottom panel chat interface
    message_bubble.gd             → Message rendering (BBCode)
  context/                        → (Phase 4) Project scanner + context builder
  docs/                           → ✅ SQLite FTS5 docs (912 classes)

mcp-server/
  src/
    index.ts                      → CLI entry point (stdio transport)
    server.ts                     → MCP server with 11 tools (14 target after Phase 4)
    bridge.ts                     → HTTP client → Godot plugin
    tools.ts                      → MCP tool definitions
    docs/                         → ✅ Docs engine (types, db, parser, downloader, indexer, search)
    memory/                       → (Phase 4) Memory store + FTS5 search
    context/                      → (Phase 4) Builder + scanner
```

## Languages & Conventions

### GDScript (Plugin)
- All plugin code is `@tool` (runs in editor, not game)
- Use `class_name` for classes referenced across files (e.g., `GodotForgeToolBase`)
- Prefix private methods/vars with `_`
- Use static typing everywhere: `var x: String = ""`
- Use signals for async communication between components
- All editor operations go through `EditorInterface` singleton
- Scene modifications must set `node.owner = root` for proper serialization
- Use `EditorUndoRedoManager` for undo/redo support (not yet implemented, planned)

### TypeScript (MCP Server)
- ESM modules (`"type": "module"` in package.json)
- `Node16` module resolution in tsconfig
- Use `@modelcontextprotocol/sdk` for MCP protocol
- Use `zod` for input validation in tool definitions
- Use native `fetch` (Node 22+) — no axios/node-fetch
- All file paths must be validated against project root (path traversal prevention)

## Key Design Decisions

1. **GodotForge never touches auth tokens.** MCP clients (Claude Code, Cursor) handle their own authentication. The plugin only stores an API key for native chat mode.

2. **HTTP bridge on localhost only.** The plugin's TCPServer binds to `127.0.0.1`, never `0.0.0.0`. No authentication needed on the local bridge.

3. **Port discovery via file.** Plugin writes its port to `.godot/godotforge.port`. MCP server reads it. If Godot isn't running, editor tools fail gracefully while local tools still work.

4. **Tool definitions are duplicated.** `claude_tools.gd` (GDScript) and `tools.ts` (TypeScript) both define tools. When adding a new tool, update BOTH files. The GDScript version is the source of truth for the plugin; the TypeScript version is what MCP clients see.

5. **GDScript puro.** No C#, no GDExtensions, no external dependencies in the plugin. This ensures compatibility with all Godot 4.x builds (including non-.NET).

## Adding a New Tool

1. **Create handler** in `addons/godotforge/tools/` (or add to existing file):
   ```gdscript
   func _my_tool(input: Dictionary) -> Dictionary:
       # ... execute via EditorInterface ...
       return {"result": "Success message."}  # or {"result": "Error", "is_error": true}
   ```

2. **Register** in `tools/tool_registry.gd` → `_register_defaults()`:
   ```gdscript
   register("my_tool", handler_instance)
   ```

3. **Add definition** to `api/claude_tools.gd` → `get_tool_definitions()`:
   ```gdscript
   {"name": "my_tool", "description": "...", "input_schema": {...}}
   ```

4. **Mirror in MCP** — add to `mcp-server/src/tools.ts` TOOLS array and register in `server.ts`:
   ```typescript
   server.tool("my_tool", "description", { param: z.string() },
     async (args) => editorTool(bridge, "my_tool", args)
   );
   ```

5. **Test**: `curl -X POST http://localhost:6970/tools/my_tool -d '{"param":"value"}'`

## Building & Testing

### MCP Server
```bash
cd mcp-server
npm install
npm run build          # tsc → dist/
npm start              # Run with stdio transport

# Test with Claude Code:
claude mcp add godotforge -- node /path/to/mcp-server/dist/index.js
```

### Plugin
1. Copy `addons/godotforge/` into a Godot 4.x project
2. Enable in Project → Project Settings → Plugins → GodotForge
3. HTTP server starts automatically on port 6970
4. Test: `curl http://localhost:6970/health`

## HTTP API Reference (Plugin)

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/health` | — | `{"status":"ok","godot_version":"4.4.0",...}` |
| GET | `/tools` | — | `{"tools":[...tool definitions...]}` |
| POST | `/tools/{name}` | JSON input | `{"result":"..."}` or `{"result":"...","is_error":true}` |
| GET | `/context/scene` | — | `{"result":"scene tree text"}` |
| GET | `/context/project` | — | `{"project_name":"...","scenes":[...],...}` |

## Common Pitfalls

- **`node.owner` must be set** — when adding nodes via code, always set `new_node.owner = root`, otherwise the node won't be saved with the scene.
- **`FileAccess` vs `ResourceLoader`** — use `FileAccess` for reading/writing raw text. Use `ResourceLoader.load()` for loading Godot resources (.tscn, .tres, .gd as Script).
- **`@tool` is required** — every GDScript file in the plugin must have `@tool` at the top, or it won't execute in the editor.
- **`EditorInterface` is a singleton** — access it directly as `EditorInterface`, not through `editor_interface` variable (Godot 4.x).
- **`_process()` for HTTP polling** — the TCPServer poll runs on the main thread in `_process()`. This is intentional — tool execution needs main thread access for EditorInterface.
- **Port file cleanup** — if Godot crashes, the port file may be stale. The MCP bridge should handle connection errors and retry with a fresh port read.

## Completed Features

- **Docs Engine** (Phase 3): SQLite FTS5, 912 Godot classes indexed, `search_docs` + `get_class_reference` tools, auto-download from GitHub, version-aware (4.1-4.6)

## Next: Memory & Context (Phase 4)

Inspired by OpenClaw's memory architecture:

- **Project Memory**: `res://.godotforge/memory.md` — persistent facts (conventions, patterns, decisions)
- **Session Logs**: `res://.godotforge/sessions/YYYY-MM-DD.md` — daily append-only logs
- **Memory Tools**: `save_memory`, `search_memory`, `get_project_memory` (FTS5, reuses docs infra)
- **Context Builder**: project scanner + token-budgeted injection (8000 token cap)
- **Compaction**: summarize old messages, flush decisions to memory, keep recent messages

## Planned Features (Phase 5+)

- **Advanced Editor Tools**: remove_node, edit_script, rename_node, duplicate_node, move_node
- **Runtime Tools**: run_game, stop_game, take_screenshot, input simulation
- **Streaming**: SSE-based streaming responses in native chat panel
- **Undo/Redo**: EditorUndoRedoManager integration for all tool operations
- **SSE Transport**: MCP server SSE mode for web-based MCP clients

## Related Docs

- `docs/godotforge-prd.md` — Full product requirements
- `docs/godotforge-concept-brief.md` — Business model, personas, monetization
- `docs/godotforge-opportunity-map.md` — Market research, competitors
