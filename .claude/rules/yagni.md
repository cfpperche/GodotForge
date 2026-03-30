---
description: You Aren't Gonna Need It — build only what's needed now
paths: ["addons/godotforge/**", "mcp-server/src/**"]
audience: internal
---

# YAGNI (You Aren't Gonna Need It)

- Don't build features until the roadmap phase calls for them.
- No config options for things that have one valid value today.
- No abstraction layers "in case we need to swap X later".
- No generic frameworks for one-off operations.
- If a tool isn't in the current phase, don't scaffold it. The roadmap exists for a reason.
- Delete dead code immediately. Don't keep it "just in case" — git has history.
