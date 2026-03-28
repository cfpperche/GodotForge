---
name: game-polish
description: Polish a game scene — add juice, particles, screen shake, audio hooks, and visual feedback to make gameplay feel AAA.
user_invocable: true
---

# /game-polish

Analyze the current game and apply polish in these areas:

## 1. Visual Juice
- Add tween animations to score changes (scale bounce, color flash)
- Screen shake on impacts (camera offset + rotation, decay over 0.3s)
- Particle effects: death, collection, movement trail
- Sprite squash & stretch on landing/jumping
- Flash white on damage (shader or modulate)

## 2. Audio Hooks
- Identify all gameplay events that need sound: jump, land, collect, die, score, menu
- Create AudioStreamPlayer nodes for each
- Randomize pitch slightly (0.9-1.1) for variety
- Use audio buses: Master, SFX, Music, UI

## 3. UI Polish
- Animate score text: scale up → settle on change
- Smooth transitions between game states (fade, slide)
- Button hover/press visual feedback
- Loading indicators for async operations

## 4. Camera
- Smooth camera follow with lerp (not instant)
- Camera lead: offset in movement direction
- Camera bounds to prevent showing outside world
- Zoom effects on dramatic moments

## 5. Performance
- Profile with Godot Performance singleton
- Ensure 60fps on target hardware
- Object pool frequently instantiated scenes
- Disable processing on off-screen objects

## Output
For each area, create or modify scripts using GodotForge tools (create_script, edit_script, add_node, set_property). Explain each polish technique as you apply it.
