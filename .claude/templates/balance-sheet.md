# Balance Sheet — {{SYSTEM_NAME}}

**Version:** 1.0
**Date:** {{DATE}}
**Author:** {{AUTHOR}}

---

## System Overview

{{SYSTEM_OVERVIEW}}

## Entity Table

| Entity | HP | Damage | Speed | Range | Cost | Special |
|--------|-----|--------|-------|-------|------|---------|
| {{ENT_1}} | {{HP_1}} | {{DMG_1}} | {{SPD_1}} | {{RNG_1}} | {{COST_1}} | {{SPEC_1}} |
| {{ENT_2}} | {{HP_2}} | {{DMG_2}} | {{SPD_2}} | {{RNG_2}} | {{COST_2}} | {{SPEC_2}} |

## DPS Analysis

| Entity | Base DPS | With buffs | TTK vs {{TARGET}} |
|--------|----------|------------|-------------------|
| {{ENT_1}} | {{DPS_1}} | {{BDPS_1}} | {{TTK_1}} |

## Formulas

### Damage
```
final_damage = base_damage * (1 + crit_mult * crit_chance) * element_bonus - target_armor
```

### Scaling
```
stat_at_level = base_stat * (1 + growth_rate * (level - 1))
```

## Matchup Matrix

| Attacker \ Defender | {{DEF_1}} | {{DEF_2}} | {{DEF_3}} |
|--------------------|-----------|-----------|-----------|
| {{ATK_1}} | {{M_1_1}} | {{M_1_2}} | {{M_1_3}} |
| {{ATK_2}} | {{M_2_1}} | {{M_2_2}} | {{M_2_3}} |

## Tuning Knobs

| Parameter | Value | Safe range | What it affects |
|-----------|-------|------------|-----------------|
| {{KNOB_1}} | {{VAL_1}} | {{RANGE_1}} | {{EFFECT_1}} |

## Power Budget

| Slot | Budget % | Current | Over/Under |
|------|----------|---------|------------|
| {{SLOT_1}} | {{BUD_1}} | {{CUR_1}} | {{DIFF_1}} |

## Known Imbalances

| Issue | Severity | Proposed fix | Status |
|-------|----------|-------------|--------|
| {{ISSUE_1}} | {{SEV_1}} | {{FIX_1}} | {{STATUS_1}} |

## Changelog

| Date | Change | Reason | Impact |
|------|--------|--------|--------|
| {{DATE_1}} | {{CHANGE_1}} | {{REASON_1}} | {{IMPACT_1}} |
