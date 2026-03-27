---
description: DRY principle — avoid unnecessary duplication
paths: ["addons/godotforge/**", "mcp-server/src/**"]
---

# DRY (Don't Repeat Yourself)

- Tool definitions exist in TWO places by design (`claude_tools.gd` + `tools.ts`) — this is the ONE accepted duplication. Keep them in sync.
- Shared logic goes in `tool_base.gd` (GDScript) or shared utilities (TypeScript).
- If you copy-paste more than 3 lines, extract a function.
- Reuse existing helpers: `_find_node_by_path()`, `_get_edited_scene_root()` — don't reimplement.
