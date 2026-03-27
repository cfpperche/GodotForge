# Self-Review Checklist — Skill Authoring

Run before packaging or delivering a skill. Every item must pass.

## Frontmatter
- [ ] `name` matches directory name (kebab-case)
- [ ] `description` includes what the skill does AND trigger phrases/scenarios
- [ ] No extra frontmatter fields beyond `name`, `description`, `license` (if needed)

## Structure
- [ ] SKILL.md follows TIDD-EC pattern (or justified subset)
- [ ] SKILL.md is under 500 lines
- [ ] Freedom annotations (🔒/🔓/🟢) on every step header
- [ ] Progress checklist present for multi-step skills (3+ steps)
- [ ] No walls of prose — uses tables, numbered lists, code blocks

## Quality Triad
- [ ] `references/anti-patterns.md` exists (8-12 Pattern/Instead entries)
- [ ] `references/checklist.md` exists (10-16 verification items)
- [ ] `references/examples.md` exists (2-3 good + 1-2 counter-examples)
- [ ] Each triad file is 30-100 lines (not bloated)
- [ ] Each triad file is linked from SKILL.md with "when to read" context

## Content Quality
- [ ] Only domain-specific knowledge — no generic Claude knowledge
- [ ] Real codebase types/paths — no invented contracts
- [ ] At least 3 eval scenarios (happy, edge, error)
- [ ] Concrete examples preferred over abstract explanations

## Resources
- [ ] Every `references/` file linked from SKILL.md
- [ ] Every `scripts/` file tested by running it
- [ ] No example/placeholder files left from init (delete unused)
- [ ] No README.md, CHANGELOG.md, or auxiliary docs
