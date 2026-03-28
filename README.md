# GodotForge

**AI Copilot for Godot** — a native editor plugin + MCP server that lets you build games with AI assistance without leaving Godot.

24 tools. Version-aware docs. Persistent project memory. Zero hallucinations.

---

## 3 Ways to Use

### 1. Claude Code (Max/Pro plan)
```bash
claude mcp add godotforge -- npx godotforge-mcp@latest
```
Your Max subscription covers the AI. GodotForge just provides the tools.

### 2. Cursor
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "godotforge": {
      "command": "npx",
      "args": ["godotforge-mcp@latest"]
    }
  }
}
```

### 3. Native Chat (inside Godot)
1. Copy `addons/godotforge/` into your Godot project
2. Enable in **Project > Project Settings > Plugins > GodotForge**
3. Click **"API Key"** in the bottom panel, paste your Anthropic key
4. Start chatting: *"Create a CharacterBody2D scene for the player"*

---

## What It Can Do

### Editor Tools (12)
| Tool | Description |
|------|-------------|
| `create_scene` | Create .tscn files with any root node type |
| `open_scene` | Open a scene in the editor |
| `get_scene_tree` | View the node hierarchy of the current scene |
| `add_node` | Add child nodes to the scene tree |
| `remove_node` | Remove nodes from the scene |
| `rename_node` | Rename nodes |
| `duplicate_node` | Deep-copy nodes and their children |
| `move_node` | Reparent nodes to a new parent |
| `set_property` | Set any node property (position, scale, textures, etc.) |
| `create_script` | Create GDScript files and attach to nodes |
| `read_script` | Read GDScript file contents |
| `edit_script` | Edit scripts — full rewrite or find-and-replace |

### Runtime Tools (4)
| Tool | Description |
|------|-------------|
| `run_scene` | Run current, main, or any scene |
| `stop_scene` | Stop the running scene |
| `get_game_status` | Check if a scene is playing |
| `take_screenshot` | Capture the editor viewport |

### Documentation Tools (2)
| Tool | Description |
|------|-------------|
| `search_docs` | FTS5 search across 912 Godot classes — version-aware (4.1-4.6) |
| `get_class_reference` | Full class reference with methods, properties, signals |

### Memory Tools (3)
| Tool | Description |
|------|-------------|
| `save_memory` | Persist conventions, patterns, decisions to project memory |
| `search_memory` | Search over memory entries |
| `get_project_memory` | View full project memory |

### Utility Tools (3)
| Tool | Description |
|------|-------------|
| `get_project_context` | Project metadata — name, version, scenes, scripts |
| `read_file` | Read any file in the project |
| `list_files` | List project directories |

---

## Architecture

```
Claude Code / Cursor (MCP client)
        |  stdio
        v
GodotForge MCP Server (TypeScript)
  - 24 tools
  - Docs engine (SQLite FTS5)
  - Memory engine
  - Context builder
        |  HTTP localhost:6970
        v
Godot Plugin (GDScript)
  - HTTP server bridge
  - Editor tool execution
  - Native chat panel
```

The MCP server connects to the plugin's local HTTP server. Editor tools are executed inside Godot; docs, memory, and file tools run locally in the MCP server.

---

## Requirements

- **Godot** 4.1 - 4.6
- **Node.js** 22+ (for MCP server)
- **Claude API key** (for native chat mode only)

---

## Project Memory

GodotForge remembers your project across sessions:

```
.godotforge/
  memory.md       — conventions, patterns, decisions
  sessions/       — daily session logs
  memory.db       — FTS5 search index
  project-map.json — cached project structure
```

The AI uses this context to give project-aware responses instead of generic ones.

---

## Development

```bash
# Build MCP server
cd mcp-server
npm install
npm run build

# Run locally
claude mcp add godotforge -- node /path/to/mcp-server/dist/index.js --project-root /path/to/godot/project
```

---

## License

MIT
