---
name: sprint-plan
description: Create or review sprint plans — scan project state, propose prioritized backlog, track progress.
user_invocable: true
---

# /sprint-plan [new|status]

## Mode: new

### Step 1: Gather Context
- Read `docs/game-concept.md` or design docs if they exist
- Scan `docs/issues/` for open issues
- Run `/tech-debt scan` mentally (check for TODOs)
- Check `docs/sprints/` for previous sprint if exists
- Read recent git log for momentum and current work

### Step 2: Identify Candidates
- Features from design docs not yet implemented
- Bugs/issues from docs/issues/
- Tech debt items from docs/tech-debt.md
- Polish items (UI, VFX, audio, feel)
- Carryover from previous sprint (if any)

### Step 3: Prioritize
Split into:
- **Must** (60% of capacity): core features, blockers, critical bugs
- **Should** (20% of capacity): important but not blocking
- **Nice-to-have** (0% planned, 20% buffer): polish, nice features

### Step 4: Output
Write `docs/sprints/sprint-NN.md` with:
- Sprint goal (1 sentence)
- Duration (e.g., 1 week)
- Must/Should/Nice-to-have task lists with completion checkboxes
- Risks and mitigations
- Definition of done

## Mode: status

- Read current sprint file
- Check which tasks are done (look at code changes, git log)
- Flag blocked or at-risk items
- Report: completion %, blockers, forecast
