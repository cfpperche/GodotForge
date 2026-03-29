---
name: tech-debt
description: Scan codebase for technical debt — TODO/FIXME, duplicated code, oversized files, missing tests. Score and prioritize.
user_invocable: true
---

# /tech-debt [scan|prioritize]

Track and manage technical debt in the game project.

## Mode: scan (default)

### Step 1: Find Debt Indicators
Use `list_files` + `read_script` to scan all `.gd` and `.ts` files for:
- `TODO`, `FIXME`, `HACK`, `XXX`, `TEMP` comments
- Duplicated code blocks (>10 similar lines across files)
- Oversized files (>300 lines for GDScript, >500 for TypeScript)
- Untyped functions (missing `-> ReturnType` in GDScript)
- Dead code: unused functions, unreachable branches
- Missing error handling: bare `pass` in catch/error paths

### Step 2: Categorize
- **Code Quality**: naming, typing, duplication, complexity
- **Architecture**: tight coupling, circular dependencies, god classes
- **Performance**: unoptimized patterns found by static analysis
- **Testing**: systems with zero test coverage

### Step 3: Score
For each item compute priority: `(impact × frequency) / effort`
- Impact: 1-5 (how much it affects development velocity)
- Frequency: 1-5 (how often this code path is touched)
- Effort: 1-5 (how hard to fix)

### Step 4: Report
| # | Type | File:Line | Description | Priority | Effort |
|---|------|-----------|-------------|----------|--------|

Sort by priority descending. Top 5 are "fix this sprint".

## Mode: prioritize

Read existing debt report, re-score based on recent changes (git log), recommend which items to tackle in the next sprint.

## Output
Save report to `docs/tech-debt.md`. Use `save_memory` to track debt trends.
