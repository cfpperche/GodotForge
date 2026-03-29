---
name: design-system
description: Design a new game system from scratch — generates a complete 8-section GDD following game-design-docs standards.
user_invocable: true
---

# /design-system [system-name]

Design a new game system following the 8-section standard from the `game-design-docs` rule.

## Step 1: Understand
Ask the user:
- What system? (inventory, combat, crafting, dialogue, progression, etc.)
- What genre/context? (RPG inventory vs survival crafting vs card game deck)
- Any reference games for this system?
- Constraints (mobile? multiplayer? save/load?)

## Step 2: Research Existing Code
- `list_files` + `read_script` to find related systems already in the project
- `get_scene_tree` to understand current scene structure
- Identify dependencies and integration points

## Step 3: Generate 8-Section GDD

Write `docs/gdd/system-[name].md` with:

1. **Overview** — one paragraph: what the system does and why
2. **Player Fantasy** — MDA aesthetics: what should the player FEEL?
3. **Detailed Rules** — precise mechanics, no hand-waving. Every interaction specified.
4. **Formulas** — all math with variable definitions, ranges, examples
5. **Edge Cases** — unusual situations with explicit handling
6. **Dependencies** — bidirectional: what this system needs and what needs it
7. **Tuning Knobs** — @export values with safe ranges and gameplay impact
8. **Acceptance Criteria** — testable conditions that prove the system works

## Step 4: Review
- Verify formulas produce reasonable values at min/max
- Check all edge cases have explicit resolution
- Ensure dependencies don't create circular chains
- Validate acceptance criteria are actually testable

## Output
Present the GDD and ask user to approve before implementation begins.
