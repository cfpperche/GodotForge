---
name: forge-hook-creator
description: "Create or update Claude Code hooks — event-driven automation that fires on tool use, prompt submit, session lifecycle, and 22 other events. Supports command (shell), http, prompt (LLM), and agent handler types. Use when: user wants to automate validation, enforce policies, add context injection, log actions, block dangerous commands, format code on save, or integrate external services into Claude Code workflow."
user_invocable: true
---

# /forge-hook-creator [description]

Create or update Claude Code hooks following the official specification (25 events, 4 handler types).

**CRITICAL:** Before writing any hook, read `references/events.md` for the full event list and `references/checklist.md` for quality validation. Never guess event names or input schemas — consult the reference.

## Progress Checklist

```
- [ ] Step 1: Understand the automation need
- [ ] Step 2: Audit existing hooks
- [ ] Step 3: Choose event + handler type
- [ ] Step 4: Write the hook (script + config)
- [ ] Step 5: Register in settings.json
- [ ] Step 6: Test
- [ ] Step 7: Validate against checklist
```

---

## Step 1: Understand — 🟢 High freedom

1. What should be automated? (validate, block, format, log, inject context)
2. When should it fire? (before tool, after tool, on prompt, on session start)
3. Should it block or just observe?
4. What's the input? What decision does it make?

**Common use cases → event mapping:**

| Use Case | Event | Handler |
|----------|-------|---------|
| Block dangerous bash commands | PreToolUse (matcher: Bash) | command |
| Auto-format code after write | PostToolUse (matcher: Write\|Edit) | command |
| Validate commit messages | PreToolUse (matcher: Bash, if: Bash(git commit*)) | command |
| Inject project context on start | SessionStart | command |
| Ensure task completeness | Stop | prompt |
| Log all tool calls | PostToolUse (matcher: .*) | command |
| Block destructive file deletes | PreToolUse (matcher: Bash, if: Bash(rm *)) | command |
| Validate asset naming | PostToolUse (matcher: Write) | command |
| Add context to every prompt | UserPromptSubmit | command |
| External webhook notification | PostToolUse | http |

---

## Step 2: Audit Existing Hooks — 🔒 Low freedom: must read

### MANDATORY READS:
```
Read: references/events.md — full event list with schemas
Read: references/anti-patterns.md — what NOT to do
Glob: .claude/hooks/* — list existing hooks
Read: .claude/settings.json — current hook configuration
Read: .claude/settings.local.json — local overrides (if exists)
```

1. List existing hooks and their events
2. Check for overlap (don't duplicate)
3. Note patterns used (bash vs python, jq usage)

---

## Step 3: Choose Event + Handler — 🔓 Medium freedom

### 3a. Select Event
Consult `references/events.md`. Key questions:
- Does this event support blocking (exit 2)?
- What matcher values are available?
- What's in the JSON input for this event?

### 3b. Select Handler Type

| Need | Type | When |
|------|------|------|
| Deterministic check (file exists, pattern match) | `command` | Most hooks |
| Complex judgment (is this code good?) | `prompt` | Subjective validation |
| External service notification | `http` | Webhooks, logging services |
| Multi-step verification with tools | `agent` | Complex validation needing file reads |

### 3c. Design Decision Flow

```
Input (stdin JSON)
  → Parse with jq
    → Check condition
      → Pass: exit 0
      → Block: exit 2 + stderr message
      → Modify: stdout JSON with updatedInput
```

---

## Step 4: Write the Hook — 🔒 Low freedom: exact patterns

### Command Hook (bash script)

Template:
```bash
#!/bin/bash
# [EventName] hook: [description]
# Registered in: .claude/settings.json
set -euo pipefail

INPUT=$(cat 2>/dev/null || true)
if [[ -z "$INPUT" ]]; then exit 0; fi

# Parse input
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
# Add more fields as needed from the event schema

# --- Your logic here ---

# Pass: exit 0 (default)
exit 0

# Block: exit 2 + stderr
# echo "BLOCKED: reason" >&2
# exit 2
```

### Command Hook (python script)

Template:
```python
#!/usr/bin/env python3
"""[EventName] hook: [description]"""
import json, sys

try:
    data = json.load(sys.stdin)
except (json.JSONDecodeError, EOFError):
    sys.exit(0)

tool_name = data.get("tool_name", "")
tool_input = data.get("tool_input", {})

# --- Your logic here ---

# Pass
sys.exit(0)

# Block
# print("BLOCKED: reason", file=sys.stderr)
# sys.exit(2)

# Modify input (PreToolUse only)
# output = {"hookSpecificOutput": {"hookEventName": "PreToolUse", "updatedInput": {...}}}
# json.dump(output, sys.stdout)
# sys.exit(0)
```

### Prompt Hook

```json
{
  "type": "prompt",
  "prompt": "Review this tool call. Should it proceed? Tool: $ARGUMENTS. Answer YES to allow, NO to block with a reason.",
  "model": "haiku"
}
```

### HTTP Hook

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/event",
  "headers": {"Authorization": "Bearer $TOKEN"},
  "allowedEnvVars": ["TOKEN"],
  "timeout": 10
}
```

---

## Step 5: Register in settings.json — 🔒 Low freedom: exact format

### Configuration Schema

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolName|OtherTool",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/my-hook.sh",
            "timeout": 30,
            "statusMessage": "Validating..."
          }
        ]
      }
    ]
  }
}
```

