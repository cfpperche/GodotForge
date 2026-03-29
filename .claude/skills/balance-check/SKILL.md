---
name: balance-check
description: Analyze game balance — extract tuning values, compute DPS/TTK/economy metrics, flag outliers, recommend adjustments.
user_invocable: true
---

# /balance-check

Analyze game balance by reading data files and scripts, computing derived metrics, and flagging outliers.

## Phase 1: Scan Project
- Use `list_files` to find all `.json`, `.tres`, and `.gd` files
- Use `read_script` / `read_file` to extract @export values and data definitions
- Build a table of all tunable parameters: name, value, file, line

## Phase 2: Extract Balance Values
- Categorize values: damage, health, speed, cost, timing, probability
- Group by entity: player, enemies, items, economy
- Note relationships: "enemy_health / player_damage = hits_to_kill"

## Phase 3: Compute Derived Metrics
- **DPS** (damage per second): damage × attack_speed
- **TTK** (time to kill): target_health / attacker_DPS
- **Economy flow**: income_per_minute vs cost_of_upgrades → time_to_unlock
- **XP curves**: xp_required per level, expected time per level
- **Power spikes**: identify sudden jumps in effectiveness

## Phase 4: Flag Outliers
- Any value >2× the category average
- TTK < 0.5s (instant kill) or > 30s (tedious)
- Economy: anything that takes >2 hours to unlock
- Probability: anything <1% or >95% (feels rigged)

## Phase 5: Report
Present findings as:
- **Balance Table**: entity | stat | value | relative_to_average
- **Outliers**: specific values with recommended adjustments
- **Economy Timeline**: time to reach each tier/unlock
- **Difficulty Curve**: estimated difficulty by level/area
- **Recommendations**: specific number changes with rationale

Use `save_memory` to persist balance snapshot for tracking changes over time.
