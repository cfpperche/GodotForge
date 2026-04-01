# Hook Quality Checklist

## Design
- [ ] Event chosen correctly (see events.md for full list)
- [ ] Can this event actually block? (only some support exit 2)
- [ ] Matcher pattern is specific (not `.*` unless intentional)
- [ ] Handler type appropriate: command (deterministic), prompt (complex logic), http (external)
- [ ] Timeout set explicitly (not relying on 600s default)

## Configuration
- [ ] Hook registered in correct settings file (project .claude/settings.json or user ~/.claude/settings.json)
- [ ] JSON is valid (test with `jq . < settings.json`)
- [ ] Matcher regex tested against expected tool names
- [ ] `if` pattern correct if using permission rule syntax

## Script (command hooks)
- [ ] Shebang line present (`#!/bin/bash` or `#!/usr/bin/env python3`)
- [ ] `set -euo pipefail` at top (bash)
- [ ] Input read from stdin: `INPUT=$(cat 2>/dev/null || true)`
- [ ] Empty input handled: `if [[ -z "$INPUT" ]]; then exit 0; fi`
- [ ] jq used for JSON parsing (not grep/sed on JSON)
- [ ] All variables quoted (`"$VARIABLE"`, not `$VARIABLE`)
- [ ] Uses `$CLAUDE_PROJECT_DIR` not hardcoded paths
- [ ] Exit code correct: 0=pass, 2=block, other=non-blocking error
- [ ] stderr used for block messages (exit 2), not stdout
- [ ] Script is executable (`chmod +x`)
- [ ] Runs in <2 seconds (hooks should be fast)

## Security
- [ ] No sensitive data logged (API keys, tokens)
- [ ] Input validated (tool_name checked before acting)
- [ ] Path traversal prevented (if handling file paths)
- [ ] No global state modification

## Testing
- [ ] Tested with `echo '{"tool_name":"Bash","tool_input":{"command":"test"}}' | ./hook.sh`
- [ ] Tested exit code 0 (pass through)
- [ ] Tested exit code 2 (block scenario)
- [ ] Tested with empty stdin (graceful handling)
- [ ] Tested in Claude Code with `claude --debug`
