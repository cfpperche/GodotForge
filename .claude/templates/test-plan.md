# Test Plan — {{FEATURE_NAME}}

**Version:** 1.0
**Date:** {{DATE}}
**Author:** {{AUTHOR}}

---

## Scope

**Feature:** {{FEATURE}}
**Systems under test:** {{SYSTEMS}}
**Out of scope:** {{OUT_OF_SCOPE}}

## Test Strategy

| Level | Tools | Coverage target |
|-------|-------|----------------|
| Unit | {{UNIT_TOOLS}} | {{UNIT_COV}} |
| Integration | {{INT_TOOLS}} | {{INT_COV}} |
| E2E | {{E2E_TOOLS}} | {{E2E_COV}} |
| Performance | {{PERF_TOOLS}} | {{PERF_COV}} |

## Test Cases

### Happy Path

| ID | Scenario | Steps | Expected result | Priority |
|----|----------|-------|-----------------|----------|
| T001 | {{SCENARIO_1}} | {{STEPS_1}} | {{EXPECTED_1}} | High |
| T002 | {{SCENARIO_2}} | {{STEPS_2}} | {{EXPECTED_2}} | High |

### Edge Cases

| ID | Scenario | Steps | Expected result | Priority |
|----|----------|-------|-----------------|----------|
| T010 | {{EDGE_1}} | {{ESTEPS_1}} | {{EEXPECTED_1}} | Medium |

### Error Scenarios

| ID | Scenario | Steps | Expected result | Priority |
|----|----------|-------|-----------------|----------|
| T020 | {{ERR_1}} | {{ERRSTEPS_1}} | {{ERREXPECTED_1}} | High |

### Performance Tests

| ID | Scenario | Metric | Threshold | Method |
|----|----------|--------|-----------|--------|
| P001 | {{PERF_1}} | {{METRIC_1}} | {{THRESH_1}} | {{METHOD_1}} |

## Environment

| Environment | Config | Data |
|-------------|--------|------|
| {{ENV_1}} | {{CONFIG_1}} | {{DATA_1}} |

## Prerequisites

- [ ] {{PREREQ_1}}
- [ ] {{PREREQ_2}}

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| {{RISK_1}} | {{IMPACT_1}} | {{MIT_1}} |

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| QA | {{QA}} | | [ ] |
| Dev | {{DEV}} | | [ ] |
