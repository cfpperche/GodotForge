---
name: team-level
description: Multi-agent pipeline to design and build a game level — from layout and pacing through art, audio, and QA testing.
user_invocable: true
---

# /team-level [level description]

Orchestrate a full level creation pipeline using specialized agents. **Ask for user approval between each phase.**

## Phase 1: Requirements Gathering

Ask the user:
- **Level type**: tutorial, combat arena, exploration, puzzle, boss, hub
- **Game context**: where in progression? what mechanics available?
- **Duration target**: how long should it take to complete?
- **Difficulty target**: 1-10 scale
- **New mechanics introduced** (if any)

## Phase 2: Level Design → @level-designer

Delegate to **level-designer** agent:
- Design level layout with zone breakdown
- Create pacing graph (intensity over time)
- Define encounters, collectibles, and secrets
- Plan environmental storytelling elements
- Output: level design document using `level-design-document.md` template
- Define playtesting criteria with measurable targets

**🔄 Present to user for approval before proceeding.**

## Phase 3: Environment Art → @technical-artist

Delegate to **technical-artist** agent:
- Build scene with appropriate tileset/meshes
- Setup lighting and atmosphere
- Create environmental props and details
- Optimize: draw calls, occlusion, LOD
- Apply visual language for player guidance

**🔄 Present to user for approval before proceeding.**

## Phase 4: Audio → @sound-designer

Delegate to **sound-designer** agent:
- Create ambient audio layers for the level
- Setup spatial SFX for interactive elements
- Define music transitions for pacing (calm → intense → boss)
- Wire audio triggers to gameplay events

**🔄 Present to user for approval before proceeding.**

## Phase 5: QA → @qa-tester

Delegate to **qa-tester** agent:
- Verify no softlocks (every area escapable)
- Test all encounters and triggers
- Check performance (target FPS maintained)
- Validate difficulty matches target
- Time first-playthrough against duration target

## Phase 6: Summary

Present final deliverables checklist:
- [ ] Level design document
- [ ] Level scene (.tscn) with all zones
- [ ] Lighting and atmosphere setup
- [ ] Ambient audio and music transitions
- [ ] All encounters tested
- [ ] No softlocks confirmed
- [ ] Performance within budget
- [ ] Playtime matches target (±20%)
