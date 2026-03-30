---
name: team-combat
description: Multi-agent pipeline to design and implement a combat system end-to-end — from mechanics design through implementation, art, audio, and QA.
user_invocable: true
---

# /team-combat [system description]

Orchestrate a full combat system pipeline using specialized agents. Each phase produces deliverables that feed into the next. **Ask for user approval between each phase.**

## Phase 1: Requirements Gathering

Ask the user:
- What **type** of combat? (melee, ranged, turn-based, real-time, hybrid)
- **Perspective**: 2D side-scroll, 2D top-down, 3D third-person, 3D first-person
- **Complexity**: simple (attack/defend), medium (combos, abilities), deep (stance, parry, counter)
- **References**: games with combat they admire
- **Scope constraints**: time, team size, art budget

## Phase 2: Systems Design → @systems-designer

Delegate to **systems-designer** agent:
- Design the combat mechanics using the 8-section GDD format
- Define: damage formulas, state machine, hitbox/hurtbox system, combo rules
- Output: combat design document with formulas, edge cases, tuning knobs
- Use template: `.claude/templates/game-design-document.md` (section 2.2)

**🔄 Present to user for approval before proceeding.**

## Phase 3: Implementation → @gameplay-programmer

Delegate to **gameplay-programmer** agent:
- Implement the approved combat design in GDScript
- Create: player combat controller, enemy combat AI, hitbox system, damage calculation
- Follow `.claude/rules/gameplay-code.md` — all values from @export/config
- Follow `.claude/rules/gdscript-standards.md` — static typing, file structure

**🔄 Present to user for approval before proceeding.**

## Phase 4: Visual Effects → @technical-artist

Delegate to **technical-artist** agent:
- Create VFX for: hit impacts, slash trails, projectiles, status effects
- Setup materials and shaders for combat feedback
- Ensure performance budget (particle count, draw calls)

**🔄 Present to user for approval before proceeding.**

## Phase 5: Audio → @sound-designer

Delegate to **sound-designer** agent:
- Design SFX for: attacks, impacts, blocks, dodges, abilities
- Setup audio bus for combat sounds
- Implement variation (random pitch, multiple samples)

**🔄 Present to user for approval before proceeding.**

## Phase 6: QA → @qa-tester

Delegate to **qa-tester** agent:
- Test all combat states and transitions
- Edge cases: simultaneous hits, zero HP, max damage, stun chains
- Performance: frame budget under combat stress
- Write regression tests

## Phase 7: Summary

Present final deliverables checklist:
- [ ] Combat design document (formulas, states, tuning knobs)
- [ ] Player combat scripts
- [ ] Enemy combat AI
- [ ] Hitbox/hurtbox system
- [ ] VFX (impacts, trails, effects)
- [ ] SFX (attacks, impacts, feedback)
- [ ] Test coverage
- [ ] Balance tuning knobs documented
