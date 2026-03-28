---
name: game-review
description: Review a game project — analyze code quality, gameplay feel, performance, and suggest improvements.
user_invocable: true
---

# /game-review

Perform a comprehensive review of the game project:

## 1. Code Quality
- Read all scripts in the project using list_files + read_script
- Check for: static typing, signal usage, state machines, @export for tuning
- Flag: hardcoded values, deep nesting, missing delta time, raw key codes
- Verify GDScript standards (file order, naming, typing)

## 2. Scene Architecture
- Use get_scene_tree to analyze node hierarchy
- Check: scene depth, node naming, collision layers, proper owner assignment
- Flag: monolithic scenes, orphan nodes, missing collision shapes

## 3. Gameplay Analysis
- Check game feel parameters: gravity, speeds, timings
- Verify: state machine completeness, edge cases handled
- Look for: missing restart logic, unhandled death conditions, score persistence

## 4. Performance
- Check for _process usage without set_process control
- Verify object pooling for spawned objects
- Check node count and scene complexity

## 5. Polish Level
- Check: UI feedback, animations, particle effects, audio hooks
- Compare against AAA polish checklist (screen shake, juice, transitions)

## Output
Generate a structured review with:
- CRITICAL: bugs and crashes
- IMPORTANT: gameplay issues
- NICE TO HAVE: polish improvements
- Score: 1-10 for Code, Design, Polish, Performance

Use GodotForge tools to read and analyze, then present findings.
