---
description: Game UI Architecture
audience: game-dev
---

# Game UI Architecture

- UI NEVER owns game state. Read state via signals or direct reference, never modify game logic from UI scripts.
- All player-facing text through localization: `tr("KEY")` or TranslationServer. No hardcoded strings.
- Support dual input: keyboard+mouse AND gamepad. Test both. Use Input.is_action_* not raw key codes.
- Accessibility: respect OS motion preferences, provide colorblind modes, support scalable text (minimum 16px base).
- Audio feedback via signals: `button_pressed.emit()` → AudioManager plays sound. Never embed AudioStreamPlayer in UI scenes.
- Test at minimum and maximum supported resolutions. Use anchors and containers, not absolute positioning.
- Use Control nodes (Button, Label, Panel, etc.) for all UI. Never Sprite2D for interface elements.
- Theme resources (.tres) for consistent styling. One theme per game, overrides per scene if needed.
- Gamepad focus flow: define `focus_neighbor_*` on every focusable Control. Test full navigation without mouse.
- Separate HUD (CanvasLayer, always visible during gameplay) from menus (full-screen, pause game tree).
- Animate UI with Tweens for procedural effects (pop, fade, slide). AnimationPlayer only for complex, designed sequences.
- Never hardcode colors — use Theme, @export Color, or named constants. Dark/light mode should be a theme swap.
