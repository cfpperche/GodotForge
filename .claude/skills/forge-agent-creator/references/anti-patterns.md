# Anti-Patterns — Agent Creation

| Pattern | Instead |
|---------|---------|
| **God Agent** — one agent does everything | Split into specialists with clear scope boundaries (max 1 domain per agent) |
| **Instruction Bloat** — 1000+ words of prose | Keep under 300 lines. Use numbered steps, tables, bullet points. |
| **Negative Instructions** — "Don't do X" | Affirmative: "When X happens, do Y instead" |
| **Vague Scope** — "help with game development" | Explicit: "Design combat systems following the 8-section GDD standard" |
| **Missing Escalation** — agent tries forever | Define HALT conditions: "If X fails 3 times, stop and report" |
| **No Read-Before-Write** — agent modifies blindly | Require: read current state before any modification |
| **Untyped Tools** — `tools: all` | Principle of least privilege: list only needed tools |
| **No Output Format** — free-form responses | Define exact deliverable structure (markdown template, sections) |
| **Infinite Loops** — agent retries same action | Max retry limit + loop detection + alternative approach on failure |
| **Context Flooding** — dump everything into prompt | Be surgical: only include what Claude doesn't already know |
| **Training Data Reliance** — "you know how X works" | MANDATORY READS: always read project rules/docs before acting |
| **Missing Failure Protocol** — tool fails, agent crashes | Define fallback: graceful degradation, partial results, escalation |
| **Premature Multi-Agent** — 5 agents for a simple task | Start with single agent + tools; add agents only when single fails |
| **Black Box Decisions** — agent acts without explaining | Require structured output showing reasoning chain |
