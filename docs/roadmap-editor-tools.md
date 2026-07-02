# Editor Tools Roadmap — Parity with godot-mcp-pro

**Inspiration source**: [youichi-uda/godot-mcp-pro](https://github.com/youichi-uda/godot-mcp-pro) — proprietary MCP server with 175 tools (v1.15.0, June 2026). We use its **public category taxonomy** as a gap map for GodotForge's editor tools. No code is copied — the plugin architecture (GDScript plugin + Node server) is already similar; only the tool surface is being expanded.

**Principle**: demand-driven. Tools are implemented when the MMORPG project (`~/MMORPG`) actually needs them, not speculatively. Until a dedicated tool exists, `execute_editor_script` is the escape hatch — it can do almost everything below, at the cost of reliability and ergonomics.

**Current state**: 28 editor tools (scene, node, script, runtime, editor categories). See `mcp-server/src/server.ts`.

## Gap map (by priority for the MMORPG)

| Priority | Category | Tools to add (godot-mcp-pro has) | Game trigger |
|----------|----------|----------------------------------|--------------|
| **P1** | Navigation (6) | NavigationRegion/Agent setup, **navmesh baking**, nav layers, nav info | Milestone 1 — click-to-move + navmesh per chunk |
| **P1** | Physics (6) | Physics body config, collision shape setup, layer/mask management, collision info, RayCast addition | Milestone 1 — combat hitboxes, mob collision |
| **P2** | Animation (6) | Create/list animations, track management, keyframe insertion, animation info/removal | First animated characters (KayKit rigs) |
| **P2** | AnimationTree (4) + State Machine (3) + BlendTree (1) | Tree creation/params, state machine states/transitions, blend nodes | Walk/attack/death blending |
| **P2** | Profiling (2) | Performance monitor access, perf summary | Open-world frame budget (chunk streaming) |
| **P3** | Testing/QA (6) | Node state assertions, screen text verification, **screenshot comparison**, stress testing, test scenario execution, reports | QA loop hardening — we observe well but can't assert |
| **P3** | Runtime extras | Property monitoring, input recording/replay, find node by screen position, UI element interaction | Playtesting automation |
| ~~Done~~ | Positioned mouse clicks | `mouse_click` step in `simulate_input_sequence` (x/y, button, double_click) — needed for click-to-move QA | Shipped 2026-07-02 (MMORPG milestone 1) |
| **P3** | Batch/Refactoring (8) | Scene dependency analysis, cross-scene property updates, find references, circular dependency detection, batch property set | Project grows past ~50 scenes |
| **P4** | Shader (6) | Shader create/read/edit, ShaderMaterial assignment, parameters | Custom water/grass/toon shaders |
| **P4** | Particle (5) | GPUParticles creation, ProcessMaterial config, gradients, presets | Skill VFX |
| **P4** | Audio (6) | AudioStreamPlayer addition, bus management, bus effects | Audio mixing pass |
| **P4** | 3D Scene helpers (6) | Camera3D setup, lighting, WorldEnvironment, GridMap, StandardMaterial3D | Convenience (doable via add_node + set_property today) |
| **P4** | Theme/UI (6) | Theme creation, color/constant/font/stylebox overrides | UI polish phase |
| **P4** | Export (3) | Preset listing, export command generation | First release build |
| **P4** | Resource extras | Resource preview generation, autoload add/remove | Convenience |
| **P4** | Analysis (4) | Scene complexity analysis, signal flow mapping, unused resource detection, project stats | Tech-debt passes |
| Skip | TileMap (6) | — | 2D only; irrelevant for this project |

## Non-tool ideas worth adopting

- **Tool modes** (godot-mcp-pro ships Full 175 / 3D 103 / Lite 84 / Minimal 35): GodotForge already has 152 tools and hits MCP client tool limits — a `--tools <profile>` flag selecting subsets would help stdio clients.
- **Input action listing/modification** as dedicated tools (today only via `set_project_setting`).

## Dogfooding findings (MMORPG, 2026-07-02)

Gaps observed while play-testing the game via tools — backlog, not yet triaged into the table:

- **Game stdout/print capture**: `print()` from the running game is not reachable (`get_editor_errors` reads the editor log only). A `get_game_log` tool would make runtime debugging far faster.
- **`get_runtime_state` velocity always `(0,0,0)`** for CharacterBody3D even mid-movement — likely sampled outside the physics frame. Position works.
- **`take_game_screenshot` ignores `output_path`** — always writes `res://.godotforge/game_screenshot.png`.

## Process

1. When the game hits a trigger, implement the category following `CLAUDE.md → Adding a New Editor Tool`.
2. Mark the row done here with the release/commit.
3. Re-check godot-mcp-pro's public changelog occasionally for new categories worth mapping.
