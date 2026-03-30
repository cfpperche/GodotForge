---
name: milestone-review
description: Review milestone completion — analyze deliverables, flag blockers, assess readiness, and generate status report.
user_invocable: true
---

# /milestone-review [milestone name]

Review a milestone's current status against its success criteria.

## Step 1: Gather Milestone Definition

Ask the user:
- Which milestone are we reviewing?
- Where is the milestone definition? (doc, issue tracker, or describe it)
- What were the original success criteria?
- What was the target date?

If a milestone doc exists (using `milestone-definition.md` template), read it.

## Step 2: Assess Deliverables

For each deliverable in the milestone:
1. **Scan the codebase** — does the feature exist? (Grep for key functions, scenes, scripts)
2. **Check git history** — was it committed? By whom? When?
3. **Run tests** if available — do they pass?
4. **Rate status**: ✅ Complete | 🟡 In Progress | ❌ Not Started | ⚠️ Blocked

## Step 3: Flag Blockers

Identify:
- Dependencies not yet resolved
- Technical risks that materialized
- Scope creep (work done that wasn't in the milestone)
- Work remaining vs time remaining

## Step 4: Generate Report

Output a structured report:

```
## Milestone: {{NAME}}
**Target date:** {{DATE}} | **Status:** On Track / At Risk / Blocked

### Deliverables
| Deliverable | Status | Notes |
|-------------|--------|-------|
| ... | ✅/🟡/❌/⚠️ | ... |

### Completion: X/Y deliverables (Z%)

### Blockers
- ...

### Risks
- ...

### Recommendation
Go / No-Go / Needs Extension (with justification)
```

## Step 5: Action Items

Propose concrete next steps to close the milestone:
- What must be done (blockers to resolve)
- What can be deferred (nice-to-haves to cut)
- Updated timeline if needed
