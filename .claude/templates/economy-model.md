# Economy Model — {{PROJECT_NAME}}

**Version:** 1.0
**Date:** {{DATE}}
**Author:** {{AUTHOR}}

---

## Overview

{{ECONOMY_OVERVIEW}}

## Currencies

| Currency | Source | Sink | Soft cap | Hard cap | Earn rate |
|----------|--------|------|----------|----------|-----------|
| {{CURR_1}} | {{SRC_1}} | {{SINK_1}} | {{SOFT_1}} | {{HARD_1}} | {{RATE_1}} |
| {{CURR_2}} | {{SRC_2}} | {{SINK_2}} | {{SOFT_2}} | {{HARD_2}} | {{RATE_2}} |

## Sources (Faucets)

| Source | Currency | Amount | Frequency | Condition |
|--------|----------|--------|-----------|-----------|
| {{FAUCET_1}} | {{FC_1}} | {{FA_1}} | {{FF_1}} | {{FCOND_1}} |

## Sinks (Drains)

| Sink | Currency | Cost | Purpose | Repeatable |
|------|----------|------|---------|------------|
| {{SINK_1}} | {{SC_1}} | {{COST_1}} | {{SP_1}} | {{SR_1}} |

## Progression Curve

| Hour | Level | Gold/hr | Key unlocks | Spending |
|------|-------|---------|-------------|----------|
| 1 | {{L1}} | {{G1}} | {{U1}} | {{S1}} |
| 5 | {{L5}} | {{G5}} | {{U5}} | {{S5}} |
| 10 | {{L10}} | {{G10}} | {{U10}} | {{S10}} |
| 20 | {{L20}} | {{G20}} | {{U20}} | {{S20}} |

## Formulas

### {{FORMULA_1_NAME}}
```
{{FORMULA_1}}
```
**Variables:** {{FORMULA_1_VARS}}
**Example:** {{FORMULA_1_EXAMPLE}}

## Balance Knobs

| Knob | Current | Min | Max | Impact |
|------|---------|-----|-----|--------|
| {{KNOB_1}} | {{CURR_V1}} | {{MIN_1}} | {{MAX_1}} | {{IMPACT_1}} |

## Anti-Exploit Rules

- {{RULE_1}}
- {{RULE_2}}

## Monetization Touchpoints

| Touchpoint | Free path | Paid path |
|------------|-----------|-----------|
| {{TOUCH_1}} | {{FREE_1}} | {{PAID_1}} |

## Simulation Results

| Scenario | Player type | 10h balance | 50h balance | Issues |
|----------|-------------|-------------|-------------|--------|
| {{SIM_1}} | {{TYPE_1}} | {{BAL10_1}} | {{BAL50_1}} | {{ISS_1}} |

## Red Flags to Monitor

- [ ] Inflation: currency earned > currency spent over time
- [ ] Deflation: players hoard, nothing to spend on
- [ ] Pay-to-win: paid currency gives unfair competitive advantage
- [ ] Dead economy: no trading or meaningful spending after midgame
