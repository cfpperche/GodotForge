# Hook Events Reference

## All 25 Events

| Event | Fires When | Can Block? | Matcher Target |
|-------|-----------|-----------|---------------|
| `SessionStart` | Session begins/resumes | No | source: startup, resume, clear, compact |
| `SessionEnd` | Session terminates | No | reason: clear, resume, logout |
| `UserPromptSubmit` | User submits prompt | Yes | No matcher (fires always) |
| `PreToolUse` | Before tool executes | Yes | tool_name: Bash, Edit, Write, mcp__* |
| `PostToolUse` | After tool succeeds | No | tool_name |
| `PostToolUseFailure` | After tool fails | No | tool_name |
| `PermissionRequest` | Permission dialog | Yes | tool_name |
| `Notification` | Claude sends alert | No | type: permission_prompt, idle_prompt |
| `Stop` | Claude finishes responding | Yes | No matcher |
| `StopFailure` | Turn ends from API error | No | error_type: rate_limit, server_error |
| `SubagentStart` | Subagent spawned | No | agent_type: Bash, Explore, Plan |
| `SubagentStop` | Subagent finishes | Yes | agent_type |
| `TaskCreated` | Task being created | Yes | No matcher |
| `TaskCompleted` | Task being completed | Yes | No matcher |
| `TeammateIdle` | Teammate about to idle | Yes | No matcher |
| `InstructionsLoaded` | CLAUDE.md/rules loaded | No | reason: session_start, compact |
| `ConfigChange` | Config file changes | Yes | source: user_settings, project_settings |
| `CwdChanged` | Working directory changes | No | No matcher |
| `FileChanged` | Watched file changes | No | filename (basename) |
| `WorktreeCreate` | Worktree being created | Yes | No matcher |
| `WorktreeRemove` | Worktree being removed | No | No matcher |
| `PreCompact` | Before context compaction | No | trigger: manual, auto |
| `PostCompact` | After compaction | No | trigger: manual, auto |
| `Elicitation` | MCP requests user input | Yes | MCP server name |
| `ElicitationResult` | User responds to MCP | Yes | MCP server name |

## Exit Codes

| Code | Meaning | Behavior |
|------|---------|----------|
| `0` | Success | Parse stdout for JSON output |
| `2` | Block | Halt action, feed stderr to Claude |
| Other | Non-blocking error | Log, continue |

## Handler Types

| Type | Field | Use Case |
|------|-------|----------|
| `command` | `command: "script.sh"` | Shell scripts, deterministic checks |
| `http` | `url: "http://..."` | External services, webhooks |
| `prompt` | `prompt: "Is this valid?"` | LLM-driven validation |
| `agent` | `prompt: "Verify..."` | Subagent with tool access |

## Common Input Fields (all events)

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "EventName"
}
```

## Environment Variables

- `$CLAUDE_PROJECT_DIR` — project root
- `$CLAUDE_PLUGIN_ROOT` — plugin directory (for plugins)
- `$CLAUDE_ENV_FILE` — env persistence file (SessionStart, CwdChanged, FileChanged only)
