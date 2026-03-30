---
name: retrospective
description: Run a sprint or project retrospective — analyze what worked, what didn't, and generate action items for improvement.
user_invocable: true
---

# /retrospective [sprint N | project name | last N days]

Structured retrospective based on git history, code changes, and user input.

## Step 1: Gather Context

Ask the user:
- **Scope**: sprint number, project name, or time range
- **Team**: who participated?
- **Goals**: what were we trying to accomplish?

## Step 2: Analyze Git History

Automatically:
1. Run `git log --oneline --since="{{start_date}}"` to see all commits
2. Categorize commits: features, fixes, refactors, docs, chores
3. Count: commits, files changed, lines added/removed
4. Identify: largest changes, most-touched files, patterns

## Step 3: Facilitated Discussion

Guide the user through 3 questions:

### What went well? ✅
- Prompt: "What accomplishments are you proud of?"
- Auto-suggest based on git: completed features, bugs fixed, improvements shipped

### What didn't go well? ❌
- Prompt: "What was frustrating or took longer than expected?"
- Auto-suggest: reverted commits, multiple fix attempts on same file, large time gaps

### What should we change? 🔄
- Prompt: "What specific changes would improve next sprint?"
- Auto-suggest based on patterns: missing tests, large PRs, scope changes

## Step 4: Generate Retro Document

Output using post-mortem structure:

```
## Retrospective — {{SCOPE}}
**Period:** {{START}} → {{END}}

### Metrics
- Commits: {{N}} | Files changed: {{N}} | Lines: +{{N}} -{{N}}
- Features shipped: {{N}} | Bugs fixed: {{N}}

### What went well
1. ...

### What didn't go well
1. ...

### Action items
| Action | Owner | Priority | Due |
|--------|-------|----------|-----|
| ... | ... | ... | ... |
```

## Step 5: Track Action Items

Ask: "Should I save these action items for the next sprint plan?"
If yes, note them for `/sprint-plan` to pick up.