### Where to Register

| Scope | File | Shared? |
|-------|------|---------|
| This project only | `.claude/settings.json` | Yes (committed) |
| This project, private | `.claude/settings.local.json` | No (gitignored) |
| All projects | `~/.claude/settings.json` | No |

### Registration Steps

1. Read current settings file
2. Add hook under the correct event key
3. Validate JSON: `cat .claude/settings.json | jq .`
4. If script: make executable `chmod +x .claude/hooks/script.sh`

---

## Step 6: Test — 🔒 Low freedom: must verify

### Test the script standalone:
```bash
# Happy path (should exit 0)
echo '{"tool_name":"Bash","tool_input":{"command":"echo hello"}}' | .claude/hooks/my-hook.sh
echo "Exit code: $?"

# Block path (should exit 2)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | .claude/hooks/my-hook.sh
echo "Exit code: $?"

# Empty input (should exit 0 gracefully)
echo "" | .claude/hooks/my-hook.sh
echo "Exit code: $?"
```

### Test in Claude Code:
```bash
claude --debug  # enables hook debug output
```

---

## Step 7: Validate — 🔒 Low freedom: must check every item

### MANDATORY: Run the full checklist
```
Read: references/checklist.md
```

Check every item. If any fails, fix before shipping.

---

## Do

- READ `references/events.md` before choosing an event
- USE `jq` for JSON parsing (not grep/sed)
- QUOTE all bash variables
- USE `$CLAUDE_PROJECT_DIR` for paths
- SET explicit timeout (<30s for most hooks)
- TEST with both pass and block scenarios
- HANDLE empty stdin gracefully
- USE `set -euo pipefail` in bash hooks
- KEEP hooks fast (<2 seconds)

## Don't

- DON'T guess event names — consult the reference
- DON'T hardcode paths — use env variables
- DON'T create long-running hooks (>10s) without `async: true`
- DON'T rely on hook execution order (they run in parallel)
- DON'T modify global state from hooks
- DON'T log sensitive data (API keys, tokens)
- DON'T use exit 2 on non-blockable events (it does nothing)

---

## Output

Deliver:
1. Hook script at `.claude/hooks/{name}.sh` (or `.py`)
2. Updated settings JSON (`.claude/settings.json` or appropriate file)
3. Test results (3 scenarios: pass, block, empty input)

---

## References

- Full event list + schemas: `references/events.md`
- Anti-patterns: `references/anti-patterns.md`
- Quality checklist: `references/checklist.md`

## Sources

- [Hooks Reference — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Hook Development Skill — Anthropic](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md)
- [Hooks Guide — Claude Code Docs](https://code.claude.com/docs/en/hooks-guide)
- [Claude Code Hooks Mastery](https://github.com/disler/claude-code-hooks-mastery)
