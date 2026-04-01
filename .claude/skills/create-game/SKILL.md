---
name: create-game
description: Create a complete game from a description — orchestrates design, asset acquisition, scene building, scripting, audio, and polish using 154+ tools across Godot, Blender, and AI services.
user_invocable: true
---

# /create-game [description]

Orchestrate the full game creation pipeline. Each phase has a **checkpoint** — verify completion before advancing.

---

## Phase 1: Design Document
**Goal:** Define what we're building before touching any tool.

1. Parse the game description (genre, 2D vs 3D, mechanics, theme)
2. Create a **Game Design Document** following the 8-section standard (`game-design-docs` rule):
   - Overview, Player Fantasy, Detailed Rules, Formulas, Edge Cases, Dependencies, Tuning Knobs, Acceptance Criteria
3. Define game parameters as `@export` values (speeds, sizes, timings, health, damage)
4. List all required **input actions** (move, jump, attack, interact, pause)

**Checkpoint:** Present GDD summary to user. Do NOT proceed without approval.

---

## Phase 2: Asset Manifest
**Goal:** List every asset the game needs before acquiring any.

Generate an **Asset Manifest** table:

| Asset | Type | Source | Priority |
|-------|------|--------|----------|
| floor_stone | PBR texture | ambientCG or Stability AI | Must |
| sword_swing | SFX | Freesound | Must |
| pickup_coin | SFX | jsfxr | Must |
| dungeon_music | Music | Suno | Should |
| chest | 3D model | Blender or Tripo AI | Must |
| npc_greeting | Voice | ElevenLabs | Nice |

**Source selection logic (auto-updated from tool registry):**
- **PBR textures:** {{TEXTURE_SERVICES}}
- **3D models:** {{MODEL_3D_SERVICES}}
- **Sound effects:** {{AUDIO_SFX_SERVICES}}
- **Music:** {{AUDIO_MUSIC_SERVICES}}
- **Voice:** {{AUDIO_VOICE_SERVICES}}
- **Sprites/2D:** OpenGameArt (`assets.search_opengameart`) → {{IMAGE_GEN_SERVICES}}
- **HDRIs/Skyboxes:** Poly Haven (`assets.search_polyhaven`) → ambientCG (`assets.search_ambientcg` type=HDRI)
- **Addons:** Godot Asset Library (`assets.search_godot_library`)
- **Asset search (all):** {{ASSET_SEARCH_SERVICES}}

**Checkpoint:** Present manifest. User approves asset list + sources.

---

## Phase 3: Project Setup
**Goal:** Godot project ready to receive content.

1. `set_project_setting` — window size, main scene, physics settings
2. Create directory structure:
   ```
   scenes/
   scripts/
   assets/models/
   assets/textures/
   assets/audio/sfx/
   assets/audio/music/
   assets/audio/voice/
   assets/ui/
   ```
3. Create autoloads if needed (GameManager, EventBus, AudioManager)
4. Define input actions via `set_project_setting`
5. Define collision layers and masks (document them)

**Checkpoint:** `get_project_context` confirms structure.

---

## Phase 4: Asset Acquisition
**Goal:** Download/generate all assets from the manifest.

Execute in this order (dependencies first):

### 4a. Textures & Materials
- `assets.search_ambientcg` + `assets.download_ambientcg` — PBR materials (brick, stone, wood, metal)
- `assets.search_polyhaven` + `assets.download_polyhaven` — additional textures, HDRIs
- `ai.huggingface_text_to_image` or `ai.stability_generate_core` — custom textures not found in libraries

### 4b. 3D Models (if 3D game)
- **Blender pipeline:** `blender.create_mesh` → `blender.create_material` → `blender.assign_material` → `blender.unwrap_uv` → `pipeline.blender_to_godot`
- **Animated models:** `blender.create_armature` → `blender.add_bone` → `blender.create_animation` → `pipeline.blender_to_godot_animated`
- **AI generation (if configured):** `ai.tripo_text_to_3d`, `ai.meshy_text_to_3d`, `ai.fal_trellis`
- **Download:** `assets.search_sketchfab` + `assets.download_sketchfab`

### 4c. 2D Assets (if 2D game)
- `assets.search_opengameart` — sprites, tilesets
- `ai.huggingface_text_to_image` — custom sprites/UI elements
- `assets.download_asset` — generic URL download for found assets

### 4d. Sound Effects
- `assets.generate_sfx` — retro SFX (jump, pickup, hit, explosion, laser, powerup)
- `assets.search_freesound` + `assets.preview_freesound` — realistic SFX (footsteps, ambient, doors)

### 4e. Music
- `ai.suno_generate` — background music (specify genre, mood, tempo in prompt)

