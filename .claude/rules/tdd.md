---
description: Test-Driven Development rules for all code changes
paths: ["addons/godotforge/**", "mcp-server/src/**"]
audience: internal
---

# TDD (Test-Driven Development)

## BLOCKING REQUIREMENT — Agents MUST follow this

**No code change is complete without tests.** This is not optional. If you create or modify a `.ts` file in `mcp-server/src/`, you MUST create or update the corresponding `.test.ts` file in the same commit. A PR/commit that adds functionality without tests is REJECTED.

## Workflow

1. **Write the test first** — describe what the function should do via test cases.
2. **Run the test** — it must FAIL (Red). If it passes, your test is wrong.
3. **Write the minimum code** to make the test pass (Green).
4. **Refactor** — clean up while tests stay green.
5. **Verify** — `npm test` must pass before you consider the task done.

## What requires tests

| Change type | Test requirement |
|-------------|-----------------|
| New function/module | Unit test for every exported function |
| New tool registration | Integration test verifying tool registers and dispatches |
| Bug fix | Regression test that fails without the fix |
| Refactoring | Existing tests must still pass; add tests if coverage gaps found |

## What does NOT require tests

- Pure type definitions (interfaces, type aliases)
- Re-exports (index files that just forward imports)
- Config/constant changes (unless they affect logic)

## Framework

- **MCP server**: Vitest — tests adjacent to source (`foo.test.ts` next to `foo.ts`)
- **Web client**: Vitest + @testing-library/react
- **GDScript plugin**: GUT or curl-based integration tests in `tests/`

## Enforcement

- `npm test` must pass before committing
- A pre-commit hook validates that new/modified `.ts` files have corresponding `.test.ts` files
- Tests must be fast (<100ms each), isolated (no shared mutable state), and deterministic (no timing deps)
