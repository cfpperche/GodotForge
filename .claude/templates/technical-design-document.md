# Technical Design Document — {{SYSTEM_NAME}}

**Version:** 1.0
**Date:** {{DATE}}
**Author:** {{AUTHOR}}
**Status:** Draft | Review | Approved

---

## 1. Summary

**Problem:** {{PROBLEM}}
**Solution:** {{SOLUTION}}
**Scope:** {{SCOPE}}

## 2. Goals & Non-Goals

### Goals
- {{GOAL_1}}
- {{GOAL_2}}

### Non-Goals
- {{NON_GOAL_1}}
- {{NON_GOAL_2}}

## 3. Architecture

### 3.1 System diagram

```
{{ARCHITECTURE_DIAGRAM}}
```

### 3.2 Components

| Component | Responsibility | Node type | Script |
|-----------|---------------|-----------|--------|
| {{COMP_1}} | {{RESP_1}} | {{NODE_1}} | {{SCRIPT_1}} |
| {{COMP_2}} | {{RESP_2}} | {{NODE_2}} | {{SCRIPT_2}} |

### 3.3 Data flow

```
{{DATA_FLOW_DIAGRAM}}
```

## 4. API / Interface

### Public methods

```gdscript
## {{METHOD_1_DOC}}
func {{METHOD_1}}({{PARAMS_1}}) -> {{RETURN_1}}:

## {{METHOD_2_DOC}}
func {{METHOD_2}}({{PARAMS_2}}) -> {{RETURN_2}}:
```

### Signals

```gdscript
signal {{SIGNAL_1}}({{SIGNAL_1_PARAMS}})  ## {{SIGNAL_1_DOC}}
signal {{SIGNAL_2}}({{SIGNAL_2_PARAMS}})  ## {{SIGNAL_2_DOC}}
```

### Configuration

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| {{PARAM_1}} | {{TYPE_1}} | {{DEF_1}} | {{RANGE_1}} | {{DESC_1}} |

## 5. Data Model

### Resources

```gdscript
class_name {{RESOURCE_NAME}}
extends Resource

@export var {{FIELD_1}}: {{TYPE_1}}
@export var {{FIELD_2}}: {{TYPE_2}}
```

### Persistence

| Data | Storage | Format | When |
|------|---------|--------|------|
| {{DATA_1}} | {{STORAGE_1}} | {{FORMAT_1}} | {{WHEN_1}} |

## 6. State Machine

```
{{STATE_DIAGRAM}}
```

| State | Entry | Exit | Transitions |
|-------|-------|------|-------------|
| {{STATE_1}} | {{ENTRY_1}} | {{EXIT_1}} | {{TRANS_1}} |

## 7. Performance Budget

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Frame time | {{FRAME_BUDGET}} | {{FRAME_MEASURE}} |
| Memory | {{MEM_BUDGET}} | {{MEM_MEASURE}} |
| Allocations/frame | {{ALLOC_BUDGET}} | {{ALLOC_MEASURE}} |

## 8. Error Handling

| Error | Detection | Recovery | User feedback |
|-------|-----------|----------|---------------|
| {{ERR_1}} | {{DETECT_1}} | {{RECOVER_1}} | {{FEEDBACK_1}} |

## 9. Testing Strategy

| Test type | What to test | How |
|-----------|-------------|-----|
| Unit | {{UNIT_WHAT}} | {{UNIT_HOW}} |
| Integration | {{INT_WHAT}} | {{INT_HOW}} |
| Performance | {{PERF_WHAT}} | {{PERF_HOW}} |

## 10. Migration / Rollout

{{MIGRATION_PLAN}}

## 11. Alternatives Considered

| Alternative | Pros | Cons | Why rejected |
|-------------|------|------|-------------|
| {{ALT_1}} | {{PROS_1}} | {{CONS_1}} | {{WHY_1}} |

## 12. Open Questions

- [ ] {{QUESTION_1}}
- [ ] {{QUESTION_2}}
