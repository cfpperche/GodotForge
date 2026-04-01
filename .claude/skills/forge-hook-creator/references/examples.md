# Examples — Hook Creation

## Example 1: Block Dangerous Commands (Happy Path)

**Input:** "Create a hook that blocks `rm -rf` commands"

**Expected behavior:**
1. Event: PreToolUse, matcher: Bash
2. Script reads stdin, parses tool_input.command via jq
3. Checks if command matches `rm -rf` pattern
4. If match: exit 2, stderr: "BLOCKED: rm -rf is dangerous"
5. If no match: exit 0 (pass through)
6. Registered in .claude/settings.json under PreToolUse
7. Tested with 3 scenarios

**Failure indicators:**
- Hook doesn't parse JSON (uses grep instead of jq)
- Missing `set -euo pipefail`
- Doesn't handle empty stdin

## Example 2: Auto-Format on Write (PostToolUse)

**Input:** "Format TypeScript files after Claude writes them"

**Expected behavior:**
1. Event: PostToolUse, matcher: Write|Edit
2. Script reads tool_input.file_path
3. Checks if file ends in .ts or .tsx
4. Runs `npx prettier --write "$FILE_PATH"`
5. Exit 0 always (formatting is non-blocking)
6. Timeout: 10 seconds

**Failure indicators:**
- Uses PreToolUse instead of PostToolUse (formats before file exists)
- No file extension check (formats .png files)
- No timeout (prettier hangs on large files)

## Example 3: Edge Case — Hook for Event That Can't Block

**Input:** "Create a hook that blocks notifications"

**Expected behavior:**
- Agent checks events.md → Notification cannot block (exit 2 has no effect)
- Agent informs user: "Notification hooks are observe-only. Exit 2 won't block."
- Creates the hook for logging/observation instead of blocking
- Documents the limitation in the hook script comments

**Failure indicators:**
- Creates a blocking hook on a non-blockable event
- Doesn't check events.md for "Can Block?" column

## Counter-Example: Over-Engineered Hook

**Input:** "Log all tool calls"

**Bad:** Creates a Python script with SQLite database, asyncio, and a REST API endpoint.

**Good:** 3-line bash script:
```bash
#!/bin/bash
set -euo pipefail
INPUT=$(cat 2>/dev/null || true)
echo "$INPUT" >> "$CLAUDE_PROJECT_DIR"/.claude/hooks/tool-log.jsonl
```
