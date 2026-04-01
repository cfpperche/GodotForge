# Anti-Patterns — Hook Creation

| Pattern | Instead |
|---------|---------|
| **Long-running hook** (>10s) | Keep hooks fast (<2s). Use async:true for background work |
| **Hardcoded paths** | Use `$CLAUDE_PROJECT_DIR`, `$CLAUDE_PLUGIN_ROOT` |
| **Unquoted variables** | Always quote: `"$CLAUDE_PROJECT_DIR"/.claude/hooks/script.sh` |
| **No input validation** | Always `jq -r '.tool_name // empty'` with fallback |
| **Missing exit code** | Exit 0 (pass), exit 2 (block), others (non-blocking error) |
| **Blocking non-blockable event** | Only some events support exit 2. Check events.md |
| **Relying on execution order** | Hooks run in parallel — design for independence |
| **Modifying global state** | Hooks should be side-effect free (except logging) |
| **No timeout set** | Always set timeout (default 600s is too long for most hooks) |
| **Missing jq dependency** | Check `command -v jq` before parsing JSON |
| **Logging sensitive data** | Never log API keys, tokens, or user content |
| **stderr for success output** | Use stdout for JSON output, stderr only for errors |
| **Using hook for complex logic** | Use `type: "prompt"` for complex decisions instead of bash |
