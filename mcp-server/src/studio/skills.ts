import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "./frontmatter.js";
import { getAllToolDefinitions } from "../tool-registry.js";

export interface SkillInfo {
  name: string;
  description: string;
  content: string;
}

/** Load all skills from .claude/skills/{name}/SKILL.md, with optional bundled defaults */
export function loadSkills(claudeDir: string, defaultsClaudeDir?: string): SkillInfo[] {
  const map = new Map<string, SkillInfo>();

  // Load bundled defaults first (skip audience: internal)
  if (defaultsClaudeDir) {
    for (const s of loadSkillsFromDir(join(defaultsClaudeDir, "skills"), true)) {
      map.set(s.name, s);
    }
  }

  // User overrides
  for (const s of loadSkillsFromDir(join(claudeDir, "skills"), false)) {
    map.set(s.name, s);
  }

  return Array.from(map.values());
}

function loadSkillsFromDir(skillsDir: string, filterInternal: boolean): SkillInfo[] {
  if (!existsSync(skillsDir)) return [];

  try {
    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    const skills: SkillInfo[] = [];
    for (const dir of dirs) {
      const skillFile = join(skillsDir, dir.name, "SKILL.md");
      if (!existsSync(skillFile)) continue;

      const raw = readFileSync(skillFile, "utf-8");
      const parsed = parseFrontmatter(raw);
      if (!parsed.frontmatter.user_invocable) continue;
      if (filterInternal && parsed.frontmatter.audience === "internal") continue;

      skills.push({
        name: (parsed.frontmatter.name as string) || dir.name,
        description: (parsed.frontmatter.description as string) || "",
        content: resolveSkillTags(parsed.body),
      });
    }

    return skills;
  } catch {
    return [];
  }
}

/**
 * Find a skill by name.
 */
export function resolveSkill(skills: SkillInfo[], name: string): SkillInfo | null {
  return skills.find((s) => s.name === name) || null;
}

// --- Dynamic template resolution for skill content ---

/** Categorize tools by prefix/name into service groups. */
function buildToolTags(): Record<string, string> {
  const tools = getAllToolDefinitions();
  const names = tools.map((t) => t.name);

  const byPrefix = (prefix: string) =>
    names.filter((n) => n.startsWith(prefix)).map((n) => `\`${n}\``).join(", ");

  const textureServices = [
    names.includes("assets.search_ambientcg") ? "ambientCG (`assets.search_ambientcg` + `assets.download_ambientcg`)" : "",
    names.includes("assets.search_polyhaven") ? "Poly Haven (`assets.search_polyhaven` + `assets.download_polyhaven`)" : "",
    names.includes("ai.stability_generate_core") ? "Stability AI (`ai.stability_generate_core`)" : "",
    names.includes("ai.huggingface_text_to_image") ? "Hugging Face SDXL (`ai.huggingface_text_to_image`)" : "",
  ].filter(Boolean).join("; ");

  const model3dServices = [
    names.some((n) => n.startsWith("blender.")) ? "Blender (39 modeling tools + `pipeline.blender_to_godot`)" : "",
    names.includes("assets.search_sketchfab") ? "Sketchfab (`assets.search_sketchfab` + `assets.download_sketchfab`)" : "",
    names.includes("ai.tripo_text_to_3d") ? "Tripo AI (`ai.tripo_text_to_3d`, `ai.tripo_image_to_3d`)" : "",
    names.includes("ai.meshy_text_to_3d") ? "Meshy (`ai.meshy_text_to_3d`, `ai.meshy_image_to_3d`)" : "",
    names.includes("ai.fal_trellis") ? "fal.ai (`ai.fal_trellis`, `ai.fal_hunyuan3d`, `ai.fal_rodin`)" : "",
  ].filter(Boolean).join("; ");

  const sfxServices = [
    names.includes("assets.generate_sfx") ? "jsfxr (`assets.generate_sfx` — local, free, retro SFX)" : "",
    names.includes("assets.search_freesound") ? "Freesound (`assets.search_freesound` + `assets.preview_freesound`)" : "",
    names.includes("ai.elevenlabs_sound_effect") ? "ElevenLabs (`ai.elevenlabs_sound_effect`)" : "",
  ].filter(Boolean).join("; ");

  const musicServices = [
    names.includes("ai.suno_generate") ? "Suno (`ai.suno_generate` — AI music)" : "",
    names.includes("ai.fal_stable_audio") ? "fal.ai Stable Audio (`ai.fal_stable_audio`)" : "",
  ].filter(Boolean).join("; ");

  const voiceServices = [
    names.includes("ai.elevenlabs_tts") ? "ElevenLabs (`ai.elevenlabs_tts` — 20+ voices)" : "",
    names.includes("ai.fal_kokoro_tts") ? "fal.ai Kokoro (`ai.fal_kokoro_tts`)" : "",
  ].filter(Boolean).join("; ");

  const imageGenServices = [
    names.includes("ai.stability_generate") ? "Stability AI (`ai.stability_generate`, `ai.stability_generate_ultra`, `ai.stability_generate_core`)" : "",
    names.includes("ai.dalle_generate") ? "DALL-E (`ai.dalle_generate`)" : "",
    names.includes("ai.huggingface_text_to_image") ? "Hugging Face (`ai.huggingface_text_to_image`)" : "",
    names.includes("ai.fal_flux_pro") ? "fal.ai FLUX (`ai.fal_flux_pro`, `ai.fal_flux_schnell`, `ai.fal_sdxl`)" : "",
  ].filter(Boolean).join("; ");

  const searchServices = names
    .filter((n) => n.startsWith("assets.search_"))
    .map((n) => `\`${n}\``)
    .join(", ");

  return {
    "{{TEXTURE_SERVICES}}": textureServices || "No texture services configured",
    "{{MODEL_3D_SERVICES}}": model3dServices || "No 3D model services configured",
    "{{AUDIO_SFX_SERVICES}}": sfxServices || "No SFX services configured",
    "{{AUDIO_MUSIC_SERVICES}}": musicServices || "No music services configured",
    "{{AUDIO_VOICE_SERVICES}}": voiceServices || "No voice services configured",
    "{{IMAGE_GEN_SERVICES}}": imageGenServices || "No image generation services configured",
    "{{ASSET_SEARCH_SERVICES}}": searchServices || "No asset search services configured",
    "{{ALL_ASSET_SERVICES}}": byPrefix("assets.") || "No asset services configured",
    "{{ALL_AI_SERVICES}}": byPrefix("ai.") || "No AI services configured",
    "{{EDITOR_TOOLS}}": byPrefix("create_scene") + ", " + byPrefix("add_node") + ", " + byPrefix("set_property") + "..." || "Editor tools",
    "{{BLENDER_TOOLS}}": byPrefix("blender.") || "No Blender tools",
    "{{PIPELINE_TOOLS}}": byPrefix("pipeline.") || "No pipeline tools",
  };
}

let cachedTags: Record<string, string> | null = null;

/** Replace {{TAG}} placeholders in skill content with live tool lists. */
export function resolveSkillTags(content: string): string {
  if (!content.includes("{{")) return content;
  if (!cachedTags) cachedTags = buildToolTags();
  let resolved = content;
  for (const [tag, value] of Object.entries(cachedTags)) {
    resolved = resolved.replaceAll(tag, value);
  }
  return resolved;
}

/** Clear tag cache (call after tool registration changes). */
export function clearSkillTagCache(): void {
  cachedTags = null;
}

