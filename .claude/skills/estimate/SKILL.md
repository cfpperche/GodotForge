---
name: estimate
description: Effort estimation for features or tasks — analyze complexity, dependencies, and risks to produce time/effort estimates.
user_invocable: true
---

# /estimate [feature or task description]

Produce effort estimates by analyzing code complexity, dependencies, and historical patterns.

## Step 1: Understand the Task

Ask the user:
- **What**: feature description or task name
- **Scope**: new feature, modification, bug fix, refactor
- **Constraints**: deadline, dependencies, team availability

## Step 2: Analyze Complexity

Scan the codebase to assess:

### Code Impact
- **Files to modify**: grep for related code, estimate touch points
- **New files needed**: scenes, scripts, resources, data files
- **Dependencies**: what systems does this interact with?
- **Test coverage**: existing tests to update, new tests needed

### Complexity Factors
| Factor | Low (1) | Medium (2) | High (3) |
|--------|---------|------------|----------|
| Files touched | 1-3 | 4-10 | 10+ |
| New systems | 0 | 1 | 2+ |
| External deps | 0 | 1-2 | 3+ |
| Unknowns | None | Some | Many |
| Test effort | Unit only | + Integration | + E2E |

## Step 3: Historical Comparison

Check git history for similar past work:
- How long did similar features take? (commit timestamps)
- Were there unexpected complications?
- How accurate were past estimates?

## Step 4: Generate Estimate

```
## Estimate: {{TASK}}

### Complexity Score: {{SUM}}/15 → {{Low|Medium|High|Very High}}

### Breakdown
| Subtask | Optimistic | Expected | Pessimistic |
|---------|-----------|----------|-------------|
| Design | {{O}} | {{E}} | {{P}} |
| Implementation | {{O}} | {{E}} | {{P}} |
| Testing | {{O}} | {{E}} | {{P}} |
| Polish | {{O}} | {{E}} | {{P}} |
| **Total** | **{{O}}** | **{{E}}** | **{{P}}** |

### Risks
- {{RISK_1}}: +{{TIME}} if materializes
- {{RISK_2}}: +{{TIME}} if materializes

### Confidence: {{Low|Medium|High}}
```

Use three-point estimation (Optimistic, Expected, Pessimistic).
Recommend the **Expected** value with a note on the range.
