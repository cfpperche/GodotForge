# Examples — /create-game

## Example 1: 3D Dungeon Crawler (Happy Path)

**Input:** `/create-game A first-person dungeon crawler with torch-lit corridors, a key-and-door puzzle, one skeleton enemy, and a treasure chest`

**Expected behavior:**
1. Phase 0: Create project `dungeon-crawler/` with full directory structure
2. Phase 1: GDD with FPS mechanics, torch lighting, skeleton AI (patrol → chase), key-door puzzle
3. Phase 2: Manifest: stone_wall (ambientCG), torch_model (Blender), skeleton (Blender + armature), chest (Blender), key (Blender), footsteps (Freesound), sword_swing (Freesound), pickup (jsfxr), dungeon_music (Suno)
4. Phase 4: Download stone textures from ambientCG, model torch/chest/key in Blender, generate SFX
5. Phase 5: Build dungeon room with Node3D root, DirectionalLight3D, WorldEnvironment
6. Phase 6: player.gd (FPS controller), skeleton.gd (AI with NavigationAgent3D), game_manager.gd
7. Phase 9: Game runs, player moves with WASD, skeleton chases when near

**Failure indicators:**
- Assets saved outside project directory
- No docs/gdd.md file created
- Skeleton has no navigation (just stands still)
- Hardcoded speed values in scripts

## Example 2: 2D Platformer (Minimal)

**Input:** `/create-game Simple 2D platformer with jump, coins, and spikes`

**Expected behavior:**
1. Phase 0: Create project `platformer/`
2. Phase 1: GDD with platformer mechanics (gravity, jump height, coyote time)
3. Phase 2: Manifest: player_sprite (OpenGameArt or HuggingFace), coin (jsfxr pickup), spike (simple mesh), tileset (OpenGameArt)
4. Phase 5: CharacterBody2D player, TileMap for level, Area2D for coins/spikes
5. Phase 6: @export var jump_force, gravity, speed — all tunable

**Failure indicators:**
- Uses Node3D for a 2D game
- No TileMap (everything placed as individual nodes)
- Jump feels wrong (no coyote time or jump buffer mentioned in GDD)

## Example 3: Edge Case — No AI Services Configured

**Input:** `/create-game A space shooter with procedural enemies`

**Expected behavior with no API keys:**
1. Phase 2: Manifest sources fallback to free services only (ambientCG, Poly Haven, OpenGameArt, jsfxr, Godot Asset Library)
2. Phase 4: No Suno/ElevenLabs/Stability calls — uses jsfxr for all SFX, skips music/voice
3. Manifest marks music/voice as "nice-to-have, skipped (no API key)"
4. Game still fully playable without AI-generated content

**Failure indicators:**
- Tries to call ai.suno_generate without key → error
- Game crashes because audio files are missing
- Manifest says "Suno" but key isn't configured

## Counter-Example: Bad Skill Execution

**Input:** `/create-game RPG`

**What should NOT happen:**
- Skip Phase 1 (no GDD) and jump to coding
- Make assumptions about RPG type (turn-based? action? top-down? isometric?)
- Create 50 scripts without user approval
- Download 200MB of assets without manifest approval

**What SHOULD happen:**
- Phase 1: Ask clarifying questions — "What kind of RPG? Turn-based or action? Top-down or first-person? What's the setting?"
- Wait for user response before proceeding
