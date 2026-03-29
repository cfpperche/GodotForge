#!/bin/bash
# PreToolUse hook: auto-build MCP server before test/run commands
# Ensures dist/ is always up-to-date

set -euo pipefail

INPUT=$(cat 2>/dev/null || true)
if [[ -z "$INPUT" ]]; then exit 0; fi
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

if [[ "$TOOL" != "Bash" ]]; then
    exit 0
fi

# Trigger build when running MCP server or tests
if echo "$COMMAND" | grep -qE 'node.*mcp-server/dist|npm start|npm test|vitest'; then
    # Check if src is newer than dist
    SRC_DIR="mcp-server/src"
    DIST_DIR="mcp-server/dist"

    if [[ -d "$SRC_DIR" ]]; then
        NEWEST_SRC=$(find "$SRC_DIR" -name "*.ts" -newer "$DIST_DIR/index.js" 2>/dev/null | head -1)
        if [[ -n "$NEWEST_SRC" ]]; then
            echo "MCP server source changed — rebuilding..."
            cd mcp-server && npx tsc 2>&1
            if [[ $? -ne 0 ]]; then
                echo "BLOCKED: MCP server build failed. Fix TypeScript errors before running."
                exit 2
            fi
            echo "Build successful."
        fi
    fi
fi

exit 0
