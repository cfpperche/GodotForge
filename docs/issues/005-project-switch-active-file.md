# Issue 005: POST /project doesn't update active-project file

**Priority:** Medium
**Category:** Bug

## Problem

`POST /project` switches the project in `ChatEngine` and `HttpServer` but does NOT update `~/.godotforge/active-project`. The `executeTool()` function in `tool-handlers.ts` reads from that file via `getActiveProjectRoot()`. This means MCP stdio tools still operate on the old project after an HTTP switch.

## Root Cause

`writeActiveProject()` in `http.ts` is only called in the constructor when `isHttpOnly === true`. The `switchProject` handler in `handlers.ts` calls `chatEngine.switchProject()` but not `writeActiveProject()`.

## Fix

In `handleSwitchProject` (handlers.ts), also write the active-project file after switching.
