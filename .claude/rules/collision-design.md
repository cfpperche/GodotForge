---
description: Collision Design and Testing Standards for 3D Games
audience: game-dev
---

# Collision Design Standards (3D)

## Layer/Mask Definition

- Define ALL collision layers in project.godot under `[layer_names_3d_physics]` before writing any collision code.
- Standard layer names: `environment`, `player`, `enemies`, `pickups`, `detection` (area sensors only).
- Document layer assignments in the GDD. Every layer must have a named owner and purpose.
- Use named constants in GDScript — `const LAYER_ENVIRONMENT := 1` — never raw bitmask integers.
- Player `collision_mask` must explicitly include every layer the player should physically interact with.
- SpringArm3D `collision_mask` MUST include the `environment` layer or the camera clips through walls.

## Collision Geometry Rules

- Every visual obstacle (wall, floor, ceiling, door, ramp) MUST have a `CollisionShape3D` on a `StaticBody3D`.
- **GLB imports are visual-only.** Imported meshes have NO collision. Always add `StaticBody3D + CollisionShape3D` manually after import.
- Build collision room-by-room — one `StaticBody3D` per wall/floor/ceiling surface. Never use a single giant box for a whole level.
- Internal walls between rooms and corridors are REQUIRED. Open-plan collision causes player bleed-through.
- `CollisionShape3D` position, rotation, and scale must match the visual mesh exactly. Misaligned shapes cause invisible walls or ghost gaps.
- Prefer `BoxShape3D` for walls/floors, `CapsuleShape3D` for pillars, `ConcavePolygonShape3D` only for complex static terrain (expensive — never on moving bodies).
- `Area3D` detects — it does NOT block movement. Never substitute `Area3D` where `StaticBody3D` is needed.

## Verification Checklist (mandatory before Phase 9)

1. **Layer coverage** — every visual obstacle has a `CollisionShape3D` on a `StaticBody3D`.
2. **Mask correctness** — `Player.collision_mask` includes all obstacle layers; cross-check against project.godot.
3. **No floating geometry** — every `MeshInstance3D` in the level has corresponding collision.
4. **GLB imports** — confirm all imported models have collision added manually.
5. **Internal walls** — corridors and room boundaries are separated by explicit collision geometry.
6. **SpringArm3D mask** — camera collision mask includes `environment` layer.

## Testing Protocol

```
1. run_scene
2. simulate_input: move_forward × 10 toward each wall (N, S, E, W)
3. get_runtime_state: verify player.position stopped at visual boundary
4. Repeat for all 4 cardinal directions + 4 diagonals
5. take_game_screenshot: visual confirmation — no clipping, no floating
6. stop_scene
```

## Common Bugs and Prevention

| Bug | Prevention |
|-----|------------|
| GLB imported without collision | Always add `StaticBody3D + CollisionShape3D` after every GLB import |
| One giant collision box | Split per room surface — wall, floor, ceiling as separate shapes |
| Player mask missing obstacle layer | Cross-check `collision_mask` against project.godot layer list |
| `CollisionShape3D` offset from mesh | Verify position/rotation match in editor Transform panel |
| `Area3D` used instead of `StaticBody3D` | Area3D = detection only; StaticBody3D = physical blocking |
| SpringArm3D clips walls | Add `environment` layer to SpringArm3D `collision_mask` |