### 4f. Voice (optional)
- `ai.elevenlabs_tts` — NPC dialogue, narrator
- `ai.elevenlabs_list_voices` — browse available voices

### 4g. Addons (optional)
- `assets.search_godot_library` — state machines, shaders, UI components

**Checkpoint:** `assets.list_local` confirms all manifest assets are present. List any missing items.

---

## Phase 5: Scene Building
**Goal:** Assemble the game world.

### 5a. Main Scene
- `create_scene` — root node (Node3D for 3D, Node2D for 2D)
- Camera setup (follow player, proper zoom/FOV)
- Lighting (DirectionalLight3D + ambient, or CanvasModulate for 2D)
- Environment (WorldEnvironment with HDRI sky, fog, tonemap)

### 5b. Level Layout
- `add_node` — place floors, walls, obstacles, spawn points
- `set_property` — positions, scales, materials
- `add_scene_instance` — instance imported 3D models
- `add_resource` — collision shapes (BoxShape3D, CapsuleShape3D)
- `connect_signal` — wire interactive objects (doors, buttons, pickups)

### 5c. Player
- CharacterBody3D/CharacterBody2D with CollisionShape
- Camera as child (3D) or follow script (2D)
- Mesh/Sprite child with imported asset

### 5d. Enemies/NPCs
- Separate scene per enemy type
- NavigationAgent for pathfinding
- Area3D/Area2D for detection range

### 5e. UI (HUD)
- CanvasLayer → Control → HBoxContainer
- Labels for score, health, ammo
- PauseMenu scene

**Checkpoint:** `get_scene_tree` confirms hierarchy. `take_screenshot` for visual validation.

---

## Phase 6: Scripting
**Goal:** Make it playable.

Follow `gdscript-standards` and `gameplay-code` rules:
- `create_script` + `edit_script` for all game logic
- ALL values via `@export` (never hardcoded)
- State machine for game flow: MENU → PLAYING → PAUSED → GAME_OVER
- Input via `Input.is_action_pressed()` (never raw key codes)
- Signals for upward communication (player_hit, item_collected, enemy_died)
- `delta` for all time-dependent calculations

**Scripts needed (typical):**
- `player.gd` — movement, input, health
- `enemy.gd` — AI (patrol, chase, attack), navigation
- `game_manager.gd` — autoload, score, lives, game state
- `pickup.gd` — collectibles, powerups
- `hud.gd` — UI updates via signals
- `main_menu.gd` — start, quit
- `audio_manager.gd` — autoload, play SFX/music by name

**Checkpoint:** `run_scene` + `get_game_status` confirms game starts without crash. `get_editor_errors` checks for warnings.

---

## Phase 7: Audio Integration
**Goal:** Wire all audio to gameplay events.

1. Add AudioStreamPlayer nodes (BGM) and AudioStreamPlayer3D/2D (positional SFX)
2. Load downloaded audio files via `add_resource`
3. Wire to gameplay events via signals:
   - player_jumped → play jump.wav
   - item_collected → play pickup_coin.wav
   - enemy_died → play explosion.wav
   - level_started → play background music
4. Audio bus layout: Master → Music (with volume), Master → SFX

**Checkpoint:** `run_scene` — confirm audio plays on events.

---

## Phase 8: Polish
**Goal:** Make it feel good.

- Apply `/game-polish` skill (particles, screen shake, tweens, visual feedback)
- Smooth camera (lerp follow, dead zone)
- UI animations (score pop, health bar tween, fade transitions)
- Post-processing (3D: bloom, ambient occlusion, SSAO; 2D: CanvasModulate)
- Loading/transition screens

**Checkpoint:** `take_game_screenshot` during gameplay. Visual quality check.

---

## Phase 9: Validation
**Goal:** Confirm the game works end-to-end.

1. `run_scene` — start the game
2. `simulate_input_sequence` — automated playtest (move, interact, attack)
3. `take_game_screenshot` — capture gameplay
4. `get_runtime_state` — check positions, visibility, scores
5. `get_editor_errors` — no errors/warnings
6. `stop_scene`

**Acceptance criteria** (from GDD Phase 1):
- Game starts without errors
- Core loop works (move → interact → score → progress)
- Win/lose condition triggers
- Restart works
- Audio plays on correct events
- No visual glitches in screenshots

---

## Output

Report:
1. **What was built** — scenes, scripts, assets used
2. **Assets acquired** — source for each (ambientCG, Freesound, jsfxr, Blender, AI)
3. **Tools used** — count of tool calls by category
4. **Known issues** — anything incomplete or requiring manual fix
5. **How to play** — controls and objective
