---
name: code-review
description: Architectural and quality code review
user_invocable: true
---

# /code-review

Perform a structured code review on specified files or recent changes.

## Arguments
- File path(s) to review, OR
- No argument: review all uncommitted changes (`git diff`)

## Review Checklist

### 1. Standards Compliance
- [ ] Static typing used (`var x: String`, not `var x`)
- [ ] Methods < 20 lines
- [ ] No magic numbers (constants used)
- [ ] No commented-out code
- [ ] Private members prefixed with `_`
- [ ] `@tool` present on all plugin GDScript files

### 2. Architecture
- [ ] Layer boundaries respected (UI → API → Tools → Editor)
- [ ] No framework leakage (MCP types in plugin or vice versa)
- [ ] Tool input/output follows boundary contract (`Dictionary` in, `{"result","is_error"}` out)
- [ ] Dependencies point inward

### 3. SOLID Compliance
- [ ] Single responsibility per class/file
- [ ] New tools extend via registry, not modification
- [ ] Tool handlers interchangeable via base class
- [ ] Input schemas minimal

### 4. Security
- [ ] No hardcoded API keys or secrets
- [ ] File paths validated against project root
- [ ] HTTP server localhost-only
- [ ] Input validated before use

### 5. Error Handling
- [ ] Errors return `{"is_error": true}` with actionable message
- [ ] No silently swallowed errors
- [ ] HTTP status codes correct (400/404/422/500)

### 6. DRY / KISS / YAGNI
- [ ] No unnecessary duplication (except tool defs in both languages)
- [ ] No premature abstractions
- [ ] No features beyond current phase scope

## Output

```
## Code Review: [file/scope]

**Verdict**: APPROVED | APPROVED WITH SUGGESTIONS | CHANGES REQUIRED

### Issues Found
- [REQUIRED] description
- [SUGGESTION] description

### Positive Observations
- What's done well

### Summary
Brief overall assessment
```
