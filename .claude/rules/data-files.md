---
description: Game Data & Configuration
audience: game-dev
---

# Game Data & Configuration

- Game data in JSON files or Godot Resources (.tres). NEVER hardcode values in GDScript.
- Every JSON data file must have a documented schema: either a `_schema` key or a separate `.schema.json` file.
- Include a `"version": 1` field in every data file. Increment on breaking changes. Write migration scripts.
- Validate data on load — fail fast with clear error: `"Missing required field 'damage' in item 'sword_01'"`.
- Separate data by purpose: balance (tunable numbers), content (items/enemies/levels), config (user preferences).
- Use typed arrays when loading data in GDScript: `var items: Array[ItemData] = []`, never untyped Dictionary chains.
- Three config categories: user prefs (saved per player), game balance (shared, tunable), level data (per scene).
- Support hot-reload during development: watch data files, re-parse on change. Use `FileSystemDock.files_moved` signal.
- Never store derived/computed values — compute from source data at runtime. E.g., store base_damage + multiplier, not final_damage.
- Use StringName or enums for data keys, never raw strings: `const ITEM_SWORD := &"sword_01"` not `"sword_01"`.
- For complex balance: design in spreadsheet (Google Sheets/Excel), export to JSON. Never edit JSON balance files by hand.
