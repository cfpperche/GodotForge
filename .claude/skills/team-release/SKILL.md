---
name: team-release
description: Multi-agent pipeline for release readiness — QA validation, performance verification, build pipeline, and release documentation.
user_invocable: true
---

# /team-release [version]

Orchestrate a release readiness pipeline using specialized agents. **Ask for user approval between each phase.**

## Phase 1: Requirements Gathering

Ask the user:
- **Version**: what version number?
- **Release type**: alpha, beta, RC, stable, hotfix
- **Platforms**: which platforms to ship?
- **Known deferred issues**: anything intentionally not fixed?
- **Previous release**: what version are we updating from?

## Phase 2: QA Assessment → @qa-lead

Delegate to **qa-lead** agent:
- Review open bug count by severity
- Verify all Critical and Major bugs resolved
- Check test coverage and pass rates
- Validate quality gates met
- Output: release readiness report (go/no-go with blockers)

**🔄 Present to user for approval before proceeding.**

## Phase 3: Performance Verification → @performance-analyst

Delegate to **performance-analyst** agent:
- Run performance benchmarks against targets
- Compare with previous release metrics
- Check all platforms meet minimum spec
- Flag any performance regressions
- Output: performance comparison report

**🔄 Present to user for approval before proceeding.**

## Phase 4: Build & Package → @tools-programmer

Delegate to **tools-programmer** agent:
- Verify export presets for all target platforms
- Check build pipeline configuration
- Validate all assets included and imported
- Generate build artifacts
- Output: build report with artifact locations

**🔄 Present to user for approval before proceeding.**

## Phase 5: Release Documentation

Generate using templates:
- `changelog-template.md` — full changelog from git history
- `release-notes.md` — player-facing release notes
- `patch-notes.md` — if this is a patch release

## Phase 6: Summary

Present final release checklist:
- [ ] All Critical/Major bugs resolved
- [ ] Test suite passes (100%)
- [ ] Performance targets met on all platforms
- [ ] Build artifacts generated for all platforms
- [ ] Changelog generated
- [ ] Release notes written
- [ ] Known issues documented
- [ ] Version number updated in project.godot
- [ ] Git tag created
