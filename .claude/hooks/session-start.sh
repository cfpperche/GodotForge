#!/bin/bash
# SessionStart hook: show project context for the agent
# Displays branch, recent commits, sprint, issues, TODOs, and session recovery

set -euo pipefail

echo "=== GodotForge Session Start ==="

# Current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "Branch: $BRANCH"

# Last 5 commits
echo ""
echo "Recent commits:"
git log --oneline -5 2>/dev/null || echo "  (no git history)"

# Active sprint
SPRINT=$(ls -t docs/sprints/sprint-*.md 2>/dev/null | head -1)
if [[ -n "$SPRINT" ]]; then
    echo ""
    echo "Active sprint: $SPRINT"
    head -3 "$SPRINT" 2>/dev/null || true
fi

# Open issues
ISSUE_COUNT=$(ls docs/issues/*.md 2>/dev/null | wc -l || echo 0)
if [[ "$ISSUE_COUNT" -gt 0 ]]; then
    echo ""
    echo "Open issues: $ISSUE_COUNT"
    ls docs/issues/*.md 2>/dev/null | while read f; do
        echo "  - $(basename "$f" .md)"
    done
fi

# TODO/FIXME count
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" scripts/ addons/ mcp-server/src/ 2>/dev/null | wc -l || echo 0)
if [[ "$TODO_COUNT" -gt 0 ]]; then
    echo ""
    echo "TODOs in codebase: $TODO_COUNT"
fi

# Session state recovery
if [[ -f "docs/session-state.md" ]]; then
    echo ""
    echo "Previous session state:"
    tail -10 "docs/session-state.md" 2>/dev/null || true
fi

echo ""
echo "=== Ready ==="
exit 0
