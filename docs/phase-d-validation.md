# Phase D — AI Generators Validation Status

> Last updated: 2026-03-31

## Validated End-to-End (6/12)

| Service | Tools | Test | Result |
|---------|-------|------|--------|
| **Stability AI** | 13 | `ai.stability_generate_core` — dungeon floor texture | ✅ 1536x1536 PNG, tile-texture style, 3 credits |
| **ElevenLabs** | 4 | `ai.elevenlabs_tts` + `ai.elevenlabs_sound_effect` | ✅ NPC voice (Roger, 5s MP3) + sword SFX (1.5s MP3) |
| **Tripo AI** | 7 | `ai.tripo_text_to_3d` — medieval treasure chest | ✅ 15MB GLB with PBR textures, 20 credits |
| **Hugging Face** | 1 | `ai.huggingface_text_to_image` — SDXL pixel art slime | ✅ 512x512 PNG, free tier |
| **Suno** | 4 | `ai.suno_generate` — dungeon exploration music | ✅ 2 tracks "Obsidian Labyrinth" (2:46 + 3:54 MP3) |
| **Poly Haven** | 2 | `assets.download_polyhaven` — 3 texture sets | ✅ castle_brick_07, wood_floor_deck, forrest_ground_01 (PBR) |

## Validated Auth Only — No Credits (3/12)

| Service | Tools | Result |
|---------|-------|--------|
| **DALL-E** | 3 | ✅ Auth OK, "Billing hard limit reached" — needs OpenAI credits |
| **fal.ai** | 12 | ✅ Auth OK, "Exhausted balance" — needs fal.ai credits |
| **OpenGameArt** | 1 | ✅ Search fix validated (endpoint changed to /art-search-advanced) |

## Not Validated — Require Paid Subscriptions (3/12)

| Service | Tools | Reason |
|---------|-------|--------|
| **Meshy** | 8 | No free API tier — requires prepaid credits at meshy.ai |
| **Blockade Labs** | 3 | API requires Essential plan ($24/mo) at skybox.blockadelabs.com |
| **Rodin (Hyper3D)** | 2 | API requires Business subscription at hyper3d.ai |

## Bugs Found & Fixed During Validation

| Bug | Service | Fix | Commit |
|-----|---------|-----|--------|
| `pbr_model` string URL not parsed | Tripo | Handle both `output.pbr_model` (string) and `output.model.url` (object) | bfcf4ee |
| FLUX.1-dev deprecated on HF | Hugging Face | Changed default to `stabilityai/stable-diffusion-xl-base-1.0` | 6bf6add |
| Files saved in wrong project | All | `~/.godotforge/active-project` sync, only `--http-only` writes | aab949f |
| MCP stdio overwrites active-project | All | Only `--http-only` server writes the file | 402eb5b |
| `output_format: wav_44100` rejected | ElevenLabs | Free tier only supports MP3 ≤128kbps | — |
| `sunoData[].audioUrl` not parsed | Suno | Normalized response: handle both `audioUrl` and `audio_url` | 31cec94 |
| OGA search returning spam | OpenGameArt | Endpoint `/search/node` → `/art-search-advanced` | 887d25f |
| fal.ai key not in dashboard | fal.ai | Added "AI Gateway" category to API Keys UI | c3b5836 |
| Suno dashboard link wrong | Suno | Changed URL to sunoapi.org | e6571ec |

## Implementation Summary

- **10 direct services** + **1 gateway** (fal.ai wrapping 12 models) = **55 AI tools**
- All tools fully parameterized (every API parameter exposed in zod schema)
- API clients in `mcp-server/src/ai/` — 2 files per service (client + handlers)
- Config keys in `ServiceKeys` interface + `ENV_MAP` (config.ts)
- Dashboard: Settings → API Keys with categories (LLM, Assets, 3D Gen, Image, Audio, AI Gateway, Other)
