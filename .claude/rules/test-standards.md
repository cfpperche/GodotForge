---
description: Testing Standards
audience: internal
---

# Testing Standards

## File placement
- Tests live ADJACENT to source: `foo.ts` → `foo.test.ts` in the same directory.
- Integration tests: `src/integration.test.ts` for cross-module wiring.
- Never place tests in a separate `tests/` tree for TypeScript — keep them next to the code they test.

## Naming
- Test files: `{module}.test.ts` — exact match to source file name.
- Test cases: `describe("{module}") > it("{scenario} → {expected}")`.
- Example: `describe("isNewer") > it("returns true when major version higher")`.

## Structure
- **Arrange → Act → Assert.** One logical assertion per test.
- **beforeEach**: reset shared state (e.g., `clearRegistry()`). Never let tests leak state.
- **No shared mutable state** between test files. Module-level singletons must have reset functions.

## Test types

| Type | Rules | Speed |
|------|-------|-------|
| **Unit** | No I/O, no network, no DB. Pure logic. Mock at boundaries. | <100ms each |
| **Integration** | Real filesystem (use /tmp). Real module imports. | <1s each |
| **Smoke** | Module loads without error. Exports have correct types. | <10ms each |

## What to test
- Every exported function must have at least one test.
- Happy path + at least one error path per function.
- Edge cases: empty input, null/undefined, boundary values, Unicode, path traversal.
- Mocks must match the real interface — use `satisfies` or typed mocks, not `as any`.

## What NOT to test
- Private functions (test via public API).
- Framework behavior (don't test that Vitest works).
- Type definitions (interfaces have no runtime behavior).

## Enforcement
- `npm test` runs ALL tests. Must pass before every commit.
- Pre-commit hook validates test file existence for modified source files.
- No `skip`, `todo`, or `only` in committed test files without a linked issue.
