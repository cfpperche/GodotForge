---
name: create-game
description: "Create a complete game from a description — full SDLC pipeline from design document through asset acquisition, scene building, scripting, audio, polish, and validation. Orchestrates 154+ tools across Godot Engine (28 editor tools), Blender (39 modeling + 4 pipeline), Asset Services (15 tools), and AI Generators (55 tools). Use when: user wants to create a new game, build a game from scratch, make a game demo, or prototype a game idea."
user_invocable: true
---

# /create-game [description]

Full game creation pipeline — 10 phases with gates. Every phase produces artifacts saved to disk. No phase proceeds without passing its gate.

## Progress Checklist

Copy and track:

```
- [ ] Phase 0: Project Setup (create/select project, directory structure)
- [ ] Phase 1: Game Design Document (docs/gdd.md) → USER APPROVAL GATE
- [ ] Phase 2: Asset Manifest (docs/asset-manifest.md) → USER APPROVAL GATE
- [ ] Phase 3: Engine Setup (settings, inputs, autoloads, collision layers)
- [ ] Phase 4: Asset Acquisition (download/generate all manifest items)
- [ ] Phase 5: Scene Building (levels, player, enemies, UI)
- [ ] Phase 6: Scripting (gameplay code, state machines, AI)
- [ ] Phase 7: Audio Integration (wire SFX/music to events)
- [ ] Phase 8: Polish (juice, particles, camera, transitions)
- [ ] Phase 9: Validation (run, playtest, screenshot, error check)
```

---

## Phase 0: Project — 🔒 Low freedom: exact structure required

Create or select the Godot project.

1. Ask user: **"Create new project or use existing?"**
   - New: create directory, initialize `project.godot` via `set_project_setting`
   - Existing: confirm project path, switch to it
2. Create directory structure:
   ```
   docs/           ← SDLC documents (GDD, manifest, TDD)
   scenes/         ← .tscn files
   scripts/        ← .gd files
   assets/textures/ assets/models/ assets/audio/sfx/
   assets/audio/music/ assets/audio/voice/ assets/ui/
   ```
3. Save `docs/project-brief.md` — one-paragraph summary of what we're building

**Gate:** `get_project_context` returns valid project. `list_files` confirms directory structure. Active project points here.

---

## Phase 1: Game Design Document — 🔓 Medium freedom: follow 8-section standard, content varies by game

Generate GDD following the `game-design-docs` rule (8 mandatory sections).

1. Parse the game description — identify: genre, 2D vs 3D, core mechanic, theme, art style
2. If description is vague, **ask clarifying questions** before writing (see references/examples.md counter-example)
3. Write `docs/gdd.md` via `create_script` with:
   - Overview + vision statement
   - Player Fantasy (MDA aesthetics)
   - Detailed Rules (precise mechanics, not hand-waving)
   - Formulas (damage, speed, gravity — with ranges)
   - Edge Cases (what happens when X?)
   - Dependencies (system interactions)
   - Tuning Knobs (all @export values with safe ranges)
   - Acceptance Criteria (testable conditions for Phase 9)
4. Include: input action list, collision layer assignments, game state diagram

**Gate:** `read_file` confirms `docs/gdd.md` exists with all 8 sections. Present summary to user. **Do NOT proceed without user approval.**

---

## Phase 2: Asset Manifest — 🔓 Medium freedom: format is fixed, content varies by game

Derive every asset the game needs from the GDD.

1. Write `docs/asset-manifest.md` via `create_script` with this table:

```markdown
| Asset | Type | Source | Priority | Status |
|-------|------|--------|----------|--------|
| stone_floor | PBR texture | ambientCG | Must | pending |
| player_model | 3D model | Blender | Must | pending |
| sword_swing | SFX | Freesound | Must | pending |
| pickup_coin | SFX | jsfxr | Must | pending |
| dungeon_theme | Music | Suno | Should | pending |
```

2. Source selection (resolved from tool registry at runtime):
   - **PBR textures:** {{TEXTURE_SERVICES}}
   - **3D models:** {{MODEL_3D_SERVICES}}
   - **Sound effects:** {{AUDIO_SFX_SERVICES}}
   - **Music:** {{AUDIO_MUSIC_SERVICES}}
   - **Voice:** {{AUDIO_VOICE_SERVICES}}
   - **2D sprites/images:** {{IMAGE_GEN_SERVICES}}
   - **Addons:** Godot Asset Library (`assets.search_godot_library`)

