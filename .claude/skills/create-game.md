---
name: create-game
description: Create a complete game from a description — handles project setup, scene creation, scripts, assets, and polish.
user_invocable: true
---

# Create Game Skill

When the user invokes /create-game [description], orchestrate the full pipeline:

## Phase 1: Design (ask before implementing)
- Parse the game description
- Propose: genre, mechanics, art style, target platform
- Define game parameters (speeds, sizes, timings) as @export values
- Create a brief design doc following the 8-section standard (game-design-docs rule)
- Get user approval

## Phase 2: Project Setup
- Set project settings (window size, main scene, input actions)
- Create directory structure: scenes/, scripts/, assets/models/, assets/textures/
- Create autoloads if needed (GameManager, EventBus)

## Phase 3: Assets (parallel where possible)
- 3D games: Model in Blender (blender.create_mesh, materials, UV), export via pipeline
- 2D games: Search Poly Haven/OpenGameArt for sprites/textures, download
- Apply materials and textures to models
- Generate collision shapes

## Phase 4: Scene Building
- Create main scene with proper node hierarchy
- Add camera, lighting, environment
- Instance asset models/sprites
- Set up collision layers and masks
- Add UI (score, messages, menus)

## Phase 5: Scripting
- Create scripts following GDScript standards
- All gameplay values as @export (tunable)
- State machine for game flow (MENU → PLAYING → GAME_OVER)
- Input handling via Input actions
- Score, lives, restart logic

## Phase 6: Polish
- Apply /game-polish skill
- Add particle effects, screen shake, UI animations
- Audio hooks (even if sounds aren't generated yet)
- Smooth camera follow

## Phase 7: Test
- Run the scene (run_scene)
- Take screenshot (take_screenshot)
- Check for errors (get_editor_errors)
- Verify: game starts, core loop works, restart works, score counts

## Output
A playable game with all assets, scripts, and polish applied. Report what was created and any known issues.
