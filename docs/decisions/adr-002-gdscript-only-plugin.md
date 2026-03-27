# ADR-002: GDScript-Only Plugin (No C#, No GDExtension)

**Date**: 2026-03-27
**Status**: Accepted
**Deciders**: Project owner + Claude

## Context

Godot supports GDScript, C#, and GDExtension (C/C++/Rust). The plugin needs maximum compatibility across Godot builds.

## Decision

Use GDScript exclusively for the plugin. No C#, no GDExtensions, no external binary dependencies.

## Alternatives Considered

| Alternative | Pros | Cons |
|------------|------|------|
| C# | Stronger typing, familiar to Unity devs | Requires .NET build of Godot (~40% of users excluded) |
| GDExtension | Native performance, SQLite access | Platform-specific binaries, complex build/distribution |
| GDScript + GDExtension for SQLite | Best of both | Still needs platform binaries for docs engine |

## Consequences

### Positive
- Compatible with 100% of Godot 4.x users
- Simple distribution (copy addons/ folder)
- Community-expected language for editor plugins

### Negative
- No native SQLite access (docs engine lives in MCP server instead)
- GDScript performance limitations (acceptable for editor tools)
