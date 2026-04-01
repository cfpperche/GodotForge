---
name: create-game
description: "Create a complete game from a description — full SDLC pipeline from design document through asset acquisition, scene building, scripting, audio, polish, and validation. Orchestrates 154+ tools across Godot Engine (28 editor tools), Blender (39 modeling + 4 pipeline), Asset Services (15 tools), and AI Generators (55 tools). Use when: user wants to create a new game, build a game from scratch, make a game demo, or prototype a game idea."
user_invocable: true
---

# /create-game [description]

Full game creation pipeline — 10 phases with gates. Every phase produces artifacts saved to disk. No phase proceeds without passing its gate.

**CRITICAL: No shortcuts.** Every phase that references a rule, template, or Godot class MUST read the actual file/doc before producing content. Never rely on training data when project references exist.

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

**Gate:** `list_files` confirms directory structure. Active project points here.

---

## Phase 1: Game Design Document — 🔓 Medium freedom: follow template structure, content varies by game

### MANDATORY READS (do these BEFORE writing anything):
1. `read_file .claude/templates/game-design-document.md` — the GDD template with all sections
2. `read_file .claude/rules/game-design-docs.md` — the 8-section standard per gameplay system
3. `search_docs` for every Godot class the game will use (CharacterBody3D, NavigationAgent3D, Area3D, Camera3D, etc.) — verify class names, properties, and methods are correct for current Godot version

### Then write:
1. Parse the game description — identify: genre, 2D vs 3D, core mechanic, theme, art style
2. If description is vague, **ask clarifying questions** before writing (see references/examples.md)
3. Write `docs/gdd.md` following the **template structure** (10 sections from template, with 8-section standard applied to each gameplay system):
   - §1 Overview (vision, pillars)
   - §2 Gameplay (core loop, mechanics with 8 subsections each, progression, game states)
   - §3 World & Narrative (setting, characters)
   - §4 Level Design (level list, flow)
   - §5 Art Direction (style, camera, UI, VFX)
   - §6 Audio Design (music, SFX, ambience, voice)
   - §7 UI/UX (screen flow, HUD elements, input mapping)
   - §8 Technical Requirements (engine version, FPS target, platforms)
   - §9 Monetization (if applicable, or "N/A — demo")
   - §10 Appendices (links to art bible, sound bible if created)
4. Each gameplay system (movement, combat, puzzle, AI) MUST have the 8 subsections from the rule

**Gate:** `read_file docs/gdd.md` confirms file exists with all 10 sections. Each gameplay system has 8 subsections. Present summary to user. **Do NOT proceed without user approval.**

---

## Phase 2: Asset Manifest — 🔓 Medium freedom: format is fixed, content varies by game

### MANDATORY READS:
1. `get_service_status` — check which services have API keys configured
2. `read_file docs/gdd.md` sections §5 Art Direction and §6 Audio Design — derive asset needs from these

### Then write:
1. Write `docs/asset-manifest.md` with this table:

| Asset | Type | Source | Priority | Status |
|-------|------|--------|----------|--------|
| (name) | PBR texture / 3D model / SFX / Music / Voice / Sprite | (specific service) | Must / Should / Nice | pending |

2. Source selection (resolved from tool registry at runtime):
   - **PBR textures:** {{TEXTURE_SERVICES}}
   - **3D models:** {{MODEL_3D_SERVICES}}
   - **Sound effects:** {{AUDIO_SFX_SERVICES}}
   - **Music:** {{AUDIO_MUSIC_SERVICES}}
   - **Voice:** {{AUDIO_VOICE_SERVICES}}
   - **2D sprites/images:** {{IMAGE_GEN_SERVICES}}
   - **Addons:** Godot Asset Library (`assets.search_godot_library`)

3. If a source service has no API key (from step 1), fallback to free alternatives or mark as "skipped (no key)"

**Gate:** `read_file docs/asset-manifest.md` confirms file exists. All "Must" assets have a valid source (not a service without API key). Present manifest to user. **Do NOT proceed without user approval.**

---

## Phase 3: Engine Setup — 🔒 Low freedom: exact settings required

