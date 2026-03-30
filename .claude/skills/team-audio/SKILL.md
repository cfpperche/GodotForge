---
name: team-audio
description: Multi-agent pipeline for full audio implementation — from audio direction through sound design, music, and integration.
user_invocable: true
---

# /team-audio [scope: full game|scene|system]

Orchestrate a full audio pipeline using specialized agents. **Ask for user approval between each phase.**

## Phase 1: Requirements Gathering

Ask the user:
- **Scope**: full game audio, specific scene, or specific system (combat, UI, ambience)
- **Style**: realistic, stylized, retro, orchestral, electronic
- **Budget**: custom music vs library, custom SFX vs generated
- **Adaptive audio**: static or dynamic (responds to gameplay state)
- **References**: games with audio they admire

## Phase 2: Audio Direction → @audio-director

Delegate to **audio-director** agent:
- Define audio identity and vision statement
- Create music briefs per game context (menu, gameplay, boss, cutscene)
- Define SFX style guide and priorities
- Specify bus structure and mix targets
- Use template: `sound-bible.md`
- Output: sound bible document

**🔄 Present to user for approval before proceeding.**

## Phase 3: Sound Design → @sound-designer

Delegate to **sound-designer** agent:
- Implement audio bus structure in Godot
- Create/source SFX for all identified needs
- Setup spatial audio for 2D/3D elements
- Implement variation (random pitch, multiple samples)
- Wire audio triggers via signals
- Apply `.claude/rules/ui-code.md` audio rules (signals, not embedded players)

**🔄 Present to user for approval before proceeding.**

## Phase 4: Integration → @technical-artist

Delegate to **technical-artist** agent:
- Verify audio import settings (format, compression, loop points)
- Optimize audio memory usage
- Setup adaptive music transitions if required
- Ensure audio syncs with VFX and animations

## Phase 5: Summary

Present final deliverables checklist:
- [ ] Sound bible document
- [ ] Audio bus structure configured
- [ ] All SFX implemented with variation
- [ ] Spatial audio configured (2D/3D)
- [ ] Music tracks with transitions
- [ ] Import settings optimized
- [ ] Mix levels balanced
