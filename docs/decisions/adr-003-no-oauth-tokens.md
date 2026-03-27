# ADR-003: GodotForge Never Touches OAuth/Subscription Tokens

**Date**: 2026-03-27
**Status**: Accepted
**Deciders**: Project owner + Claude

## Context

Anthropic prohibits third-party tools from using Claude subscription OAuth tokens (Max/Pro plans). Users want to leverage their subscriptions.

## Decision

GodotForge is a pure MCP tool provider. It never reads, stores, or proxies OAuth tokens. MCP clients (Claude Code, Cursor) handle their own auth. The native chat panel uses API keys only.

## Alternatives Considered

| Alternative | Pros | Cons |
|------------|------|------|
| Accept OAuth tokens from users | Users save money | Violates Anthropic ToS, account bans |
| Proxy through own backend | Could offer subscription-like pricing | Complex infra, ToS violation, security risk |
| API key only (no MCP) | Simplest | Excludes Max/Pro users who don't want to pay per-token |

## Consequences

### Positive
- Fully compliant with Anthropic policies
- Max users get value through Claude Code MCP
- Zero auth infrastructure to maintain

### Negative
- Native chat mode requires separate API key (pay-per-token)
- Can't offer a unified "login with Claude" experience
