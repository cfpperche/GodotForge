---
name: team-polish
description: Multi-agent pipeline for a polish pass — performance optimization, visual refinement, audio polish, and QA validation.
user_invocable: true
---

# /team-polish [scope: scene|system|full game]

Orchestrate a comprehensive polish pass using specialized agents. **Ask for user approval between each phase.**

## Phase 1: Requirements Gathering

Ask the user:
- **Scope**: specific scene, specific system, or full game
- **Priority**: performance, visuals, audio, or all
- **Target platform**: desktop, mobile, web, console
- **Performance targets**: FPS, load time, memory budget
- **Known issues**: any specific complaints or problem areas

## Phase 2: Performance Analysis → @performance-analyst

Delegate to **performance-analyst** agent:
- Profile the target scope for bottlenecks
- Check: frame time, draw calls, memory, physics, GDScript hot paths
- Identify top 5 optimization opportunities
- Output: performance report with prioritized fixes

**🔄 Present to user for approval before proceeding.**

## Phase 3: Visual Polish → @technical-artist

Delegate to **technical-artist** agent:
- Refine materials, lighting, and post-processing
- Add missing VFX (impacts, transitions, environmental)
- Optimize textures and meshes based on performance report
- Ensure visual consistency across the scope

**🔄 Present to user for approval before proceeding.**

## Phase 4: Audio Polish → @sound-designer

Delegate to **sound-designer** agent:
- Add missing SFX for interactions and feedback
- Verify audio bus levels and mixing
- Add variation to repetitive sounds
- Check spatial audio falloff and positioning

**🔄 Present to user for approval before proceeding.**

## Phase 5: QA Validation → @qa-tester

Delegate to **qa-tester** agent:
- Verify performance targets met after optimizations
- Regression test: no functionality broken by polish changes
- Edge case sweep on modified systems
- Final bug report on remaining issues

## Phase 6: Summary

Present final deliverables checklist:
- [ ] Performance report (before/after metrics)
- [ ] Optimizations applied (list with impact)
- [ ] Visual polish applied (materials, VFX, lighting)
- [ ] Audio polish applied (SFX, mixing, variation)
- [ ] QA validation passed
- [ ] Performance targets met
- [ ] No regressions introduced
