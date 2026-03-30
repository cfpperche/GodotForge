---
description: SOLID principles applied to GodotForge architecture
paths: ["addons/godotforge/**", "mcp-server/src/**"]
audience: internal
---

# SOLID

- **S**ingle Responsibility: one class = one reason to change. `scene_tools.gd` handles scenes, not scripts.
- **O**pen/Closed: extend via new tool handlers, don't modify `tool_registry.gd` core logic.
- **L**iskov Substitution: all tool handlers must be interchangeable via `GodotForgeToolBase`.
- **I**nterface Segregation: keep tool input schemas minimal — only required params.
- **D**ependency Inversion: tools depend on abstractions (`tool_base.gd`), not concrete implementations.
