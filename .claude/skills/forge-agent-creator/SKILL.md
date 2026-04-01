---
name: forge-agent-creator
description: "Create or update Claude Code agents (.claude/agents/*.md) following best practices from Anthropic, Manus, and industry research. Use when: user wants to create a new agent, update an existing agent, audit agent quality, or design a multi-agent team. Handles frontmatter, system prompt, workflow, guardrails, failure handling, and eval scenarios."
user_invocable: true
---

# /forge-agent-creator [description or existing agent name]

Create or update a Claude Code agent following research-backed best practices.

**CRITICAL: No shortcuts.** Before writing any agent, read the existing agents in `.claude/agents/` to understand project conventions, and read the checklist in `references/checklist.md`.

## Progress Checklist

```
- [ ] Step 1: Understand the agent's purpose (gather requirements)
- [ ] Step 2: Audit existing agents (avoid overlap, find patterns)
- [ ] Step 3: Design the agent (scope, tools, model, workflow)
- [ ] Step 4: Write the agent definition
- [ ] Step 5: Validate against quality checklist
- [ ] Step 6: Write eval scenarios
```

---

## Step 1: Understand — 🟢 High freedom

1. Parse the description — what domain? What deliverables? Who delegates to this agent?
2. If vague, ask:
   - "What specific task should this agent handle?"
   - "What tools does it need access to?"
   - "What does success look like? What's the output format?"
   - "Which existing agents overlap? Should this be a new agent or an update?"
3. Determine if an agent is even needed:
   - **YES**: Multi-step task, domain expertise, project rules to follow, repeated delegation
   - **NO**: Single tool call, simple lookup, one-shot question → use tool directly

---

## Step 2: Audit Existing Agents — 🔒 Low freedom: must read

### MANDATORY READS:
```
Glob: .claude/agents/*.md → list all existing agents
Read: each agent's frontmatter (name, description, tools, model)
Read: references/checklist.md
Read: references/anti-patterns.md
```

1. List all existing agents with their scope
2. Check for overlap — if the new agent's scope touches an existing agent, define the boundary
3. Identify patterns used by existing agents (workflow structure, output format)
4. Note which tools/models existing agents use

---

## Step 3: Design — 🔓 Medium freedom

Design the agent's architecture before writing:

### 3a. Scope Boundary
Define explicitly:
- **IN scope:** [specific tasks, specific deliverables]
- **OUT of scope:** [tasks that belong to other agents, with delegation targets]

### 3b. Tool Selection (Principle of Least Privilege)
| Need | Tools |
|------|-------|
| Read-only analysis | Read, Grep, Glob |
| Code modification | + Edit, Write |
| System commands | + Bash |
| All operations | Read, Grep, Glob, Bash, Edit, Write |

**Rule:** Start with the minimum set. Add tools only when the agent demonstrably needs them.

### 3c. Model Selection
| Complexity | Model | Use When |
|-----------|-------|----------|
| Critical decisions, complex analysis | opus | Gate reviews, architecture, multi-file reasoning |
| Most specialist work | sonnet | Code gen, design docs, testing, most agents |
| Simple/fast tasks | haiku | Classification, lookups, formatting |

### 3d. Workflow Design
Choose the simplest pattern that works:
1. **Single-pass** — read context → produce output (most agents)
2. **Iterative** — produce → verify → refine (code agents)
3. **Pipeline** — step A → check → step B → check (multi-phase agents)

---

## Step 4: Write the Agent — 🔒 Low freedom: exact format required

### Frontmatter (YAML)
```yaml
---
name: agent-name                    # kebab-case, descriptive
description: One-line description   # WHAT it does + WHEN to delegate
tools: Read, Grep, Glob            # Minimum viable set
model: sonnet                       # Default for most agents
memory: project                     # If needs cross-session context
---
```

**Description is the trigger.** The main agent reads descriptions to decide delegation. Include both WHAT the agent does and WHEN to delegate. Example: "QA tester for bug hunting, writing repro steps, and edge case testing. Delegate for finding bugs, writing test cases, or validating fixes."

### Body Structure (5-Block Architecture)

Follow this exact structure:

