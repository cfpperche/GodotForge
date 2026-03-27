# Examples — Skill Authoring

## Example 1: Good vs Bad Description Frontmatter

**Bad:**
```yaml
description: Helps with Spec stuff
```
Why it fails: Too vague — Claude can't determine when to trigger the skill. "Spec stuff" could mean reading, writing, auditing, or decomposing.

**Good:**
```yaml
description: Create, audit, and decompose Product Requirement Documents (Specs). Use when users want to write a new Spec, validate an existing Spec against quality rules, or break a Spec into executable tasks.
```
Why it works: States the actions (create, audit, decompose), the domain (Specs), and specific trigger scenarios.

## Example 2: Good vs Bad Instruction Step

**Bad:**
```markdown
### Step 3: Review the code
Look at the code and make sure it's good. Fix any issues you find.
```
Why it fails: No freedom annotation, no specific actions, no verification criteria, "good" is subjective.

**Good:**
```markdown
### Step 3: Validate Codebase Wiring — 🔒 Low freedom: exact checks
1. For each file path in §14, run `Glob` to verify it exists
2. For each TypeScript type in §7, run `Grep` to find the source definition
3. Mark verified paths with ✅, missing paths with ❌
4. If any path is ❌: stop and fix the reference before proceeding
```
Why it works: Freedom level declared, actions are concrete and verifiable, has a clear gate condition.

## Example 3: Good vs Bad Reference File

**Bad reference (prose dump):**
```markdown
# Code Review Guide
When reviewing code, it's important to consider many factors. Code quality
is subjective but there are some best practices. You should look at naming,
structure, and performance. Think about whether the code is maintainable...
```
Why it fails: Generic advice Claude already knows. No actionable structure. Could apply to any project.

**Good reference (Pattern/Instead format):**
```markdown
# Anti-Patterns — Code Review
## 1. File Listing Without Reading
**Pattern:** Reviewer lists files in the PR but doesn't read source — findings are superficial.
**Instead:** Read every file, cite file:line for every finding.

## 2. Vague Question Without Location
**Pattern:** "Is this performant?" with no file reference.
**Instead:** "Is the N+1 query at api/routes.ts:47 intentional? Consider eager loading."
```
Why it works: Domain-specific, Pattern/Instead is scannable, concrete examples with file:line references.

## Counter-Example: Bloated Triad File

**Bad (150 lines of anti-patterns):**
A file with 25 anti-patterns, many overlapping or generic ("Don't write bad code", "Don't forget to test").

**Instead:** 8-12 focused anti-patterns derived from real failures observed in the project. Each entry is 2-3 lines. Total file is 50-80 lines. Every pattern should make the reader say "yes, I've seen that happen."
