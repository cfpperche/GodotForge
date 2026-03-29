#!/bin/bash
# Stop hook: persist session state for recovery in next session

set -euo pipefail

STATE_FILE="docs/session-state.md"
mkdir -p docs

{
    echo "# Session State — $(date -Iseconds)"
    echo ""

    # Recent commits this session
    echo "## Recent Commits"
    git log --oneline -3 2>/dev/null || echo "  (none)"
    echo ""

    # Uncommitted changes
    CHANGES=$(git status --short 2>/dev/null || true)
    if [[ -n "$CHANGES" ]]; then
        echo "## Uncommitted Changes"
        echo "$CHANGES"
        echo ""
    fi

    # Current branch
    echo "## Branch"
    echo "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"

} > "$STATE_FILE" 2>/dev/null

# Clean up temp files
rm -f .godotforge/debug.log .godotforge/capture_request .godotforge/game_screenshot.png .godotforge/runtime_state.json 2>/dev/null

exit 0
