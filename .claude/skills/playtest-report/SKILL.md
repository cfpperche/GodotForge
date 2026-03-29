---
name: playtest-report
description: Create or analyze playtest reports — structured feedback template or reorganize raw playtest notes.
user_invocable: true
---

# /playtest-report [new|analyze]

## Mode: new

Generate a structured playtest template at `docs/playtests/playtest-YYYY-MM-DD.md`:

```markdown
# Playtest Report — [Date]

## Session Info
- Tester: [name/anonymous]
- Build: [version/commit]
- Duration: [minutes]
- Platform: [OS/device]

## First Impressions (first 2 minutes)
- What did the tester do first?
- Were controls clear?
- Any confusion?

## Gameplay Observations
- Where did the tester struggle?
- Where did the tester excel?
- Unexpected behaviors/exploits?

## Bugs Found
| # | Severity | Description | Repro Steps |

## Emotional Journey
- Fun moments:
- Frustrating moments:
- Boring moments:
- Surprising moments:

## Suggestions (tester's own words)

## Analysis (developer notes)
- Does behavior match intended design?
- What needs changing?
- Priority fixes:
```

## Mode: analyze

- Read raw playtest notes provided by user
- Reorganize into the structured template above
- Cross-reference observations against design docs (if they exist)
- Flag contradictions: "design says X should feel Y, but tester felt Z"
- Prioritize findings: critical (blocks fun) → important (reduces fun) → minor (polish)
