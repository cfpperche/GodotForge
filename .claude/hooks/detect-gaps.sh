#!/bin/bash
# SessionStart hook: detect project gaps and recommend actions
# Outputs warnings only — never blocks (always exit 0)

set -euo pipefail

WARNINGS=""

# Fresh project: no scenes or scripts
SCENE_COUNT=$(find scenes/ -name "*.tscn" 2>/dev/null | wc -l || echo 0)
SCRIPT_COUNT=$(find scripts/ -name "*.gd" 2>/dev/null | wc -l || echo 0)
if [[ "$SCENE_COUNT" -eq 0 ]] && [[ "$SCRIPT_COUNT" -eq 0 ]]; then
    WARNINGS="${WARNINGS}Fresh project detected — consider running /create-game to get started.\n"
fi

# Code without docs: many scripts, few design docs
DOC_COUNT=$(find docs/gdd/ -name "*.md" 2>/dev/null | wc -l || echo 0)
if [[ "$SCRIPT_COUNT" -gt 10 ]] && [[ "$DOC_COUNT" -lt 2 ]]; then
    WARNINGS="${WARNINGS}$SCRIPT_COUNT scripts but only $DOC_COUNT design docs — consider /reverse-document.\n"
fi

# Undocumented prototypes
if [[ -d "prototypes" ]]; then
    for dir in prototypes/*/; do
        if [[ -d "$dir" ]] && [[ ! -f "${dir}README.md" ]]; then
            WARNINGS="${WARNINGS}Prototype '$(basename "$dir")' has no README.md — document findings or delete.\n"
        fi
    done
fi

# Many @export vars but no balance docs
EXPORT_COUNT=$(grep -r "@export" scripts/ 2>/dev/null | wc -l || echo 0)
BALANCE_DOC=$(ls docs/gdd/balance* docs/balance* 2>/dev/null | wc -l || echo 0)
if [[ "$EXPORT_COUNT" -gt 5 ]] && [[ "$BALANCE_DOC" -eq 0 ]]; then
    WARNINGS="${WARNINGS}$EXPORT_COUNT @export tuning values but no balance documentation — consider /balance-check.\n"
fi

# No tests
TEST_COUNT=$(find tests/ -name "*.gd" -o -name "*.test.ts" 2>/dev/null | wc -l || echo 0)
if [[ "$SCRIPT_COUNT" -gt 5 ]] && [[ "$TEST_COUNT" -eq 0 ]]; then
    WARNINGS="${WARNINGS}$SCRIPT_COUNT scripts but no tests found in tests/ — consider adding test coverage.\n"
fi

if [[ -n "$WARNINGS" ]]; then
    echo "=== Project Health Warnings ==="
    echo -e "$WARNINGS"
fi

exit 0
