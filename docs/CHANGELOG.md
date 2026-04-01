# GodotForge Changelog

## V1 (Godot Copilot)
- **Phase 1-8**: 32 Godot tools, docs engine (912 classes FTS5), memory engine, context builder, runtime tools, MCP server with dual transport (stdio + HTTP)
- **Refactoring**: Unified MCP backend (plugin is thin client)
- **Demo**: Flappy Bird game created entirely via tools (demo/)

## V2 (Game Dev Hub)
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
- **Phase H doc templates**: 25 game dev templates in `.claude/templates/`
- **Phase I specialized agents**: 20 agents in `.claude/agents/` — 7 engineering + 4 design + 3 art/audio + 3 narrative + 3 QA
- **Phase J team orchestration**: 7 multi-agent pipeline skills
- **Phase K production skills**: 6 production skills — /milestone-review, /retrospective, /estimate, /gate-check, /localize, /map-systems
- **Web Polish**: Config JSON editor, connection status, service tabs (6 categories, 12 services)
- **Auto-Provision**: Godot plugin auto-copied to project on create/switch, Blender addon auto-installed on startup
- **Studio Integration**: MCP copilot reads .claude/ (rules, skills, agents, templates). HTTP endpoints: /skills, /agents, /templates
- **SSE Streaming**: POST /chat/stream returns Server-Sent Events
- **Agent Isolation**: POST /chat/agent runs isolated LLM call with agent-specific system prompt
- **Guardrails**: Server-side tool validation — 4 risk levels, content scanning, root node protection
- **Event Log**: JSONL audit log (.godotforge/events.jsonl) — 10MB rotation x 3
- **Webhooks**: Telegram + Custom (raw JSON). Configurable per event. 3 retries with backoff
- **Continuation**: max_tokens 16384 + auto-continuation on truncation (max 3 rounds)
- **Session persistence**: SQLite per-project sessions, 7-day TTL, write-through
- **Onboarding wizard**: 5-step first-time setup
- **Project switcher**: Header dropdown with recent projects
- **Settings page**: Full-screen 2-column grid + tabbed API keys + config editor
- **Guardrail Modes**: yolo/normal/strict permission levels
- **Per-project Chat Context**: Messages and sessions isolated per project
- **Scroll Virtualization**: @tanstack/react-virtual for chat messages
- **Dungeon of Echoes Demo**: Top-down 2D RPG demo built entirely via 30+ tools
- **Phase D — AI Generators**: 10 direct AI services + fal.ai gateway = 55 AI tools
- **Phase D2 — Asset Library Expansion**: +8 asset tools (ambientCG, Godot Asset Library, Freesound, jsfxr)
- **File Browser**: Tree view + preview panel + CodeMirror 6 editor + WebSocket live updates
- **Active Project Sync**: ~/.godotforge/active-project shared file
- **Issue 001**: MCP Streamable HTTP transport at /mcp endpoint
- **Issue 002**: Async task registry + exponential backoff polling
- **Issue 003**: AES-256-GCM key encryption + Bearer auth + rate limiting + CORS
- **Issue 004**: SQLite session persistence with write-through

## E2E Validations
- Flappy Bird (2D game, 32 Godot tools)
- Red metallic cube (Blender → GLB → Godot 3D scene)
- Rigged robot character (armature + walk animation + collision → Godot)
- Poly Haven textured scene (PBR textures + Blender rocks → Godot)
- Phase D AI Generators — 6 services validated E2E, 3 auth-only, 3 require paid
