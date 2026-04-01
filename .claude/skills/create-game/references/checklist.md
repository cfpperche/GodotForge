# Self-Review Checklist — /create-game

## Phase 0: Project
- [ ] Project directory exists with project.godot
- [ ] Active project switched (active-project file points here)
- [ ] docs/ directory created
- [ ] Directory structure: scenes/, scripts/, assets/textures/, assets/models/, assets/audio/sfx/, assets/audio/music/, assets/audio/voice/, assets/ui/

## Phase 1: GDD
- [ ] docs/gdd.md exists as real file
- [ ] Contains all 8 sections (Overview, Player Fantasy, Rules, Formulas, Edge Cases, Dependencies, Tuning Knobs, Acceptance Criteria)
- [ ] All gameplay values defined with ranges
- [ ] Input actions listed
- [ ] User approved the design

## Phase 2: Asset Manifest
- [ ] docs/asset-manifest.md exists as real file
- [ ] Every asset has: name, type, source service, priority, status
- [ ] No "TBD" sources — each asset mapped to a specific service
- [ ] Must-have assets identified (game won't work without these)

## Phase 3: Project Setup
- [ ] Window size configured
- [ ] Input actions registered in project settings
- [ ] Collision layers defined and documented
- [ ] Autoloads created (GameManager, EventBus, AudioManager)

## Phase 4: Assets
- [ ] All "must" assets from manifest acquired (status = acquired)
- [ ] Textures in assets/textures/
- [ ] Models in assets/models/
- [ ] SFX in assets/audio/sfx/
- [ ] assets.list_local confirms files present

## Phase 5: Scenes
- [ ] Main scene created with correct root node type
- [ ] Camera and lighting set up
- [ ] Player scene with collision shape
- [ ] At least one level/room assembled
- [ ] get_scene_tree shows correct hierarchy

## Phase 6: Scripts
- [ ] All @export values (no hardcoded numbers)
- [ ] State machine for game flow
- [ ] Input via named actions only
- [ ] Signals for cross-system communication
- [ ] No errors in get_editor_errors

## Phase 7: Audio
- [ ] AudioStreamPlayer nodes for BGM
- [ ] Positional audio for SFX (AudioStreamPlayer2D/3D)
- [ ] Audio wired to gameplay signals

## Phase 8: Polish
- [ ] /game-polish applied
- [ ] UI animations present
- [ ] Camera feels good (smooth follow)

## Phase 9: Validation
- [ ] Game starts without errors (run_scene + get_game_status)
- [ ] Core loop works (simulate_input_sequence)
- [ ] Screenshot taken (take_game_screenshot)
- [ ] All acceptance criteria from GDD verified
