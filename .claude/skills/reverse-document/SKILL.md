---
name: reverse-document
description: Generate design documentation from existing code — analyze scripts, identify systems, produce GDDs and dependency maps.
user_invocable: true
---

# /reverse-document

Analyze existing game code and generate design documentation for every discovered system.

## Phase 1: Scan Codebase
- `list_files` to find all `.gd` scripts
- `read_script` each file, extract: class_name, extends, signals, @export vars, public methods
- Group scripts by directory and inheritance

## Phase 2: Identify Systems
A "system" is a group of related scripts that work together:
- Same directory (e.g., `scripts/combat/`)
- Connected via signals
- Shared base class
- Referenced in the same scene

Name each system: combat, movement, inventory, UI, audio, etc.

## Phase 3: Generate Per-System GDD
For each discovered system, write a GDD at `docs/gdd/system-[name].md`:
- **Overview**: inferred from class names and methods
- **Rules**: derived from method logic and state machines
- **Formulas**: extracted from @export values and calculations
- **Dependencies**: which other systems are referenced
- **Tuning Knobs**: all @export values with current values as defaults

## Phase 4: Dependency Map
Create `docs/gdd/systems-map.md`:
```
[Player Movement] → [Camera System]
[Player Movement] → [Animation System]
[Combat System] → [Player Movement] (knockback)
[Combat System] → [Audio System] (hit sounds)
[UI System] ← [Combat System] (health display)
```

## Phase 5: Gap Analysis
- Systems with no tests
- Systems with no documentation
- Systems with high coupling (>3 dependencies)
- Missing edge case handling

## Output
- `docs/gdd/system-*.md` — one per discovered system
- `docs/gdd/systems-map.md` — dependency visualization
- Summary report with gaps and recommendations
