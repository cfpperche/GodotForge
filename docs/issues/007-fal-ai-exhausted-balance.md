# Issue 007 — fal.ai exhausted balance

## Status: Open
## Priority: Low
## Component: `mcp-server/src/ai/fal.ts`

## Problem

All fal.ai tools return HTTP 403: `"User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing."`

This blocks 12 tools: fal_flux_pro, fal_flux_schnell, fal_sd35, fal_sdxl, fal_rodin, fal_tripo, fal_trellis, fal_hunyuan3d, fal_stable_audio, fal_kokoro_tts, fal_upscale, fal_remove_bg.

## Fix Plan

1. **Short-term**: Top up fal.ai balance at https://fal.ai/dashboard/billing
2. **Code improvement**: Detect 403 + "Exhausted balance" and return a user-friendly error message with billing link, instead of raw API error
3. **get_service_status enhancement**: Check balance endpoints where available (fal.ai, Stability, Meshy, Tripo, Suno) and report `configured_but_no_balance` status

## Impact

- 12 AI tools unavailable (image gen, 3D gen, audio gen, upscale, background removal)
- Dungeon Crawler 3D: couldn't use stable_audio as Suno fallback for music
- Alternative services (Stability AI, ElevenLabs, Tripo) still functional

## Workaround

Use direct service APIs instead of fal.ai gateway: Stability AI for images, Tripo for 3D, ElevenLabs for audio.
