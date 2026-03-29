---
name: perf-profile
description: Performance analysis — scan for CPU, memory, rendering, and I/O bottlenecks. Produces prioritized optimization report.
user_invocable: true
---

# /perf-profile [system|full]

Analyze performance by scanning code for common bottlenecks. If argument is a system name, focus there; otherwise analyze the full project.

## Phase 1: Scope
- If system specified: find all scripts related to that system
- If full: `list_files` to get all `.gd` scripts, count total
- Establish frame budget: 16.67ms at 60fps, 8.33ms at 120fps

## Phase 2: Budget Review
- Count nodes: `get_scene_tree` for main scene
- Count physics bodies, collision shapes, particles
- Estimate per-frame cost based on node types

## Phase 3: Codebase Analysis

**CPU hotspots:**
- `_process` without `set_process(false)` when inactive
- `get_node()` or `find_child()` inside `_process` (cache in @onready)
- Allocations in hot paths (Array.append in _process, String concatenation)
- Nested loops over node collections

**Memory:**
- Scenes instantiated but never freed (leak)
- Large textures loaded but not visible
- Missing `queue_free()` for spawned objects

**Rendering:**
- Overdraw: overlapping transparent sprites/particles
- GPU particles count vs visual impact
- Uncompressed textures, oversized assets

**I/O:**
- File reads in _process (should be cached)
- Synchronous resource loads (use ResourceLoader.load_threaded)

## Phase 4: Report
Categorize findings:
| Category | Issue | File:Line | Impact | Fix Complexity |
|----------|-------|-----------|--------|----------------|

## Phase 5: Top-3 Summary
Pick the 3 highest-impact, lowest-effort optimizations. For each:
- What: the specific change
- Why: estimated frame time savings
- How: concrete code change or approach
