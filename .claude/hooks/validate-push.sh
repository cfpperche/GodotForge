#!/bin/bash
# PreToolUse hook: validates git push commands
# Prevents force push and warns on protected branches

set -euo pipefail

INPUT=$(cat 2>/dev/null || true)
if [[ -z "$INPUT" ]]; then exit 0; fi
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

if [[ "$TOOL" != "Bash" ]]; then
    exit 0
fi

if ! echo "$COMMAND" | grep -q "git push"; then
    exit 0
fi

# Block force push
if echo "$COMMAND" | grep -qE '\-\-force|\-f'; then
    echo "BLOCKED: Force push is not allowed. Use --force-with-lease if absolutely necessary."
    exit 2
fi

# Warn on protected branches
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    echo "WARNING: Pushing directly to $BRANCH. Ensure:"
    echo "  - MCP server builds (cd mcp-server && npm run build)"
    echo "  - No API keys in committed files"
    echo "  - Conventional commit messages used"
fi

exit 0
