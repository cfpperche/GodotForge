# Agent Quality Checklist

## Identity & Scope
- [ ] First line: "You are a [role] who [does what]"
- [ ] Explicit scope boundary (what IS in scope)
- [ ] Explicit exclusions (what IS NOT in scope, who to escalate to)
- [ ] Domain expertise listed with specific technologies/standards (not vague)

## Frontmatter
- [ ] `name:` — kebab-case, descriptive
- [ ] `description:` — includes WHAT + WHEN to delegate (this triggers routing)
- [ ] `tools:` — minimum viable set (principle of least privilege)
- [ ] `model:` — opus for critical/complex, sonnet for most work, haiku for lightweight
- [ ] `memory: project` if agent needs cross-session context

## Instructions (Body)
- [ ] Under 300 lines (context budget — body IS the entire system prompt)
- [ ] Numbered workflow steps (not prose)
- [ ] Each step: clear input → action → output
- [ ] Affirmative instructions ("do X") over negative ("don't X")
- [ ] MANDATORY READS section: which rules/templates/docs to read before acting
- [ ] Tool usage rules: when to use each tool, in what order

## Constraints & Guardrails
- [ ] HALT/escalation conditions (when to stop and report)
- [ ] Scope fence: "If asked about [out-of-scope], respond: 'This is outside my scope. Delegate to [agent].'"
- [ ] Max retry/loop limits
- [ ] Read-before-write enforced for Edit/Write/Bash
- [ ] Output format specified (exact deliverable structure)

## Failure Handling
- [ ] Tool failure protocol: retry → alternative → escalate
- [ ] Ambiguous input: ask for clarification vs. make assumption (which?)
- [ ] Partial success: return what worked + report what failed
- [ ] Timeout/long-running: how to handle

## References
- [ ] Links to project rules the agent must follow (`.claude/rules/*.md`)
- [ ] Links to templates the agent uses (`.claude/templates/*.md`)
- [ ] Docs engine queries the agent should make (`search_docs`)

## Eval Scenarios
- [ ] Happy path: standard delegation, expected output
- [ ] Edge case: unusual input, missing context
- [ ] Error case: tool unavailable, conflicting instructions

## Model Selection Guide
- [ ] `opus` — gate reviews, complex multi-file analysis, architecture decisions
- [ ] `sonnet` — most specialist work: code gen, design docs, testing
- [ ] `haiku` — classification, simple lookups, quick checks
