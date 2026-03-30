/**
 * Suno tool handlers — music generation, lyrics, task status, credits.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import {
  generateMusic,
  generateLyrics,
  getTaskStatus,
  getCredits,
  pollSunoDone,
  downloadAudio,
  type SunoGenerateParams,
} from "./suno.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG =
  "Suno API key not configured. Set SUNO_API_KEY environment variable or configure via web settings (API Keys tab).";

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("suno");
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

export async function handleSunoGenerate(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const customMode = Boolean(args.custom_mode ?? false);
  const instrumental = Boolean(args.instrumental ?? false);
  const prompt = args.prompt as string | undefined;

  if (!prompt) return err("prompt is required");
  if (customMode && (prompt.length > 3000)) return err("prompt exceeds 3000 characters for custom mode");
  if (!customMode && prompt.length > 500) return err("prompt exceeds 500 characters for non-custom mode");

  const params: SunoGenerateParams = {
    customMode,
    instrumental,
    model: args.model as SunoGenerateParams["model"],
    prompt,
    callBackUrl: args.callback_url as string | undefined,
    negativeTags: args.negative_tags as string | undefined,
    vocalGender: args.vocal_gender as SunoGenerateParams["vocalGender"],
    styleWeight: args.style_weight as number | undefined,
    weirdnessConstraint: args.weirdness_constraint as number | undefined,
  };

  if (customMode) {
    params.style = args.style as string | undefined;
    params.title = args.title as string | undefined;
  }

  try {
    const { taskId } = await generateMusic(keyOrErr, params);
    console.error(`[Suno] Music generation task: ${taskId}`);

    const maxWaitMs = (args.max_wait_seconds as number | undefined) != null
      ? (args.max_wait_seconds as number) * 1000
      : undefined;

    const task = await pollSunoDone(keyOrErr, taskId, maxWaitMs);

    if (task.status === "failed") {
      return err(`Suno task failed: ${task.tracks?.[0]?.error_message ?? "unknown error"}`);
    }

    const tracks = task.tracks ?? [];
    if (tracks.length === 0) return err("No tracks returned by Suno");

    const destDir = join(projectRoot, "assets", "audio", "music");
    const saved: string[] = [];

    for (const track of tracks) {
      if (!track.audio_url) continue;
      const filename = `${track.id ?? taskId}_${track.title?.replace(/\s+/g, "_") ?? "track"}.mp3`;
      const destPath = join(destDir, filename);
      await downloadAudio(track.audio_url, destPath);
      saved.push(`res://assets/audio/music/${filename}`);
    }

    await triggerGodotRescan(projectRoot);

    const lines = [
      `Music generated (${tracks.length} track(s)).`,
      `Task ID: ${taskId}`,
      "",
      ...saved.map((p, i) => `Track ${i + 1}: ${p}`),
    ];

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`Suno error: ${(e as Error).message}`);
  }
}

export async function handleSunoLyrics(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string | undefined;
  if (!prompt) return err("prompt is required");

  try {
    const lyrics = await generateLyrics(keyOrErr, prompt);
    return ok(`Generated lyrics:\n\n${lyrics}`);
  } catch (e) {
    return err(`Suno error: ${(e as Error).message}`);
  }
}

export async function handleSunoCheckTask(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const taskId = args.task_id as string | undefined;
  if (!taskId) return err("task_id is required");

  try {
    const task = await getTaskStatus(keyOrErr, taskId);
    const lines = [
      `Task ID: ${task.taskId}`,
      `Status: ${task.status}`,
    ];

    if (task.tracks) {
      for (const track of task.tracks) {
        lines.push(`  Track: ${track.title ?? track.id}`);
        if (track.audio_url) lines.push(`    Audio: ${track.audio_url}`);
        if (track.duration) lines.push(`    Duration: ${track.duration}s`);
        if (track.error_message) lines.push(`    Error: ${track.error_message}`);
      }
    }

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`Suno error: ${(e as Error).message}`);
  }
}

export async function handleSunoCredits(config: ConfigManager): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  try {
    const credits = await getCredits(keyOrErr);
    return ok(`Suno credits:\n${JSON.stringify(credits, null, 2)}`);
  } catch (e) {
    return err(`Suno error: ${(e as Error).message}`);
  }
}

// --- Godot Rescan ---

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
