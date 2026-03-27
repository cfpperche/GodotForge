# Handoff Manifest — GodotForge

**Generated:** 2026-03-27 · **Skill:** saas-ideation

## Artifacts Produced

| Artifact | File | Score |
|----------|------|-------|
| Opportunity Map | docs/godotforge-opportunity-map.md | — |
| Concept Brief | docs/godotforge-concept-brief.md | 85/100 |
| Handoff Manifest | docs/godotforge-handoff.md | — |

## Concept Summary

GodotForge is the all-in-one MCP server for Godot Engine, combining 4 layers that today require separate tools:

1. **Editor Tools** — scene/node/script manipulation (free tier)
2. **Docs Engine** — version-aware Godot docs, no hallucinations (free tier)
3. **Testing Tools** — screenshots, input simulation, closed-loop (Pro)
4. **Context Engine** — project memory, patterns, architecture (Pro)

**Pricing:** Free (15 tools) / Pro $12/mo (45 tools) / Team $29/mo per seat
**Timeline:** 8-10 weeks MVP
**Moat:** Context data + version-aware docs + integrated layers

## Key Decisions Made During Ideation

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pricing model | Subscription (not one-time) | TAM too small for one-time. $19 x 3K buyers = $57K total. Subscription sustains. |
| Source model | Closed-source with free tier | Godot community hostile to open-core bait. Clean closed + generous free tier. |
| Tech stack | Node.js + TypeScript + HTTP bridge | GDExtension too slow to learn. Node.js = fastest path. Official MCP SDK is TS. |
| Differentiation | Docs-aware + context (not closed-loop) | Closed-loop is table stakes (MCP Pro has it for $5). Docs + context is the real gap. |
| Timeline | 8-10 weeks (not 4-6) | Market already has 20+ MCPs. Quality > speed. But not 6 months — market moves fast. |
| Tool count | 45 quality-first (not 163 quantity) | 163 tools = token bloat for LLMs. 45 well-tested tools > 163 half-working ones. |

## Devil's Advocate Findings (incorporated)

- One-time pricing is financial suicide in small TAM → switched to subscription
- Open-core alienates Godot community → switched to closed + free tier
- Closed-loop is not differentiation (MCP Pro has it) → made it Pro feature, not core identity
- 4-week launch too fast for quality → extended to 8-10 weeks
- GDExtension unnecessary → Node.js HTTP bridge

## Next Step → saas-architect

Upload the concept brief and run:

```
Use saas-architect. Here is my concept brief for GodotForge:
[attach docs/godotforge-concept-brief.md]
Execute the full pipeline: Market Intel → PRD → Roadmap → Mock → Landing → CLAUDE.md
```

## Sources Used (11 total)

1. [Game Engine Market - Fortune Business Insights](https://www.fortunebusinessinsights.com/game-engine-market-111802)
2. [Godot Market Share - 6sense](https://6sense.com/tech/game-development/godot-market-share)
3. [Godot vs GameMaker 2026 - Ziva](https://ziva.sh/blogs/godot-vs-gamemaker)
4. [MCP Monetization 2026 - DEV Community](https://dev.to/krisying/mcp-servers-are-the-new-saas-how-im-monetizing-ai-tool-integrations-in-2026-2e9e)
5. [Godot Docs MCP - Hallucination Guide](https://skywork.ai/skypage/en/godot-ai-hallucinations-guide/1978639222865252352)
6. [Godot + AI Architecture - DEV Community](https://dev.to/ziva/why-godots-architecture-makes-it-the-best-engine-for-ai-assisted-development-5e8f)
7. [Godot MCP Pro - DEV Community](https://dev.to/y1uda/i-built-a-godot-mcp-server-because-existing-ones-couldnt-let-ai-test-my-game-47dl)
8. [Godot AI Slop - PC Gamer](https://www.pcgamer.com/software/platforms/open-source-game-engine-godot-is-drowning-in-ai-slop-code-contributions-i-dont-know-how-long-we-can-keep-it-up/)
9. [GDAI MCP](https://gdaimcp.com/)
10. [Godot Community](https://godotengine.org/community/)
11. [Cursor AI Statistics - Panto](https://www.getpanto.ai/blog/cursor-ai-statistics)
