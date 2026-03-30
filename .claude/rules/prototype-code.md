---
description: Prototyping Standards
audience: game-dev
---

# Prototyping Standards

- Prototypes live in `prototypes/` directory. Never in `scenes/` or `scripts/` — keep production clean.
- Relaxed standards: static typing optional, comments optional, architecture shortcuts allowed. Speed over quality.
- Every prototype MUST have a `README.md`: hypothesis, success criteria, current status, findings.
- Production code CANNOT import from `prototypes/`. If a prototype graduates, rewrite it properly in `scripts/`.
- Time-box: define max time (e.g., 4 hours) before starting. If hypothesis not proven, stop and document findings.
- Placeholder assets only: ColorRect, primitive CollisionShape2D, basic shapes. Never polish a prototype.
- Single-scene preferred: one .tscn with inline scripts. Self-contained, no external dependencies.
- Mark all prototype scripts: `## PROTOTYPE — do not use in production` as the first line after extends.
- Concluded prototypes: write findings in README, then delete the prototype directory. Git has the history.
- Prototype naming: `prototypes/test_[hypothesis]/` — e.g., `prototypes/test_wall_jump/`, `prototypes/test_inventory_drag/`.
