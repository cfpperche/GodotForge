---
description: Scene Architecture
audience: game-dev
---

# Scene Architecture

- Every scene is self-contained and reusable. No external dependencies that aren't injected.
- Single root node with clear responsibility. Name matches the scene file.
- Shallow hierarchy — deep nesting kills performance and readability. Max 4-5 levels.
- PackedScene for instantiation, never duplicate nodes manually.
- Node.owner = root ALWAYS set when adding nodes programmatically.
- Use @onready for child references, typed with explicit paths.
- Scene composition: prefer instancing sub-scenes over monolithic trees.
- Collision setup: define layers/masks in project settings, reference by name.
- Resource sharing: materials, meshes, shapes shared via .tres files, not duplicated per instance.
- Scene transitions: use SceneTree.change_scene_to_packed() or custom transition manager.
