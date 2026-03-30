# Sound Bible — {{PROJECT_NAME}}

**Version:** 1.0
**Date:** {{DATE}}
**Author:** {{AUTHOR}}

---

## Audio Identity

> {{AUDIO_DIRECTION_STATEMENT}}

### Keywords
{{KEYWORD_1}}, {{KEYWORD_2}}, {{KEYWORD_3}}

---

## Music

### Style & mood

| Context | Genre | Tempo | Mood | Key | Reference |
|---------|-------|-------|------|-----|-----------|
| Main menu | {{MENU_GENRE}} | {{MENU_BPM}} | {{MENU_MOOD}} | {{MENU_KEY}} | {{MENU_REF}} |
| Gameplay | {{PLAY_GENRE}} | {{PLAY_BPM}} | {{PLAY_MOOD}} | {{PLAY_KEY}} | {{PLAY_REF}} |
| Boss | {{BOSS_GENRE}} | {{BOSS_BPM}} | {{BOSS_MOOD}} | {{BOSS_KEY}} | {{BOSS_REF}} |
| Victory | {{WIN_GENRE}} | {{WIN_BPM}} | {{WIN_MOOD}} | {{WIN_KEY}} | {{WIN_REF}} |

### Adaptive music rules
- {{ADAPTIVE_RULE_1}}
- {{ADAPTIVE_RULE_2}}

### Transitions
| From | To | Method | Duration |
|------|-----|--------|----------|
| {{FROM_1}} | {{TO_1}} | {{METHOD_1}} | {{DUR_1}} |

---

## SFX

### Categories

| Category | Style | Examples |
|----------|-------|---------|
| UI | {{UI_STYLE}} | {{UI_EXAMPLES}} |
| Player | {{PLAYER_STYLE}} | {{PLAYER_EXAMPLES}} |
| Environment | {{ENV_STYLE}} | {{ENV_EXAMPLES}} |
| Combat | {{COMBAT_STYLE}} | {{COMBAT_EXAMPLES}} |
| Feedback | {{FEEDBACK_STYLE}} | {{FEEDBACK_EXAMPLES}} |

### SFX list

| ID | Trigger | Description | Priority | Variation |
|----|---------|-------------|----------|-----------|
| {{SFX_1}} | {{TRIGGER_1}} | {{DESC_1}} | {{PRI_1}} | {{VAR_1}} |

### Layering rules
- {{LAYER_RULE_1}}
- {{LAYER_RULE_2}}

---

## Voice

| Character | Tone | Pitch | Processing | Actor notes |
|-----------|------|-------|------------|-------------|
| {{CHAR_1}} | {{TONE_1}} | {{PITCH_1}} | {{PROC_1}} | {{NOTES_1}} |

---

## Ambience

| Environment | Layers | Loop length | Key sounds |
|-------------|--------|-------------|------------|
| {{AMB_1}} | {{LAYERS_1}} | {{LOOP_1}} | {{SOUNDS_1}} |

---

## Technical Specs

| Asset type | Format | Sample rate | Channels | Loudness |
|------------|--------|-------------|----------|----------|
| Music | {{MUS_FMT}} | {{MUS_SR}} | {{MUS_CH}} | {{MUS_LUFS}} |
| SFX | {{SFX_FMT}} | {{SFX_SR}} | {{SFX_CH}} | {{SFX_LUFS}} |
| Voice | {{VOX_FMT}} | {{VOX_SR}} | {{VOX_CH}} | {{VOX_LUFS}} |
| Ambience | {{AMB_FMT}} | {{AMB_SR}} | {{AMB_CH}} | {{AMB_LUFS}} |

### Mix bus structure
```
Master
├── Music ({{MUSIC_DB}})
├── SFX ({{SFX_DB}})
│   ├── UI
│   ├── Player
│   └── Environment
├── Voice ({{VOICE_DB}})
└── Ambience ({{AMB_DB}})
```

### Naming convention
```
{{NAMING_CONVENTION}}
```

---

## Do / Don't

### Do
- {{DO_1}}
- {{DO_2}}

### Don't
- {{DONT_1}}
- {{DONT_2}}
