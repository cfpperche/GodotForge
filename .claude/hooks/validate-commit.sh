#!/bin/bash
# PreToolUse hook: validates git commit commands
# Checks conventional commit format and prevents committing secrets

set -euo pipefail

INPUT=$(cat 2>/dev/null || true)
if [[ -z "$INPUT" ]]; then exit 0; fi
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

# Only check bash commands that are git commits
if [[ "$TOOL" != "Bash" ]]; then
    exit 0
fi

if ! echo "$COMMAND" | grep -q "git commit"; then
    exit 0
fi

ERRORS=""
WARNINGS=""

# Check conventional commit format
if echo "$COMMAND" | grep -q '\-m'; then
    MSG=$(echo "$COMMAND" | grep -oP '(?<=-m\s")[^"]*|(?<=-m\s'"'"')[^'"'"']*' | head -1)
    if [[ -n "$MSG" ]]; then
        if ! echo "$MSG" | grep -qP '^(feat|fix|docs|refactor|test|chore)(\(.+\))?!?:'; then
            WARNINGS="${WARNINGS}Commit message doesn't follow conventional commits format (feat|fix|docs|refactor|test|chore)(scope): description\n"
        fi
    fi
fi

# Check for secrets in staged files
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
if echo "$STAGED" | grep -qiE '\.env$|\.api_key$|credentials|secret'; then
    ERRORS="${ERRORS}BLOCKED: Attempting to commit files that may contain secrets: $(echo "$STAGED" | grep -iE '\.env$|\.api_key$|credentials|secret')\n"
fi

# Check for hardcoded API keys in staged changes
if git diff --cached 2>/dev/null | grep -qiE 'sk-ant-|api_key\s*=\s*"[^"]{10,}'; then
    ERRORS="${ERRORS}BLOCKED: Staged changes appear to contain hardcoded API keys.\n"
fi

# Output results
if [[ -n "$ERRORS" ]]; then
    echo "COMMIT VALIDATION FAILED"
    echo "========================"
    echo -e "$ERRORS"
    exit 2
fi

if [[ -n "$WARNINGS" ]]; then
    echo "COMMIT WARNINGS"
    echo "==============="
    echo -e "$WARNINGS"
fi

exit 0
