# Issue 006 — Suno API returns null taskId

## Status: Open
## Priority: Medium
## Component: `mcp-server/src/ai/suno.ts`

## Problem

`ai.suno_generate` fails with: `Cannot read properties of null (reading 'taskId')`.

The `generateMusic()` function expects `data.data.taskId` from the Suno API response, but `data.data` is null.

```typescript
// suno.ts:112-113
const data = await apiPost<{ data: { taskId: string } }>(apiKey, "/api/v1/generate", body);
return { taskId: data.data.taskId };  // data.data is null
```

## Root Cause (suspected)

Suno API response format may have changed. The wrapper API (suno-api or udio-api) may return the taskId at a different path (e.g., `data.taskId` instead of `data.data.taskId`), or the endpoint may have been deprecated.

## Reproduction

```bash
# Via MCP tool
ai.suno_generate({ prompt: "any prompt", instrumental: true })
# → Error: Cannot read properties of null (reading 'taskId')
```

## Fix Plan

1. Add debug logging to capture the raw API response shape
2. Check if wrapper API has updated (check GitHub for breaking changes)
3. Update the response parsing to match current API format
4. Add null-safety: `if (!data?.data?.taskId) throw new Error("Suno API returned no taskId: " + JSON.stringify(data))`
5. Add test with mocked response

## Impact

- Music generation unavailable
- Dungeon Crawler 3D demo using jsfxr placeholder drone instead of proper ambient music
- All Suno tools affected (generate depends on taskId for polling)

## Workaround

Use `ai.fal_stable_audio` (if fal.ai has balance) or `ai.elevenlabs_sound_effect` for short ambient loops.
