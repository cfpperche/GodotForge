#!/bin/bash
# PreCompact hook: save context before Claude Code compresses conversation history

set -euo pipefail

STATE_FILE="docs/session-state.md"
mkdir -p docs

{
    echo ""
    echo "## [COMPACTION] $(date -Iseconds)"
    echo ""

    # Current branch and status
    echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
    echo ""

    # Uncommitted changes
    CHANGES=$(git status --short 2>/dev/null || true)
    if [[ -n "$CHANGES" ]]; then
        echo "Uncommitted:"
        echo "$CHANGES"
        echo ""
    fi

    # Recent commits since last compaction
    echo "Recent commits:"
    git log --oneline -5 2>/dev/null || echo "  (none)"
    echo ""

    # In-progress sprint tasks
    SPRINT=$(ls -t docs/sprints/sprint-*.md 2>/dev/null | head -1)
    if [[ -n "$SPRINT" ]]; then
        echo "Active sprint: $(basename "$SPRINT")"
        grep -E "^\- \[ \]" "$SPRINT" 2>/dev/null | head -5 || true
    fi

} >> "$STATE_FILE" 2>/dev/null

exit 0
