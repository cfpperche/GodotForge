#!/bin/bash
# PostToolUse hook: validate asset files written by the agent
# Enforces naming conventions and validates data files

set -euo pipefail

INPUT=$(cat 2>/dev/null || true)
if [[ -z "$INPUT" ]]; then exit 0; fi

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

# Only check Write tool
if [[ "$TOOL" != "Write" ]]; then
    exit 0
fi

if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

ERRORS=""
WARNINGS=""

# Check if file is in assets/ directory
if echo "$FILE_PATH" | grep -q "assets/"; then
    FILENAME=$(basename "$FILE_PATH")

    # Enforce lowercase_with_underscores naming
    if echo "$FILENAME" | grep -qP '[A-Z\s\-]'; then
        ERRORS="${ERRORS}Asset naming violation: '$FILENAME' must be lowercase_with_underscores (no uppercase, spaces, or hyphens).\n"
    fi
fi

# Validate JSON data files
if echo "$FILE_PATH" | grep -qE 'assets/data/.*\.json$'; then
    if command -v python3 &>/dev/null; then
        if ! python3 -m json.tool "$FILE_PATH" > /dev/null 2>&1; then
            ERRORS="${ERRORS}Invalid JSON: $FILE_PATH\n"
        fi
    fi
fi

if [[ -n "$ERRORS" ]]; then
    echo "ASSET VALIDATION FAILED"
    echo "======================="
    echo -e "$ERRORS"
    exit 2
fi

if [[ -n "$WARNINGS" ]]; then
    echo -e "$WARNINGS"
fi

exit 0
