/**
 * Blockade Labs Skybox AI tool handlers.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import {
  generateSkybox,
  getSkyboxStatus,
  listStyles,
  pollSkyboxDone,
  downloadSkybox,
  type SkyboxParams,
} from "./blockade.js";

const NO_KEY_MSG =
  "Blockade Labs API key not configured. Set BLOCKADE_LABS_API_KEY or configure via web settings.";

const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1_000; // 5 minutes

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("blockade_labs");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
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

// --- Tool Handlers ---

export async function handleBlockadeGenerateSkybox(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: SkyboxParams = {
    prompt,
    skybox_style_id: args.skybox_style_id as number | undefined,
    negative_text: args.negative_text as string | undefined,
    enhance_prompt: args.enhance_prompt as boolean | undefined,
    seed: args.seed as number | undefined,
    control_image: args.control_image as string | undefined,
    control_model: args.control_model as SkyboxParams["control_model"],
    init_image: args.init_image as string | undefined,
    init_strength: args.init_strength as number | undefined,
    return_depth_hq: args.return_depth_hq as boolean | undefined,
    webhook_url: args.webhook_url as string | undefined,
  };

  const maxWaitMs = typeof args.max_wait_seconds === "number"
    ? args.max_wait_seconds * 1_000
    : DEFAULT_MAX_WAIT_MS;

  try {
    const skybox = await generateSkybox(keyOrErr, params);
    console.error(`[Blockade] Skybox task: ${skybox.id} — status: ${skybox.status}`);

    const done = await pollSkyboxDone(keyOrErr, skybox.id, maxWaitMs);

    if (!done.file_url) return err("Skybox completed but no file URL returned");

    const ext = done.file_url.split(".").pop()?.split("?")[0] || "jpg";
    const filename = `skybox_${done.id}.${ext}`;
    const destPath = join(projectRoot, "assets", "images", "skybox", filename);

    await downloadSkybox(done.file_url, destPath);
    await triggerGodotRescan(projectRoot);

    const resPath = `res://assets/images/skybox/${filename}`;
    const lines = [
      `Skybox generated: "${prompt}"`,
      ``,
      `Saved to: ${resPath}`,
      `Task ID: ${done.id}`,
    ];
    if (done.skybox_style_name) lines.push(`Style: ${done.skybox_style_name}`);
    if (done.depth_map_url) lines.push(`Depth map: ${done.depth_map_url}`);
    if (done.seed !== undefined) lines.push(`Seed: ${done.seed}`);

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`Blockade Labs error: ${(e as Error).message}`);
  }
}

export async function handleBlockadeListStyles(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const modelVersion = args.model_version as "2" | "3" | undefined;

  try {
    const styles = await listStyles(keyOrErr, modelVersion);
    if (styles.length === 0) return ok("No styles available.");

    const lines = [
      `Available Blockade Labs skybox styles${modelVersion ? ` (model v${modelVersion})` : ""}:`,
      ``,
      ...styles.map((s) => {
        const tags: string[] = [];
        if (s.premium) tags.push("premium");
        if (s.model_version) tags.push(`v${s.model_version}`);
        const suffix = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
        return `  ${s.id}: ${s.name}${suffix} (max ${s["max-char"]} chars)`;
      }),
    ];

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`Blockade Labs error: ${(e as Error).message}`);
  }
}

export async function handleBlockadeCheckTask(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const taskId = args.task_id as string | number;
  if (!taskId) return err("task_id is required");

  try {
    const skybox = await getSkyboxStatus(keyOrErr, taskId);
    const lines = [
      `Task ID: ${skybox.id}`,
      `Status: ${skybox.status}`,
    ];
    if (skybox.title) lines.push(`Title: ${skybox.title}`);
    if (skybox.skybox_style_name) lines.push(`Style: ${skybox.skybox_style_name}`);
    if (skybox.file_url) lines.push(`File URL: ${skybox.file_url}`);
    if (skybox.depth_map_url) lines.push(`Depth map: ${skybox.depth_map_url}`);
    if (skybox.thumb_url) lines.push(`Thumbnail: ${skybox.thumb_url}`);
    if (skybox.seed !== undefined) lines.push(`Seed: ${skybox.seed}`);
    if (skybox.error_message) lines.push(`Error: ${skybox.error_message}`);

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`Blockade Labs error: ${(e as Error).message}`);
  }
}