### MANDATORY READS:
1. `read_file docs/gdd.md` §7 UI/UX → input mapping table
2. `read_file docs/gdd.md` §8 Technical Requirements → window size, FPS target
3. `read_file .claude/rules/gameplay-code.md` — input action pattern
4. `read_file .claude/rules/gdscript-standards.md` — file structure standard

### Then configure:
1. `set_project_setting` — window size, stretch mode from GDD §8
2. `set_project_setting` — register ALL input actions from GDD §7 input mapping table
3. `set_project_setting` — collision layer names from GDD
4. Create autoloads via `create_script` following gdscript-standards file structure:
   - `scripts/game_manager.gd` — game state, score, @export values from GDD tuning knobs
   - `scripts/event_bus.gd` — signal hub for all gameplay events
   - `scripts/audio_manager.gd` — play SFX/music by name

**Gate:** `read_script scripts/game_manager.gd` confirms @export values match GDD tuning knobs. Input actions from GDD §7 all registered.

---

## Phase 4: Asset Acquisition — 🟢 High freedom: order and tools vary by manifest

### MANDATORY READS:
1. `read_file docs/asset-manifest.md` — the manifest drives this entire phase
2. `get_service_status` — confirm which services are available

### Then execute manifest line by line:

### 4a. Textures & Materials
- Search free services first (ambientCG, Poly Haven)
- Generate if not found (Stability AI, Hugging Face)
- Update manifest status → "acquired" after each download

### 4b. 3D Models (if 3D game)
- **Blender pipeline:** create_mesh → materials → UV → pipeline.blender_to_godot
- **Animated:** armature → bones → animation → pipeline.blender_to_godot_animated
- **AI generation** (if keys): Tripo, Meshy, fal.ai Trellis
- **Download:** Sketchfab search + download

### 4c. 2D Assets (if 2D game)
- OpenGameArt search, Hugging Face SDXL generate

### 4d. Sound Effects
- `assets.generate_sfx` for retro SFX (instant, free)
- `assets.search_freesound` + `assets.preview_freesound` for realistic SFX

### 4e. Music (if keys available)
- `ai.suno_generate` — genre/mood/tempo from GDD §6

### 4f. Voice (if keys available)
- `ai.elevenlabs_tts` — dialogue lines from GDD §3

### 4g. Update manifest
- Rewrite `docs/asset-manifest.md` with all statuses updated

**Gate:** `assets.list_local` confirms all "Must" assets present. `read_file docs/asset-manifest.md` shows no "Must" items with status "pending".

---

## Phase 5: Scene Building — 🔓 Medium freedom: hierarchy patterns are standard, layout is creative

### MANDATORY READS:
1. `read_file .claude/rules/scene-architecture.md` — hierarchy rules, node.owner, composition
2. `search_docs CharacterBody3D` (3D) or `search_docs CharacterBody2D` (2D) — verify node setup
3. `search_docs NavigationAgent3D` (if enemies with pathfinding)
4. `read_file docs/gdd.md` §4 Level Design — layout reference

### Then build:

### 5a. Main Scene
- `create_scene` — root: Node3D (3D) or Node2D (2D)
- Camera, lighting, environment per GDD §5 Art Direction

### 5b. Level Layout
- `add_node` + `set_property` — floors, walls, obstacles
- `add_scene_instance` — imported models
- `add_resource` — collision shapes
- Hierarchy: max 4-5 levels deep, node.owner = root always

### 5c. Player
- CharacterBody3D/2D + CollisionShape + Mesh/Sprite child

### 5d. Enemies/NPCs (separate scenes)
- NavigationAgent for pathfinding, Area3D for detection

### 5e. HUD
- CanvasLayer → Control hierarchy per GDD §7

**Gate:** `get_scene_tree` confirms hierarchy matches scene-architecture rule. `take_screenshot` for visual check.

---

## Phase 6: Scripting — 🔓 Medium freedom: patterns are standard, logic varies by game

### MANDATORY READS:
1. `read_file .claude/rules/gdscript-standards.md` — file structure, naming, typing
2. `read_file .claude/rules/gameplay-code.md` — @export, delta, input, state machines
3. `read_file .claude/rules/ai-code.md` — NPC behavior patterns (if enemies exist)
4. `search_docs` for any Godot API used in scripts (Input, NavigationAgent3D, Area3D, etc.)
5. `read_file docs/gdd.md` §2 Gameplay — mechanics with formulas and tuning knobs

