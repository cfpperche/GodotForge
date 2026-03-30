/**
 * ElevenLabs tool handlers — TTS, sound effects, voice/model listing.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import {
  textToSpeech,
  generateSoundEffect,
  listVoices,
  listModels,
  saveAudioFile,
  type TTSParams,
  type SoundEffectParams,
  type ListVoicesParams,
} from "./elevenlabs.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG =
  "ElevenLabs API key not configured. Set ELEVENLABS_API_KEY or configure via web settings.";

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("elevenlabs");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
}

// --- Tool Handlers ---

export async function handleElevenLabsTTS(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const text = args.text as string;
  if (!text) return err("text is required");

  const voiceId = (args.voice_id as string) || "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)

  const params: TTSParams = {
    text,
    model_id: args.model_id as string | undefined,
    language_code: args.language_code as string | undefined,
    output_format: (args.output_format as string) || "mp3_44100_128",
    seed: args.seed as number | undefined,
    apply_text_normalization: args.apply_text_normalization as TTSParams["apply_text_normalization"],
  };

  if (args.stability !== undefined || args.similarity_boost !== undefined || args.style !== undefined || args.speed !== undefined) {
    params.voice_settings = {
      stability: args.stability as number | undefined,
      similarity_boost: args.similarity_boost as number | undefined,
      style: args.style as number | undefined,
      speed: args.speed as number | undefined,
      use_speaker_boost: args.use_speaker_boost as boolean | undefined,
    };
  }

  try {
    const audio = await textToSpeech(keyOrErr, voiceId, params);
    const timestamp = Date.now();
    const ext = resolveExtension(params.output_format ?? "mp3_44100_128");
    const destPath = join(projectRoot, "assets", "audio", "voices", `${voiceId}_${timestamp}.${ext}`);
    saveAudioFile(audio, destPath);
    await triggerGodotRescan(projectRoot);

    const resPath = `res://assets/audio/voices/${voiceId}_${timestamp}.${ext}`;
    return ok(`Speech generated.\n\nVoice: ${voiceId}\nText: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"\nSaved to: ${resPath}\nSize: ${audio.length} bytes`);
  } catch (e) {
    return err(`ElevenLabs error: ${(e as Error).message}`);
  }
}

export async function handleElevenLabsSoundEffect(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const text = args.text as string;
  if (!text) return err("text is required");

  const params: SoundEffectParams = {
    text,
    model_id: args.model_id as string | undefined,
    duration_seconds: args.duration_seconds as number | undefined,
    prompt_influence: args.prompt_influence as number | undefined,
    loop: args.loop as boolean | undefined,
    output_format: (args.output_format as string) || "mp3_44100_128",
  };

  try {
    const audio = await generateSoundEffect(keyOrErr, params);
    const timestamp = Date.now();
    const ext = resolveExtension(params.output_format ?? "mp3_44100_128");
    const destPath = join(projectRoot, "assets", "audio", "sfx", `${timestamp}.${ext}`);
    saveAudioFile(audio, destPath);
    await triggerGodotRescan(projectRoot);

    const resPath = `res://assets/audio/sfx/${timestamp}.${ext}`;
    return ok(`Sound effect generated.\n\nPrompt: "${text}"\nSaved to: ${resPath}\nSize: ${audio.length} bytes`);
  } catch (e) {
    return err(`ElevenLabs error: ${(e as Error).message}`);
  }
}

export async function handleElevenLabsListVoices(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const params: ListVoicesParams = {
    page_size: (args.page_size as number) || 10,
    search: args.search as string | undefined,
    sort: args.sort as string | undefined,
    category: args.category as string | undefined,
    voice_type: args.voice_type as string | undefined,
  };

  try {
    const voices = await listVoices(keyOrErr, params);
    if (voices.length === 0) return ok("No voices found.");

    const lines = voices.map((v) => {
      const labels = v.labels ? Object.entries(v.labels).map(([k, val]) => `${k}: ${val}`).join(", ") : "";
      const meta = [v.category, labels].filter(Boolean).join(" | ");
      return `${v.name} — ID: ${v.voice_id}${meta ? `\n  ${meta}` : ""}`;
    });

    return ok(`ElevenLabs voices (${voices.length}):\n\n${lines.join("\n\n")}`);
  } catch (e) {
    return err(`ElevenLabs error: ${(e as Error).message}`);
  }
}

export async function handleElevenLabsListModels(
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  try {
    const models = await listModels(keyOrErr);
    if (models.length === 0) return ok("No models found.");

    const lines = models
      .filter((m) => m.can_do_text_to_speech)
      .map((m) => {
        const langs = m.languages?.length ? `${m.languages.length} languages` : "";
        const meta = [langs].filter(Boolean).join(" | ");
        return `${m.name} — ID: ${m.model_id}${m.description ? `\n  ${m.description}` : ""}${meta ? `\n  ${meta}` : ""}`;
      });

    return ok(`ElevenLabs TTS models (${lines.length}):\n\n${lines.join("\n\n")}`);
  } catch (e) {
    return err(`ElevenLabs error: ${(e as Error).message}`);
  }
}

// --- Helpers ---

function resolveExtension(outputFormat: string): string {
  if (outputFormat.startsWith("pcm_")) return "pcm";
  if (outputFormat.startsWith("wav_")) return "wav";
  if (outputFormat.startsWith("opus_")) return "ogg";
  return "mp3";
}

async function triggerGodotRescan(projectRoot: string): Promise<void> {
  const portFile = join(projectRoot, ".godot", "godotforge.port");
  if (!existsSync(portFile)) return;
  const port = parseInt(readFileSync(portFile, "utf-8").trim(), 10);
  if (isNaN(port)) return;
  try {
    await fetch(`http://127.0.0.1:${port}/tools/execute_editor_script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: 'EditorInterface.get_resource_filesystem().scan()\n_result = "Rescanned"',
      }),
    });
  } catch { /* Godot not running */ }
}
