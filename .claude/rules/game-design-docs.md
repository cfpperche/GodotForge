---
description: Game Design Document Standards
audience: game-dev
---

# Game Design Document Standards

Every gameplay system MUST have these 8 sections:

1. **Overview** — One paragraph summary of what the system does and why it exists.
2. **Player Fantasy** — What should the player FEEL? Reference MDA aesthetics (Sensation, Fantasy, Narrative, Challenge, Fellowship, Discovery, Expression, Submission).
3. **Detailed Rules** — Precise, unambiguous mechanics. No hand-waving. "The player jumps" is not enough — specify height, timing, cancels, edge cases.
4. **Formulas** — All math with variable definitions, expected ranges, and example calculations. E.g., `damage = base_damage * (1 + crit_multiplier) * element_bonus`.
5. **Edge Cases** — What happens in unusual situations? Explicit handling, not "handle gracefully."
6. **Dependencies** — Which other systems does this interact with? Bidirectional.
7. **Tuning Knobs** — Configurable values with safe ranges and gameplay impact. E.g., `GRAVITY: 800-1200, higher = snappier feel, lower = floatier`.
8. **Acceptance Criteria** — Testable conditions that prove the system works. QA-verifiable.
