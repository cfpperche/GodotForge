# Issue 008 — simulate_input cannot test held actions (WASD movement)

## Status: Open
## Priority: High
## Component: `addons/godotforge/tools/runtime_tools.gd`

## Problem

`simulate_input` and `simulate_input_sequence` perform instant press+release within one frame. Scripts using `Input.is_action_pressed()` or `Input.get_axis()` in `_physics_process` never see the action as "held" — it's already released before the next physics tick.

This makes it impossible to automated-test movement, sprint, or any held-input mechanic.

## Impact

- Cannot verify wall collision via automated playtest (player never moves)
- Cannot test sprint stamina drain
- QA Director's runtime physics checks require manual playtesting
- Phase 9 validation cannot be fully automated for movement-based games

## Fix Plan

Add a new `simulate_input_hold` tool that:
1. Presses an action and holds it for N milliseconds before releasing
2. Implementation: `Input.action_press(action)` → Timer(duration) → `Input.action_release(action)`
3. Or: modify `simulate_input_sequence` to support `{"action": "move_forward", "hold_ms": 1000, "delay_ms": 0}`

## Workaround

Manual playtesting via the game window. Use `get_runtime_state` before/after manual input to verify positions.