### Then write:
1. `create_script` per system (one script per responsibility):
   - player.gd, enemy.gd, game_manager.gd, pickup.gd, hud.gd
2. ALL values via @export matching GDD tuning knobs — zero hardcoded numbers
3. `delta` for all time-dependent logic
4. `Input.is_action_pressed()` with named actions from GDD §7
5. Static typing everywhere

**Gate:** `run_scene` succeeds. `get_editor_errors` shows zero errors. `get_game_status` confirms running.

---

## Phase 7: Audio Integration — 🔒 Low freedom: wiring pattern is standard

### MANDATORY READS:
1. `read_file docs/gdd.md` §6 Audio Design — what sounds where
2. `read_file docs/asset-manifest.md` — which audio files were acquired and their paths
3. `assets.list_local` type=audio — confirm files exist on disk

### Then wire:
1. Add AudioStreamPlayer nodes (BGM non-positional, SFX positional)
2. Load audio files via `add_resource`
3. Wire to EventBus signals in audio_manager.gd
4. Audio bus: Master → Music, Master → SFX

**Gate:** `run_scene` — audio plays on correct events.

---

## Phase 8: Polish — 🟢 High freedom: creative decisions

### MANDATORY READS:
1. `read_file docs/gdd.md` §5 Art Direction — VFX style reference
2. Read `/game-polish` skill before delegating

### Then apply:
1. Delegate to `/game-polish`
2. Camera polish, UI animations, particles
3. Post-processing per art style (bloom, tonemap for 3D; CanvasModulate for 2D)

**Gate:** `take_game_screenshot` during gameplay. Visual quality acceptable.

---

## Phase 9: Validation — 🔒 Low freedom: exact verification steps

### MANDATORY READS:
1. `read_file docs/gdd.md` §2.2 each system's Acceptance Criteria
2. `read_file` references/checklist.md — self-review all phases

### Then verify:
1. `run_scene` — game starts
2. `simulate_input_sequence` — automated playtest
3. `take_game_screenshot` — capture gameplay
4. `get_runtime_state` — verify state
5. `get_editor_errors` — zero errors
6. `stop_scene`
7. Check each acceptance criterion from GDD
8. Write `docs/validation-report.md`

**Gate:** All "Must" acceptance criteria pass. Game starts, core loop works, no crashes.

---

## Do

- READ every referenced file BEFORE producing content
- SAVE every artifact to disk (docs/, scenes/, scripts/, assets/)
- VERIFY via tool calls (get_scene_tree, read_file, assets.list_local)
- ASK user when description is vague
- USE search_docs for every Godot class before writing code that uses it
- UPDATE asset manifest status after each acquisition

## Don't

- DON'T skip MANDATORY READS — ever
- DON'T use training data for Godot API — use search_docs
- DON'T hardcode gameplay values — use @export
- DON'T proceed past a gate that fails
- DON'T write code without reading gdscript-standards first
- DON'T assume asset services are available — check get_service_status
- DON'T write GDD from memory — read the template first

---

## Output

Final report:
1. **Game summary** — what was built, how to play
2. **Assets used** — count by source
3. **Documents created** — list all docs/ files
4. **References consulted** — list all rules/templates/docs read
5. **Known issues** — anything incomplete
6. **Next steps** — suggested improvements

---

## References

- Anti-patterns: `references/anti-patterns.md`
- Self-review checklist: `references/checklist.md`
- Input/output examples: `references/examples.md`

## Rules Referenced

- `game-design-docs` — 8-section standard per gameplay system
- `gdscript-standards` — code style, naming, typing
- `gameplay-code` — @export values, delta time, input actions
- `scene-architecture` — hierarchy, composition, node.owner
- `ai-code` — NPC behavior, budget, LOD
- `ui-code` — UI architecture, accessibility
- `skill-authoring` — dynamic {{TAGS}} for service references

## Templates Referenced

- `game-design-document.md` — 10-section GDD template (the actual document structure)

## Skills Referenced

- `/game-polish` — Phase 8 delegation
- `/game-review` — optional post-validation review

## Eval Scenarios

See `references/examples.md` for 3 eval scenarios + 1 counter-example.
