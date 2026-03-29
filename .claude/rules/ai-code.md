# AI & NPC Behavior

- Budget 2ms/frame MAX for all AI systems combined. Profile before adding complexity.
- Use behavior trees or utility-based AI. Never nested if/else chains for decision logic.
- ALL AI parameters data-driven: detection range, aggression, patrol speed via @export or JSON. Never hardcoded.
- Navigation via NavigationAgent2D/3D — never implement manual pathfinding.
- Separate perception (sensors, raycasts, area detection) from decision logic (behavior tree) from actions (movement, attack).
- Debug visualization: draw_line/draw_circle for paths, sensor ranges, decision states. Gate behind a debug flag.
- Log state transitions: `[AI:%s] %s → %s` with entity name and reason. Rate-limit to avoid spam.
- Never use frame-count logic — use Timers or accumulated delta for AI update intervals.
- Batch expensive operations: group raycasts, stagger AI updates across frames (not all enemies on same frame).
- Every AI state must have a fallback/timeout: stuck → re-path, target lost → return to patrol, unreachable → give up.
- LOD for AI: off-screen entities reduce update frequency (every 0.5s instead of every frame). Use VisibleOnScreenNotifier2D/3D.
- Avoid allocations in AI hot paths — pre-allocate arrays, reuse navigation queries.
