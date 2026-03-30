---
name: gate-check
description: Verify quality gate criteria before advancing to the next milestone or phase — automated checks on code, tests, performance, and documentation.
user_invocable: true
---

# /gate-check [gate name: alpha|beta|rc|release|custom]

Verify that all quality gate criteria are met before advancing.

## Predefined Gates

### Alpha Gate
- [ ] Core gameplay loop functional
- [ ] All placeholder art identified (no programmer art in final)
- [ ] Main scenes load without errors
- [ ] No crash bugs in happy path
- [ ] Basic input works (keyboard + primary gamepad)

### Beta Gate
- [ ] All features implemented (feature complete)
- [ ] All art assets integrated (art complete)
- [ ] All audio integrated
- [ ] Test coverage > 60%
- [ ] No Critical bugs open
- [ ] Performance within 2x of target on all platforms

### RC Gate (Release Candidate)
- [ ] Zero Critical bugs
- [ ] Zero Major bugs
- [ ] Test coverage > 80%
- [ ] Performance meets target on all platforms
- [ ] All text localization-ready (no hardcoded strings)
- [ ] Accessibility checklist passed
- [ ] Save/load tested
- [ ] All platforms tested

### Release Gate
- [ ] RC gate passed
- [ ] Changelog generated
- [ ] Release notes written
- [ ] Build artifacts for all platforms
- [ ] Version number updated
- [ ] Git tag created

## Execution

For each criterion:
1. **Auto-check** where possible (grep for hardcoded strings, run tests, check git for open issues)
2. **Manual verify** where automation isn't possible (ask user to confirm)
3. **Rate**: ✅ Pass | ❌ Fail | ⚠️ Warning (passes with caveat)

## Output

```
## Gate Check: {{GATE_NAME}}
**Date:** {{DATE}} | **Result:** PASS / FAIL

### Results
| Criterion | Status | Evidence |
|-----------|--------|----------|
| ... | ✅/❌/⚠️ | ... |

### Pass: {{N}}/{{TOTAL}} ({{%}})
### Blockers (must fix): {{LIST}}
### Warnings (should fix): {{LIST}}

### Verdict: {{PASS|FAIL}} — {{REASON}}
```