```markdown
You are a [role] who [does what]. [One sentence on approach/philosophy].

## Scope
**IN:** [specific tasks]
**OUT:** [specific exclusions] → delegate to [other agent]

## MANDATORY READS (before any work)
1. Read .claude/rules/[relevant-rule].md
2. Read .claude/templates/[relevant-template].md
3. search_docs [relevant Godot/Blender classes]

## Workflow
1. [Step with clear input → action → output]
2. [Step with verification]
3. [Step with deliverable]

## Output Format
[Exact structure of what the agent produces]

## Failure Protocol
- Tool failure: [retry → alternative → escalate]
- Ambiguous input: [ask vs. assume — which?]
- Out of scope: "This requires [agent]. Returning partial work."
- Max retries: [N] before escalating

## HALT Conditions
Stop and report (do not continue) when:
- [condition 1]
- [condition 2]
```

### Writing Rules
- First line: identity statement ("You are a...")
- Under 300 lines total (body IS the entire system prompt)
- Numbered steps, not prose
- Affirmative ("do X") over negative ("don't X")
- Reference project rules by file path, not by memory
- Include MANDATORY READS for every rule/template the agent must follow

---

## Step 5: Validate — 🔒 Low freedom: must check every item

### MANDATORY: Run the full checklist
```
Read: references/checklist.md
```

Check every item. If any fails, go back to Step 4 and fix.

### Additional validation:
- Grep the agent for anti-patterns from `references/anti-patterns.md`
- Verify tool list is minimal (remove any tool not used in the workflow)
- Verify model matches complexity (don't use opus for simple tasks)
- Verify description includes WHEN to delegate (not just WHAT)
- Count lines — must be under 300

---

## Step 6: Eval Scenarios — 🔓 Medium freedom

Write 3 eval scenarios inline at the bottom of the agent definition or in a separate `references/` file:

1. **Happy path** — standard delegation, expected behavior, correct output
2. **Edge case** — unusual input, missing context, incomplete information
3. **Error case** — tool fails, out-of-scope request, conflicting instructions

Format:
```markdown
## Eval Scenarios

### Happy Path
Input: [delegation prompt]
Expected: [what agent should do, what output looks like]

### Edge Case
Input: [unusual request]
Expected: [graceful handling]

### Error Case
Input: [broken scenario]
Expected: [escalation, partial output, error report]
```

---

## Do

- READ existing agents before creating new ones (avoid overlap)
- READ references/checklist.md before finalizing
- USE minimum viable tool set
- DEFINE explicit scope boundaries with delegation targets
- INCLUDE MANDATORY READS in every agent
- INCLUDE failure protocol and HALT conditions
- WRITE affirmative instructions
- TEST: mentally run the eval scenarios against the agent definition

## Don't

- DON'T create God Agents (one agent, all responsibilities)
- DON'T use negative instructions ("don't do X")
- DON'T skip the checklist validation
- DON'T give all tools when only Read/Grep needed
- DON'T write prose paragraphs — use numbered steps
- DON'T exceed 300 lines
- DON'T rely on training data — reference project rules/docs explicitly

---

## Output

Deliver:
1. Agent file at `.claude/agents/{name}.md`
2. Validation summary (checklist results)
3. Eval scenarios (inline or separate file)

---

## References

- Quality checklist: `references/checklist.md`
- Anti-patterns: `references/anti-patterns.md`
- Examples: `references/examples.md`

## Sources (research backing)

- [Building Effective Agents — Anthropic](https://www.anthropic.com/research/building-effective-agents)
- [Claude Code Subagents — Docs](https://code.claude.com/docs/en/sub-agents)
- [Context Engineering — Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Prompt Engineering — Manus 1.5](https://skywork.ai/blog/ai-agent/prompt-engineering-manus-1-5-structure-guardrails-evaluation/)
- [12 Failure Patterns — Concentrix](https://www.concentrix.com/insights/blog/12-failure-patterns-of-agentic-ai-systems/)
- [Agent Evaluation — Galileo CLEAR Framework](https://galileo.ai/blog/agent-evaluation-framework-metrics-rubrics-benchmarks)
