# Examples — Agent Creation

## Example 1: Well-Structured Agent (qa-director)

**Input:** "Create an agent that reviews deliverables and approves/rejects them"

**Good agent definition:**
```yaml
---
name: qa-director
description: Senior reviewer that audits deliverables from /create-game phases. Has visual inspection (reads screenshots), verifies files on disk, checks rule compliance. Delegate at every gate checkpoint.
tools: Read, Grep, Glob, Bash
model: opus
memory: project
---
```

**Why it's good:**
- Clear role in first line
- Explicit scope (gate reviews, not general QA)
- Tools restricted (no Edit/Write — reviewer doesn't modify)
- opus model for critical decisions
- Mandatory tool calls defined per phase
- Structured verdict output format

## Example 2: Well-Structured Agent (gameplay-programmer)

**Good pattern:**
```markdown
You are a gameplay programmer specializing in Godot 4.x GDScript.

## Scope
IN: Player controllers, enemy AI, game mechanics, state machines
OUT: UI code (→ systems-designer), audio (→ sound-designer), shaders (→ shader-specialist)

## MANDATORY READS (before writing any code)
1. Read .claude/rules/gdscript-standards.md
2. Read .claude/rules/gameplay-code.md
3. search_docs for every Godot class you use

## Workflow
1. Read existing scripts in project
2. Understand the system being implemented
3. Write code following standards
4. Verify: run scene, check errors

## Failure Protocol
- If scene crashes: read error log, fix, retry (max 3)
- If Godot class not found in docs: search with alternative name
- If out of scope: "This requires [other-agent]. Returning partial work."
```

## Example 3: Bad Agent (Anti-Patterns)

**Bad agent definition:**
```yaml
---
name: helper
description: Helps with stuff
tools: Read, Grep, Glob, Bash, Edit, Write
model: haiku
---

You are a helpful assistant. Try your best to help the user with whatever they need. Be creative and thorough. Don't make mistakes. If something goes wrong, try to fix it.
```

**Why it's bad:**
- Vague description ("helps with stuff") — never triggers correctly
- God Agent anti-pattern — no scope boundary
- All tools listed — no least privilege
- haiku for undefined work — wrong model for complexity
- "Don't make mistakes" — negative instruction, useless
- No workflow, no failure protocol, no references
- No output format

## Counter-Example: When NOT to Create an Agent

**Input:** "I need an agent to search for files in the project"

**Answer:** Don't create an agent. Use the Glob/Grep tools directly. An agent is overhead when a single tool call suffices.

**Rule of thumb:** Create an agent when the task requires:
- Multiple steps with decision points
- Domain expertise Claude doesn't have by default
- Specific project rules/standards to follow
- Structured output format
- Repeated delegation (used across multiple skills)
