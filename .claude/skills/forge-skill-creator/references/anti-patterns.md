# Anti-Patterns — Skill Authoring

## 1. Wall of Prose SKILL.md
**Pattern:** Entire skill is one long narrative with no structure — agents lose track of steps mid-execution.
**Instead:** Use TIDD-EC sections (Task, Instructions, Do, Don't, Examples, Context). Numbered steps with freedom annotations.

## 2. Everything in SKILL.md
**Pattern:** All content crammed into SKILL.md — 800+ lines, context window bloat, progressive disclosure defeated.
**Instead:** Keep SKILL.md under 500 lines. Split detailed guidance into `references/` files, link from SKILL.md with clear "when to read" notes.

## 3. Vague Description Frontmatter
**Pattern:** `description: "Helps with code stuff"` — skill never triggers because Claude can't match it to user intent.
**Instead:** Include what the skill does AND specific trigger phrases/scenarios. E.g., "Use when users want to create, update, or iterate on a skill…"

## 4. No Quality Triad
**Pattern:** Skill ships without `references/anti-patterns.md`, `checklist.md`, or `examples.md` — output quality varies wildly between runs.
**Instead:** Every skill includes the triad: anti-patterns (what goes wrong), checklist (self-review), examples (concrete input/output).

## 5. Invented Contracts
**Pattern:** Skill defines TypeScript types, API shapes, or file formats from imagination — agent writes code against phantom interfaces.
**Instead:** Copy real types from the codebase (`Glob` → `Read`), then extend. Mark invented types explicitly as `(PROPOSED)`.

## 6. Generic Claude Knowledge
**Pattern:** Skill explains how HTTP works, what JSON is, or how to write functions — wasting tokens on things Claude already knows.
**Instead:** Only include domain-specific knowledge Claude lacks: project conventions, file paths, gotchas, non-obvious constraints.

## 7. Missing Freedom Annotations
**Pattern:** Every step looks equally important — agent over-invests in exploratory steps and under-invests in critical ones.
**Instead:** Every step header has a freedom level: 🔒 Low (exact script), 🔓 Medium (preferred pattern), 🟢 High (trust judgment).

## 8. No Eval Scenarios
**Pattern:** Skill has no way to detect regression — authors iterate blind, can't tell if changes improved or degraded output.
**Instead:** Minimum 3 eval scenarios (happy path, edge case, error case) with Input, Expected behavior, and Failure indicators.

## 9. References Without SKILL.md Pointers
**Pattern:** Reference files exist in `references/` but SKILL.md never mentions them — agent doesn't know they exist, never loads them.
**Instead:** Every reference file is linked from SKILL.md with a description of when to read it.

## 10. Monolithic Steps
**Pattern:** "Step 3: Do the thing" covers 15 actions in one paragraph — agent skips sub-steps or loses track.
**Instead:** Break into sub-steps (3a, 3b, 3c). Each sub-step has one clear action and one verifiable outcome.

## 11. Copy-Paste Instructions
**Pattern:** Skill says "copy this template" but the template has placeholders the agent fills incorrectly or skips entirely.
**Instead:** Show a completed example alongside the template. Agent pattern-matches from the example, not the blanks.

## 12. Missing Progress Checklist
**Pattern:** Multi-step skill has no tracking mechanism — agent loses place after context compaction or interruption.
**Instead:** Include a copyable progress checklist after the H1. Agent copies it, marks items as completed.
