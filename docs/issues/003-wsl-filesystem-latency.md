# Issue #003: WSL2↔Windows filesystem latency causes ~12s input delay

## Problem

The editor (Node.js on WSL2) writes trigger files to the WSL filesystem. The game (Godot on Windows) polls for these files via `\\wsl.localhost\Ubuntu\...` UNC paths. Cross-boundary file operations have **~10-15 second latency** for `FileAccess.file_exists()` calls.

## Evidence

- Editor writes `input_request` file via WSL path
- Game's `_process()` polls with `FileAccess.file_exists()` every frame
- File is consumed eventually, but with ~12s delay
- Same latency affects debugger IPC (messages routed through same pipe)

## Root Cause

WSL2 uses a 9P filesystem for cross-OS file access. Metadata operations (exists, stat) through `\\wsl.localhost\` are inherently slow due to the plan9 protocol overhead.

## Solution Options

1. **Write trigger files to Windows temp dir** (`C:\Users\cfpp\AppData\Local\Temp\godotforge\`) — native NTFS, no 9P overhead
2. **Use TCP socket** between editor plugin and game autoload (localhost, zero filesystem)
3. **Use named pipe** (Windows) or Unix socket

## Recommended

Option 1 is simplest — ConfigManager already has `windows_temp` path. Write triggers there instead of `res://.godotforge/`.

## Priority

Critical — blocks all real-time interaction with running games.

## Status

Resolved — all trigger files now use `OS.get_temp_dir()` (native NTFS). Input, capture, state all via Windows temp dir.
