---
name: map-systems
description: Generate a systems dependency map — analyze code to visualize how game systems interact, signal connections, and data flow.
user_invocable: true
---

# /map-systems [scope: full|directory|system name]

Analyze the codebase and generate a systems dependency map showing how components interact.

## Step 1: Scan Codebase

Automatically:
1. **Find all scripts**: glob for `*.gd` files
2. **Extract class names**: `class_name` declarations
3. **Extract signals**: `signal` declarations
4. **Extract signal connections**: `connect(`, `.emit(`
5. **Extract autoloads**: from project.godot `[autoload]` section
6. **Extract dependencies**: `preload(`, `load(`, `get_node(`
7. **Extract extends**: inheritance chains

## Step 2: Build Dependency Graph

For each script/system:
- **Depends on**: what it references (preload, get_node, autoloads)
- **Depended by**: what references it
- **Signals emitted**: outgoing events
- **Signals connected**: incoming events
- **Inheritance**: parent class chain

## Step 3: Generate Map

Output an ASCII dependency map:

```
## Systems Map — {{SCOPE}}

### Autoloads (Global)
EventBus ←── [all systems emit/listen]
GameManager ←── SaveManager, LevelManager
AudioManager ←── UI, Gameplay, Environment

### Signal Flow
Player ──health_changed──► HUD
Player ──died──► GameManager ──game_over──► HUD, AudioManager
Enemy ──died──► ScoreManager ──score_changed──► HUD
```

### System Cards

For each major system:
```
┌─────────────────────────┐
│ {{SystemName}}          │
│ extends: {{Parent}}     │
│ signals: {{list}}       │
│ depends: {{list}}       │
│ depended_by: {{list}}   │
│ complexity: {{Low/Med/High}} │
└─────────────────────────┘
```

## Step 4: Analysis

Flag potential issues:
- **Circular dependencies**: A→B→C→A
- **God objects**: systems with >10 dependencies
- **Orphan systems**: no connections to anything
- **Missing signals**: direct method calls where signals would decouple
- **Tight coupling**: systems that know too much about each other

## Step 5: Recommendations

Suggest improvements:
- Systems to decouple via signals
- Missing autoloads that would simplify architecture
- Inheritance chains to flatten
- Systems to split (single responsibility)
