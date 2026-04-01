# Orchestration Rules

## Core Principle

**Never do manually what a skill or agent can do.** If a skill exists for the task, invoke it. If an agent exists for the domain, delegate to it. Doing work yourself when a specialist exists is a shortcut — and shortcuts are forbidden.

## Decision Tree

When receiving a task, follow this order:

```
1. Is there a skill that matches? → Invoke the skill
2. Is there an agent that specializes? → Delegate to the agent
3. Neither exists? → Do it yourself, but consider creating a skill/agent for next time
```

## Mandatory Skill Routing

These skills MUST be invoked — never do these tasks manually:

| Task Pattern | Skill | Trigger |
|-------------|-------|---------|
| Create a game / build a game / make a demo | `/create-game` | Any game creation request |
| Create a skill / update a skill | `/forge-skill-creator` | Any skill authoring |
| Create an agent / update an agent | `/forge-agent-creator` | Any agent authoring |
| Create a hook / update a hook | `/forge-hook-creator` | Any hook authoring |
| Design a game system / mechanic | `/design-system` | System design requests |
| Review game quality | `/game-review` | Game review requests |
| Polish a game | `/game-polish` | Polish/juice requests |
| Check balance | `/balance-check` | Balance/tuning requests |
| Brainstorm ideas | `/brainstorm` | Ideation requests |
| Performance analysis | `/perf-profile` | Performance requests |
| Tech debt scan | `/tech-debt` | Debt/cleanup requests |
| Sprint planning | `/sprint-plan` | Planning requests |
| Release readiness | `/release-checklist` | Pre-release checks |
| Generate changelog | `/changelog` | Changelog requests |
| Code review | `/code-review` | Review requests |
| Estimate effort | `/estimate` | Estimation requests |
| Localization | `/localize` | i18n requests |
| Map system dependencies | `/map-systems` | Architecture visualization |
| Reverse engineer docs | `/reverse-document` | Generate docs from code |
| Milestone review | `/milestone-review` | Milestone check-ins |
| Retrospective | `/retrospective` | Retro requests |
| Playtest report | `/playtest-report` | Playtest analysis |
| Gate check | `/gate-check` | Quality gate verification |
| MCP server building | `/mcp-builder` | MCP development |
| Frontend polish | `/frontend-polish` | Web UI polish |
| Audit skills | `/forge-skill-creator --audit` | Skill quality check |
| Audit agents | `/forge-agent-creator --audit` | Agent quality check |
| Audit hooks | `/forge-hook-creator --audit` | Hook quality check |

## Mandatory Agent Delegation

These agents MUST be delegated to — never do their specialized work yourself:

| Domain | Agent | When to Delegate |
|--------|-------|-----------------|
| Phase gate reviews | `qa-director` | At EVERY checkpoint in /create-game or any phased skill |
| GDScript code | `gdscript-specialist` | Complex GDScript refactoring or debugging |
| Godot engine | `godot-specialist` | Scene architecture, node setup, editor features |
| Shader code | `shader-specialist` | Writing or optimizing .gdshader files |
| Gameplay systems | `gameplay-programmer` | Player controllers, AI, state machines, combat |
| Blender 3D | `blender-specialist` | 3D modeling, animation, export pipeline |
| Game system design | `systems-designer` | Designing new mechanics with 8-section GDD |
| Economy/balance | `economy-designer` | Currency, progression, loot tables |
| Level design | `level-designer` | Layout, pacing, flow, environmental storytelling |
| Narrative | `narrative-director` | Story arcs, branching dialogue architecture |
| Writing | `writer` | Dialogue lines, flavor text, UI copy |
| World building | `world-builder` | Lore, factions, history, geography |
| Sound design | `sound-designer` | SFX creation, audio implementation |
| Audio direction | `audio-director` | Music briefs, mix strategy, audio vision |
| Technical art | `technical-artist` | Materials, shaders, VFX, asset pipeline |
| Performance | `performance-analyst` | Profiling, bottlenecks, optimization |
| Tools/plugins | `tools-programmer` | Editor plugins, CI/CD, build systems |
| QA strategy | `qa-lead` | Test plans, triage, quality gates |
| Bug hunting | `qa-tester` | Finding bugs, writing repro steps |
| Accessibility | `accessibility-specialist` | WCAG, colorblind, input remapping |
| Prototyping | `prototyper` | Quick gameplay experiments, MVPs |

## Multi-Agent Pipelines (Team Skills)

For complex multi-domain tasks, use team skills that orchestrate multiple agents:

| Task | Team Skill | Agents Involved |
|------|-----------|-----------------|
| Combat system | `/team-combat` | systems-designer → gameplay-programmer → technical-artist → sound-designer → qa-tester |
| Narrative arc | `/team-narrative` | narrative-director → world-builder → writer → audio-director |
| UI feature | `/team-ui` | systems-designer → gameplay-programmer → technical-artist → accessibility-specialist |
| Level building | `/team-level` | level-designer → technical-artist → sound-designer → qa-tester |
| Polish pass | `/team-polish` | performance-analyst → technical-artist → sound-designer → qa-tester |
| Audio system | `/team-audio` | audio-director → sound-designer → gameplay-programmer |
| Release | `/team-release` | qa-lead → performance-analyst → tools-programmer |

## QA Director Rule

**The qa-director agent MUST be called at every phase checkpoint in any phased skill.** This is not optional. The producing agent cannot approve its own work.

Pattern:
```
1. Complete phase work
2. Delegate to qa-director with phase number + artifacts
3. If REJECTED: fix issues, re-submit to qa-director
4. If APPROVED: proceed to next phase
5. Never skip the qa-director — even if you think the work is perfect
```

## When NOT to Delegate

- Simple file reads/writes (use tools directly)
- Single-line code changes (Edit tool)
- Git operations (Bash)
- Quick lookups (Grep, Glob, search_docs)
- Answering user questions about the project (read and respond)

**Rule of thumb:** If the task takes <5 tool calls and no domain expertise, do it yourself. Otherwise, delegate.
