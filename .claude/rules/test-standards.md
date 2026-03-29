# Testing Standards

- Test naming: `test_[system]_[scenario]_[expected_result]` — e.g., `test_inventory_add_item_increases_count`.
- Structure: Arrange (setup) → Act (execute) → Assert (verify). One assert per test when possible.
- Unit tests: no file I/O, no network, no database. Pure logic only. Must run in <100ms each.
- Integration tests: use real filesystems and services. Mark as `@slow` or in separate test suite.
- Every bug fix MUST have a regression test that fails before the fix and passes after.
- Test edge cases explicitly: empty arrays, null references, max values, zero, negative numbers, Unicode strings.
- Document performance thresholds in test comments: `# Must complete in <16ms (one frame at 60fps)`.
- Mock external dependencies at system boundaries only. Never mock internal classes — test the real thing.
- GDScript tests: use GUT framework (`addons/gut/`). Place tests in `tests/` directory mirroring `scripts/` structure.
- TypeScript tests: use Vitest. Place tests adjacent to source (`.test.ts` suffix) or in `__tests__/` directory.
- CI pipeline must pass ALL tests before merge. No exceptions, no `skip` without a linked issue.
