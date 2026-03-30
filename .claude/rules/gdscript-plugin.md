---
description: GDScript-specific coding standards for the Godot plugin
paths: ["addons/godotforge/**"]
audience: internal
---

# GDScript Plugin Rules

- Every file must start with `@tool`.
- Use `class_name` for classes referenced across files.
- Use static typing everywhere: `var x: String = ""`, never `var x`.
- Prefix private methods/vars with `_`.
- Access `EditorInterface` as a singleton — never pass it as a parameter.
- Scene modifications must set `node.owner = root` for serialization.
- Use signals for async communication between components.
- Use `FileAccess` for raw text I/O, `ResourceLoader` for Godot resources.
- HTTP server polls in `_process()` on main thread — this is intentional for EditorInterface access.
- No `print()` in production — use signals to surface info to the UI.