3. Check `get_service_status` — if a source service has no API key, fallback to free alternatives. Mark skipped items as "nice-to-have, skipped (no key)"

**Gate:** `read_file` confirms `docs/asset-manifest.md` exists. All "Must" assets have a source. Present manifest to user. **Do NOT proceed without user approval.**

---

## Phase 3: Engine Setup — 🔒 Low freedom: exact settings required

Configure Godot project settings from GDD.

1. `set_project_setting` — window size, stretch mode, main scene path
2. `set_project_setting` — register all input actions from GDD (move_left, move_right, jump, attack, interact, pause)
3. Document collision layers (from GDD): `set_project_setting` for layer names
4. Create autoloads via `create_script`:
   - `scripts/game_manager.gd` — game state, score, lives (@export values from GDD)
   - `scripts/event_bus.gd` — signal hub (player_hit, item_collected, enemy_died, level_completed)
   - `scripts/audio_manager.gd` — play SFX/music by name

**Gate:** `get_project_context` shows autoloads registered. `read_script` confirms game_manager.gd has @export values matching GDD tuning knobs.

---

## Phase 4: Asset Acquisition — 🟢 High freedom: order and tools vary by manifest

Execute the asset manifest. Update status column as each asset is acquired.

### 4a. Textures & Materials
- Search and download from free services first (ambientCG, Poly Haven)
- Generate custom textures if not found (Stability AI, Hugging Face)
- For each downloaded asset, update manifest status → "acquired"

### 4b. 3D Models (if 3D game)
- **Blender pipeline:** `blender.create_mesh` → materials → UV → `pipeline.blender_to_godot`
- **Animated:** add armature, bones, animation → `pipeline.blender_to_godot_animated`
- **AI generation** (if keys available): Tripo, Meshy, fal.ai Trellis
- **Download:** Sketchfab search + download

### 4c. 2D Assets (if 2D game)
- OpenGameArt search, Hugging Face SDXL generate, generic download

### 4d. Sound Effects
- `assets.generate_sfx` for retro SFX (instant, free) — jump, pickup, hit, explosion
- `assets.search_freesound` + `assets.preview_freesound` for realistic SFX

### 4e. Music (if keys available)
- `ai.suno_generate` — specify genre, mood, tempo from GDD art direction

### 4f. Voice (if keys available)
- `ai.elevenlabs_tts` — NPC dialogue lines from GDD

### 4g. Update manifest
- Rewrite `docs/asset-manifest.md` with all statuses updated

**Gate:** `assets.list_local` confirms all "Must" assets present. `read_file` on manifest shows no "Must" items with status "pending".

---

## Phase 5: Scene Building — 🔓 Medium freedom: hierarchy patterns are standard, layout is creative

Build the game world from acquired assets.

### 5a. Main Scene
- `create_scene` — root: Node3D (3D) or Node2D (2D)
- Camera: Camera3D with follow script (3D) or Camera2D with smoothing (2D)
- Lighting: DirectionalLight3D + WorldEnvironment (3D) or CanvasModulate (2D)

### 5b. Level Layout
- `add_node` + `set_property` — floors, walls, obstacles, spawn points
- `add_scene_instance` — imported models/scenes
- `add_resource` — collision shapes (BoxShape3D, CapsuleShape3D)
- Follow `scene-architecture` rule: shallow hierarchy (max 4-5 levels), node.owner = root

### 5c. Player
- CharacterBody3D/2D + CollisionShape + Mesh/Sprite child
- Camera as child (3D) or follow target (2D)

### 5d. Enemies/NPCs (separate scenes)
- NavigationAgent for pathfinding
- Area3D/2D for detection range
- Follow `ai-code` rule: perception → decision → action separation

### 5e. HUD
- CanvasLayer → Control hierarchy
- Labels for score/health, follow `ui-code` rule

**Gate:** `get_scene_tree` confirms hierarchy. `take_screenshot` for visual check. Scene must have: root, camera, light, player, at least one level element.

---

