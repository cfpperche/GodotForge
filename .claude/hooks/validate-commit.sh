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

# Check for hardcoded API keys in staged changes (skip .md and .sh files)
if git diff --cached -- '*.ts' '*.tsx' '*.js' '*.json' '*.py' '*.gd' 2>/dev/null | grep -qiE 'sk-ant-api|sk-ant-admin|ANTHROPIC_API_KEY\s*=\s*"[^"]{20,}'; then
    ERRORS="${ERRORS}BLOCKED: Staged changes appear to contain hardcoded API keys.\n"
fi

# Check that modified .ts source files have corresponding .test.ts files staged
STAGED_TS=$(git diff --cached --name-only 2>/dev/null | grep -E '^mcp-server/src/.*\.ts$' | grep -vE '\.test\.ts$|\.d\.ts$|/types\.ts$' || true)
if [[ -n "$STAGED_TS" ]]; then
    MISSING_TESTS=""
    for src_file in $STAGED_TS; do
        test_file="${src_file%.ts}.test.ts"
        # Skip files that are pure re-exports or configs (< 20 lines of logic)
        line_count=$(git diff --cached -- "$src_file" 2>/dev/null | grep -c '^+[^+]' || true)
        if [[ "$line_count" -lt 5 ]]; then
            continue
        fi
        # Check if test file exists anywhere (staged or in repo)
        if ! git diff --cached --name-only 2>/dev/null | grep -q "$test_file" && ! [[ -f "$test_file" ]]; then
            MISSING_TESTS="${MISSING_TESTS}  - $src_file → missing $test_file\n"
        fi
    done
    if [[ -n "$MISSING_TESTS" ]]; then
        WARNINGS="${WARNINGS}Modified source files without corresponding test files:\n${MISSING_TESTS}Consider adding tests per TDD rules.\n"
    fi
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
