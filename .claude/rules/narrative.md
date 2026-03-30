---
description: Narrative & Dialogue
audience: game-dev
---

# Narrative & Dialogue

- Dialogue in external data files (JSON, CSV, or Yarn Spinner format). NEVER write dialogue strings in GDScript.
- Branching: use node IDs with next-pointers, not nested data structures. Each dialogue node has `id`, `text`, `next`, `choices`.
- All dialogue strings localization-ready: use translation keys (`"DLG_INTRO_01"`), resolved via `tr()` at display time.
- Variable interpolation: `{player_name}`, `{item_count}` syntax in dialogue text. Resolve variables at display time, not at load.
- Character data (name, portrait, voice_id) separate from dialogue data. Reference characters by ID, not inline.
- Trigger dialogue via signals: `dialogue_requested.emit(dialogue_id)`. Never call dialogue system directly from gameplay code.
- Support multiple dialogue formats: linear (cutscene), branching (choices), hub (NPC with topic list).
- Audio hooks: emit `line_displayed(character_id, line_id)` signal per line. Audio system handles voice/SFX separately.
- Conditions as data, not code: `"requires": {"item": "key", "quest": "dungeon_clear"}`. Dialogue system evaluates at runtime.
- Validate: all dialogue paths must be reachable. No orphan nodes (unreferenced by any choice or trigger).
- Keep dialogue short: 2-3 sentences per bubble maximum. Break long speeches into multiple sequential nodes.
