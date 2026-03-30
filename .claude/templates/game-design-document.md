# Game Design Document — {{PROJECT_NAME}}

**Version:** 1.0
**Date:** {{DATE}}
**Author:** {{AUTHOR}}
**Status:** Draft | Review | Approved

---

## 1. Overview

{{GAME_OVERVIEW}}

### Vision statement
> {{VISION_STATEMENT}}

### Design pillars
1. {{PILLAR_1}}
2. {{PILLAR_2}}
3. {{PILLAR_3}}

---

## 2. Gameplay

### 2.1 Core Loop

```
{{CORE_LOOP_DIAGRAM}}
```

**Session flow:** {{SESSION_FLOW}}
**Average session:** {{SESSION_LENGTH}}

### 2.2 Mechanics

#### {{MECHANIC_1_NAME}}

| Section | Details |
|---------|---------|
| Overview | {{MECH_1_OVERVIEW}} |
| Player fantasy | {{MECH_1_FANTASY}} |
| Rules | {{MECH_1_RULES}} |
| Formulas | {{MECH_1_FORMULAS}} |
| Edge cases | {{MECH_1_EDGE}} |
| Dependencies | {{MECH_1_DEPS}} |
| Tuning knobs | {{MECH_1_TUNING}} |
| Acceptance criteria | {{MECH_1_AC}} |

#### {{MECHANIC_2_NAME}}

| Section | Details |
|---------|---------|
| Overview | {{MECH_2_OVERVIEW}} |
| Player fantasy | {{MECH_2_FANTASY}} |
| Rules | {{MECH_2_RULES}} |
| Formulas | {{MECH_2_FORMULAS}} |
| Edge cases | {{MECH_2_EDGE}} |
| Dependencies | {{MECH_2_DEPS}} |
| Tuning knobs | {{MECH_2_TUNING}} |
| Acceptance criteria | {{MECH_2_AC}} |

### 2.3 Progression

| System | Description |
|--------|-------------|
| Player progression | {{PLAYER_PROG}} |
| Difficulty curve | {{DIFFICULTY}} |
| Unlocks | {{UNLOCKS}} |
| Endgame | {{ENDGAME}} |

### 2.4 Game States

```
{{STATE_DIAGRAM}}
```

| State | Entry condition | Exit condition | Player actions |
|-------|----------------|----------------|----------------|
| {{STATE_1}} | {{ENTRY_1}} | {{EXIT_1}} | {{ACTIONS_1}} |
| {{STATE_2}} | {{ENTRY_2}} | {{EXIT_2}} | {{ACTIONS_2}} |

---

## 3. World & Narrative

### 3.1 Setting
{{SETTING}}

### 3.2 Characters

| Character | Role | Motivation | Arc |
|-----------|------|------------|-----|
| {{CHAR_1}} | {{ROLE_1}} | {{MOTIV_1}} | {{ARC_1}} |

### 3.3 Story structure
{{STORY_STRUCTURE}}

---

## 4. Level Design

### 4.1 Level list

| Level | Theme | Mechanics introduced | Duration |
|-------|-------|---------------------|----------|
| {{LEVEL_1}} | {{THEME_1}} | {{INTRO_1}} | {{DUR_1}} |

### 4.2 Level flow template
{{LEVEL_FLOW}}

---

## 5. Art Direction

| Aspect | Description | Reference |
|--------|-------------|-----------|
| Style | {{ART_STYLE}} | {{ART_REF}} |
| Camera | {{CAMERA}} | |
| UI | {{UI_STYLE}} | {{UI_REF}} |
| VFX | {{VFX_STYLE}} | {{VFX_REF}} |

---

## 6. Audio Design

| Category | Direction | Reference |
|----------|-----------|-----------|
| Music | {{MUSIC}} | {{MUSIC_REF}} |
| SFX | {{SFX}} | {{SFX_REF}} |
| Ambience | {{AMBIENCE}} | {{AMB_REF}} |
| Voice | {{VOICE}} | {{VOICE_REF}} |

---

## 7. UI/UX

### 7.1 Screen flow
```
{{SCREEN_FLOW_DIAGRAM}}
```

### 7.2 HUD elements
| Element | Purpose | Visibility |
|---------|---------|------------|
| {{HUD_1}} | {{PURPOSE_1}} | {{VIS_1}} |

### 7.3 Input mapping
| Action | Keyboard | Gamepad |
|--------|----------|---------|
| {{INPUT_1}} | {{KEY_1}} | {{PAD_1}} |

---

## 8. Technical Requirements

| Requirement | Specification |
|-------------|---------------|
| Engine | Godot {{VERSION}} |
| Target FPS | {{FPS}} |
| Min spec | {{MIN_SPEC}} |
| Platforms | {{PLATFORMS}} |
| Save system | {{SAVE}} |
| Networking | {{NETWORK}} |

---

## 9. Monetization & Content Plan

{{MONETIZATION_PLAN}}

---

## 10. Appendices

- [ ] Art bible: {{LINK}}
- [ ] Sound bible: {{LINK}}
- [ ] Economy model: {{LINK}}
- [ ] Technical design: {{LINK}}
