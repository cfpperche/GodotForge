# ADR-001: Hybrid MCP Server + Native Godot Plugin

**Date**: 2026-03-27
**Status**: Accepted
**Deciders**: Project owner + Claude

## Context

GodotForge needs to serve users with Claude Max/Pro subscriptions (via Claude Code/Cursor) AND users who want a standalone experience inside Godot (via API key). A pure MCP server can't provide native UI; a pure plugin can't leverage MCP client subscriptions.

## Decision

Build a hybrid: a GDScript plugin with HTTP server bridge + a TypeScript MCP server that connects to it. Three auth modes: MCP+Claude Code, MCP+Cursor, native chat with API key.

## Alternatives Considered

| Alternative | Pros | Cons |
|------------|------|------|
| MCP server only | Simpler, one codebase | No native Godot UI, requires external editor |
| Plugin only (direct API) | Self-contained, no sidecar | Can't leverage Max subscriptions, no MCP ecosystem |
| Plugin + Python sidecar (Agent SDK) | Access to Agent SDK features | Python dependency, harder distribution |

## Consequences

### Positive
- Reaches all user segments (Max, Cursor, API key)
- Plugin tools are shared — single source of truth for editor operations
- MCP server adds value (docs engine, context) without bloating the plugin

### Negative
- Tool definitions duplicated in GDScript + TypeScript (accepted tradeoff)
- Two codebases to maintain (GDScript + TypeScript)
- HTTP bridge adds a network hop for MCP mode
