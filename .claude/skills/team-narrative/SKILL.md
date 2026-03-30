---
name: team-narrative
description: Multi-agent pipeline for story, dialogue, lore, and world-building — from narrative design through writing, world-building, and audio direction.
user_invocable: true
---

# /team-narrative [story scope]

Orchestrate a full narrative pipeline using specialized agents. **Ask for user approval between each phase.**

## Phase 1: Requirements Gathering

Ask the user:
- **Story scope**: full game narrative, single quest line, character arc, or lore expansion
- **Tone**: dark, humorous, epic, intimate, mysterious
- **Player agency**: linear, branching choices, open-world discovery
- **Existing lore**: any established canon to respect?
- **Dialogue system**: linear, branching, hub-based

## Phase 2: Narrative Design → @narrative-director

Delegate to **narrative-director** agent:
- Design story arc with character arcs
- Define branching points and meaningful choices
- Map narrative pacing to gameplay pacing
- Output: story outline, character sheets, dialogue tree structure
- Use templates: `narrative-character-sheet.md`, `faction-design.md`

**🔄 Present to user for approval before proceeding.**

## Phase 3: World Building → @world-builder

Delegate to **world-builder** agent:
- Create/expand lore, factions, history, geography
- Ensure consistency with existing canon
- Define environmental storytelling opportunities
- Output: lore document, faction relationships, world map notes

**🔄 Present to user for approval before proceeding.**

## Phase 4: Writing → @writer

Delegate to **writer** agent:
- Write dialogue for approved scenes/quests
- Create item descriptions, UI copy, environmental text
- Follow character voice guides from character sheets
- Output: dialogue data files (JSON), text assets
- Apply `.claude/rules/narrative.md` — all text in data files with translation keys

**🔄 Present to user for approval before proceeding.**

## Phase 5: Audio Direction → @audio-director

Delegate to **audio-director** agent:
- Create music briefs for narrative moments
- Define voice direction per character
- Specify ambient audio for story locations
- Output: audio briefs, voice casting notes

## Phase 6: Summary

Present final deliverables checklist:
- [ ] Story outline with character arcs
- [ ] Character sheets (all major characters)
- [ ] World lore document
- [ ] Faction designs (if applicable)
- [ ] Dialogue data files (JSON with translation keys)
- [ ] Audio direction briefs
- [ ] Narrative flow diagram (all paths reachable)
