---
name: localize
description: Localization toolkit — scan for hardcoded strings, extract translation keys, validate placeholders, and check coverage.
user_invocable: true
---

# /localize [scan|extract|validate|report]

Localization analysis and preparation for Godot projects.

## Commands

### /localize scan
Scan the codebase for localization issues:

1. **Hardcoded strings in GDScript**: grep for `text = "..."`, `tooltip_text = "..."`, string literals in UI code
2. **Missing tr() calls**: strings assigned to UI properties without `tr()`
3. **Hardcoded strings in scenes**: check .tscn files for text properties without translation keys
4. **Dialogue files**: verify all dialogue uses translation keys, not raw text

Output:
```
## Localization Scan
Found {{N}} issues:

### Hardcoded UI strings ({{N}})
| File:Line | String | Suggested key |
|-----------|--------|---------------|
| ... | "Play" | UI_BTN_PLAY |

### Missing tr() calls ({{N}})
| File:Line | Property | Current value |
|-----------|----------|---------------|
| ... | text | "Game Over" |

### Scene hardcoded text ({{N}})
| Scene | Node | Property | Value |
|-------|------|----------|-------|
| ... | ... | text | "Score: 0" |
```

### /localize extract
Generate translation files from codebase:

1. Collect all `tr("KEY")` calls
2. Collect all translation keys from dialogue data files
3. Generate CSV or PO file template with all keys
4. Flag keys with no English source text

Output: translation template file with all discovered keys.

### /localize validate
Validate existing translations:

1. Check for **orphan keys** (in translation file but not in code)
2. Check for **missing keys** (in code but not in translation file)
3. Validate **placeholders** match between languages (`{player_name}` present in all)
4. Check **string length** (translations >2x source length may overflow UI)
5. Verify **format specifiers** match (`%s`, `%d` count matches)

### /localize report
Full localization readiness report combining scan + validate:

```
## Localization Report
**Date:** {{DATE}} | **Readiness:** {{%}}

### Coverage
| Language | Keys translated | Coverage |
|----------|----------------|----------|
| en | {{N}}/{{TOTAL}} | 100% |
| ... | ... | ... |

### Issues
- Hardcoded strings: {{N}}
- Missing tr() calls: {{N}}
- Orphan keys: {{N}}
- Missing translations: {{N}}
- Placeholder mismatches: {{N}}

### Recommendation
{{READY|NOT_READY}} — {{DETAILS}}
```
