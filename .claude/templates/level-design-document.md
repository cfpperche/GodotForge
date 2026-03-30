# Level Design Document — {{LEVEL_NAME}}

**Version:** 1.0
**Date:** {{DATE}}
**Author:** {{AUTHOR}}

---

## Overview

| Field | Value |
|-------|-------|
| Level name | {{LEVEL_NAME}} |
| Theme | {{THEME}} |
| Duration | {{DURATION}} |
| Difficulty | {{DIFFICULTY}} (1-10) |
| Unlock condition | {{UNLOCK}} |

## Purpose in Game Flow

- **New mechanics introduced:** {{NEW_MECHANICS}}
- **Skills tested:** {{SKILLS_TESTED}}
- **Narrative beats:** {{NARRATIVE}}
- **Previous level:** {{PREV_LEVEL}}
- **Next level:** {{NEXT_LEVEL}}

## Layout

```
{{ASCII_LAYOUT_OR_DESCRIPTION}}
```

### Zones

| Zone | Purpose | Enemies | Hazards | Rewards |
|------|---------|---------|---------|---------|
| {{ZONE_1}} | {{PURPOSE_1}} | {{ENEMIES_1}} | {{HAZARDS_1}} | {{REWARDS_1}} |
| {{ZONE_2}} | {{PURPOSE_2}} | {{ENEMIES_2}} | {{HAZARDS_2}} | {{REWARDS_2}} |

## Pacing Graph

```
Intensity
  ▲
  │    ╱╲      ╱╲╱╲
  │   ╱  ╲    ╱    ╲
  │  ╱    ╲  ╱      ╲   ╱╲
  │ ╱      ╲╱        ╲ ╱  ╲
  │╱                   ╲    ╲
  └──────────────────────────► Time
   Intro  Build  Mid  Climax  Cool
```

## Enemy Encounters

| Encounter | Enemies | Trigger | Win condition |
|-----------|---------|---------|---------------|
| {{ENC_1}} | {{ENEMIES_1}} | {{TRIGGER_1}} | {{WIN_1}} |

## Collectibles & Secrets

| Item | Location | Hint | Value |
|------|----------|------|-------|
| {{ITEM_1}} | {{LOC_1}} | {{HINT_1}} | {{VALUE_1}} |

## Environmental Storytelling

| Element | Tells the player... |
|---------|-------------------|
| {{ENV_1}} | {{STORY_1}} |

## Technical Notes

- **Scene file:** `{{SCENE_PATH}}`
- **Tilesets:** {{TILESETS}}
- **Special systems:** {{SPECIAL}}
- **Performance concerns:** {{PERF}}

## Playtesting Criteria

- [ ] First-time player completes in {{TARGET_TIME}}
- [ ] No softlocks — every area is escapable
- [ ] Difficulty rating matches target ({{DIFFICULTY}}/10)
- [ ] All secrets are discoverable without a guide
- [ ] Performance stays above {{TARGET_FPS}} FPS
