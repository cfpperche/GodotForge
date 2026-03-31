# Phase D — AI Generators Validation Status

> Last updated: 2026-03-31

## Validated End-to-End (4/9)

| Service | Tools | Test | Result |
|---------|-------|------|--------|
| **Stability AI** | 13 | `ai.stability_generate_core` — dungeon floor texture | ✅ 1536x1536 PNG, tile-texture style, 3 credits |
| **ElevenLabs** | 4 | `ai.elevenlabs_tts` + `ai.elevenlabs_sound_effect` | ✅ NPC voice (Roger, 5s MP3) + sword SFX (1.5s MP3) |
| **Tripo AI** | 7 | `ai.tripo_text_to_3d` — medieval treasure chest | ✅ 15MB GLB with PBR textures, 20 credits |
| **Hugging Face** | 1 | `ai.huggingface_text_to_image` — SDXL pixel art slime | ✅ 512x512 PNG, free tier |

## Not Validated — Require Paid API Keys (5/9)

| Service | Tools | Reason | How to Test |
|---------|-------|--------|-------------|
| **Meshy** | 8 | No free API tier — requires prepaid credits | Buy credits at meshy.ai, set `MESHY_API_KEY` |
| **Blockade Labs** | 3 | API requires Essential plan ($24/mo minimum) | Subscribe at skybox.blockadelabs.com, set `BLOCKADE_LABS_API_KEY` |
| **Rodin (Hyper3D)** | 2 | ~30 free credits on signup | Sign up at hyper3d.ai, set `RODIN_API_KEY` |
| **OpenAI DALL-E** | 3 | Requires OpenAI API credits | Add credits at platform.openai.com, set `OPENAI_API_KEY` |
| **Suno** | 4 | Third-party wrapper API (sunoapi.org), paid | Buy credits at sunoapi.org, set `SUNO_API_KEY` |

## Bugs Found & Fixed During Validation

| Bug | Service | Fix |
|-----|---------|-----|
| `pbr_model` string URL not parsed | Tripo | Handle both `output.pbr_model` (string) and `output.model.url` (object) |
| FLUX.1-dev deprecated on HF | Hugging Face | Changed default model to `stabilityai/stable-diffusion-xl-base-1.0` |
| Files saved in wrong project | All | Added `~/.godotforge/active-project` sync file, only `--http-only` server writes it |
| `output_format: wav_44100` rejected on free tier | ElevenLabs | Free tier only supports MP3 ≤128kbps |

## Implementation Notes

- All 9 services implemented with **full API parameterization** (every parameter the API supports)
- All tools registered in `server.ts`, routed in `tool-handlers.ts`, risk levels in `guardrails.ts`
- API clients in `mcp-server/src/ai/` — 2 files per service (client + handlers)
- Config keys in `ServiceKeys` interface, env vars in `ENV_MAP` (config.ts)
- Total: **42 AI tools** across 9 services