## Phase 6: Scripting — 🔓 Medium freedom: patterns are standard, logic varies by game

Write gameplay code. Follow `gdscript-standards` and `gameplay-code` rules strictly.

1. `create_script` for each system (one script per responsibility):
   - `player.gd` — movement, input (@export speed, jump_force, gravity)
   - `enemy.gd` — AI state machine (IDLE → PATROL → CHASE → ATTACK), NavigationAgent
   - `game_manager.gd` — already created, add state machine (MENU → PLAYING → PAUSED → GAME_OVER)
   - `pickup.gd` — Area.body_entered → emit signal → queue_free
   - `hud.gd` — connect to EventBus signals, update labels

2. Rules enforced:
   - ALL values via `@export` — zero hardcoded numbers
   - `delta` for all time-dependent logic
   - Input via `Input.is_action_pressed()` — never raw keycodes
   - Signals for upward communication
   - Static typing everywhere

**Gate:** `run_scene` succeeds (no crash). `get_editor_errors` shows zero errors. `get_game_status` confirms scene is running.

---

## Phase 7: Audio Integration — 🔒 Low freedom: wiring pattern is standard

Wire all audio to gameplay events.

1. Add AudioStreamPlayer nodes (BGM: non-positional, SFX: positional 2D/3D)
2. Load audio files via `add_resource` (AudioStreamMP3, AudioStreamWAV, AudioStreamOGG)
3. Wire via signals in audio_manager.gd:
   - EventBus.player_jumped → play jump SFX
   - EventBus.item_collected → play pickup SFX
   - EventBus.enemy_died → play death SFX
   - Level start → play BGM
4. Audio bus layout: Master → Music (volume control), Master → SFX

**Gate:** `run_scene` — audio plays on correct events. No orphan AudioStreamPlayer nodes.

---

## Phase 8: Polish — 🟢 High freedom: creative decisions

Delegate to `/game-polish` skill, then add:

1. Camera polish: lerp follow, dead zone, screen shake on impact
2. UI animations: score pop (tween scale), health bar (tween value), fade transitions
3. Particles: death, collection, movement trail
4. Post-processing (3D): bloom, ambient occlusion, tonemap
5. Post-processing (2D): CanvasModulate for mood

**Gate:** `take_game_screenshot` during gameplay. Visual quality acceptable.

---

## Phase 9: Validation — 🔒 Low freedom: exact verification steps

Run the acceptance criteria from GDD Phase 1.

1. `run_scene` — game starts
2. `get_game_status` — confirms running
3. `simulate_input_sequence` — automated playtest (move around, interact, attack)
4. `take_game_screenshot` — capture gameplay state
5. `get_runtime_state` — verify positions, scores, visibility
6. `get_editor_errors` — zero errors/warnings
7. `stop_scene`
8. Check each acceptance criterion from `docs/gdd.md`
9. Write `docs/validation-report.md` — what passed, what failed, known issues

**Gate:** All "Must" acceptance criteria pass. Game starts, core loop works, no crashes.

---

## Output

Final report:
1. **Game summary** — what was built, how to play (controls + objective)
2. **Assets used** — count by source (ambientCG: 3, Freesound: 2, jsfxr: 5, Blender: 4...)
3. **Documents created** — docs/gdd.md, docs/asset-manifest.md, docs/validation-report.md
4. **Tool calls** — count by category
5. **Known issues** — anything incomplete or needing manual fix
6. **Next steps** — suggested improvements (more levels, better AI, multiplayer...)

---

## References

- Anti-patterns: see `references/anti-patterns.md`
- Self-review checklist: see `references/checklist.md`
- Input/output examples: see `references/examples.md`

## Rules Referenced

- `game-design-docs` — 8-section GDD standard
- `gdscript-standards` — code style, naming, typing
- `gameplay-code` — @export values, delta time, input actions
- `scene-architecture` — hierarchy, composition, node.owner
- `ai-code` — NPC behavior, budget, LOD
- `ui-code` — UI architecture, accessibility
- `skill-authoring` — dynamic {{TAGS}} for service references

## Skills Referenced

- `/game-polish` — Phase 8 delegation
- `/game-review` — optional post-validation review

## Eval Scenarios

See `references/examples.md` for 3 eval scenarios + 1 counter-example.
