# Skill Authoring Standards

## Dynamic Tool References

Skills MUST use template tags instead of hardcoding tool/service names. The MCP server resolves these tags at runtime with the actual available tools.

### Available Tags

| Tag | Category | Example expansion |
|-----|----------|------------------|
| `{{TEXTURE_SERVICES}}` | PBR textures & materials | ambientCG (search + download), Poly Haven (search + download), Stability AI (generate), Hugging Face (text-to-image) |
| `{{MODEL_3D_SERVICES}}` | 3D model sources | Blender (39 modeling tools), Sketchfab (search + download), Tripo AI, Meshy, fal.ai (Trellis, Hunyuan3D, Rodin) |
| `{{AUDIO_SFX_SERVICES}}` | Sound effects | jsfxr (local retro SFX), Freesound (500K+ sounds), ElevenLabs (AI SFX) |
| `{{AUDIO_MUSIC_SERVICES}}` | Music generation | Suno (AI music) |
| `{{AUDIO_VOICE_SERVICES}}` | Voice synthesis | ElevenLabs (TTS, 20+ voices) |
| `{{IMAGE_GEN_SERVICES}}` | Image generation | Stability AI (SD3/Ultra/Core), DALL-E, Hugging Face (SDXL), fal.ai (FLUX) |
| `{{ASSET_SEARCH_SERVICES}}` | Asset discovery | ambientCG, Poly Haven, Sketchfab, OpenGameArt, Freesound, Godot Asset Library |
| `{{ALL_ASSET_SERVICES}}` | All asset tools | Full list of search + download tools |
| `{{ALL_AI_SERVICES}}` | All AI generators | Full list of AI generation tools |
| `{{EDITOR_TOOLS}}` | Godot editor tools | create_scene, add_node, set_property, etc. |
| `{{BLENDER_TOOLS}}` | Blender tools | create_mesh, create_material, export_gltf, etc. |
| `{{PIPELINE_TOOLS}}` | Blender → Godot | blender_to_godot, blender_to_godot_animated, sync_collision, batch_import |

### Rules

1. **NEVER hardcode service names** in skill instructions — use tags. When a new service is added, all skills update automatically.
2. **Tags resolve at runtime** — the skill resolver in `studio/skills.ts` replaces `{{TAG}}` with the current tool list.
3. **Tags are optional** — if a skill needs to reference a specific tool by name (e.g., `assets.generate_sfx` for a very specific step), that's acceptable. Tags are for lists of alternatives.
4. **Keep tag usage contextual** — use `{{TEXTURE_SERVICES}}` when listing texture sources, not `{{ALL_ASSET_SERVICES}}` which is too broad.
