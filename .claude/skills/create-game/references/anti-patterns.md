# Anti-Patterns — /create-game

| Pattern | Instead |
|---------|---------|
| Skip GDD, jump to coding | Always write docs/gdd.md first — unclear design = rework later |
| Hardcode gameplay values (speed=300) | Use @export for ALL values — tunability is mandatory |
| Download assets without manifest | Write docs/asset-manifest.md first — know what you need before searching |
| Model everything in Blender when free assets exist | Search ambientCG/Poly Haven first — only model custom assets |
| Create scripts without input actions defined | Define input actions in project settings before writing player.gd |
| Put all logic in one script | One script per responsibility (player.gd, enemy.gd, hud.gd) |
| Skip collision layer documentation | Document layers in GDD or comments — "layer 1 = player, 2 = enemies" |
| Generate music/voice before gameplay works | Audio is Phase 7 — get core loop working first |
| Use raw key codes (KEY_SPACE) | Use Input.is_action_pressed("jump") with named actions |
| Polish before validation | Run the game (Phase 9) before polish (Phase 8) — fix crashes first |
| Save documents as chat output only | Write to real files: docs/gdd.md, docs/asset-manifest.md |
| Mix 2D and 3D nodes incorrectly | 3D game = Node3D tree, 2D game = Node2D tree — never mix root types |
| Write GDD/code from training data | ALWAYS read the template/rule/doc FIRST — `read_file .claude/templates/game-design-document.md` before writing GDD |
| Assume Godot API from memory | ALWAYS `search_docs ClassName` before using any Godot class — APIs change between versions |
| Skip MANDATORY READS section | Every phase lists required reads — these are NOT optional, they are prerequisites |
