# Issue #002: EditorDebuggerPlugin IPC has ~13s latency

## Problem

Messages sent via `EditorDebuggerPlugin.send_message()` are arriving at the game process with ~13 second delays. Expected: <100ms.

## Evidence

Debug log from game_capture.gd shows:
- First input at t=11722
- Second input at t=24909 (13s later)
- Third input at t=36206 (11s later)

Agent sent inputs 1.5s apart, but game receives them ~13s apart.

## Hypothesis

The editor's debugger message queue might be batched or throttled. Or `OS.delay_msec()` in the editor-side polling (runtime_tools.gd) is blocking the editor main thread and preventing debugger messages from being dispatched.

## Workaround

Use `parse_input_event(InputEventKey)` directly instead of `Input.action_press()`. This generates real events in the input pipeline.

## Priority

High — blocks autonomous play-testing.

## Status

Resolved — migrated all IPC to OS temp dir file-based polling. EditorDebuggerPlugin kept for connection status only.
