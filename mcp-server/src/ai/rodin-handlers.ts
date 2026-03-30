/**
 * Rodin (Hyper3D) tool handlers — 3D model generation.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import {
  createRodinTask,
  getRodinStatus,
  downloadRodinResult,
  downloadRodinFile,
  pollRodinDone,
  type RodinGenerateParams,
} from "./rodin.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG =
  "Rodin API key not configured. Set RODIN_API_KEY environment variable or configure via web settings (API Keys tab).";

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("rodin");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
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

// --- Handlers ---

export async function handleRodinGenerate(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: RodinGenerateParams = {
    prompt,
    images: args.images as string[] | undefined,
    condition_mode: args.condition_mode as RodinGenerateParams["condition_mode"],
    geometry: args.geometry as RodinGenerateParams["geometry"],
    material: args.material as RodinGenerateParams["material"],
    quality: args.quality as RodinGenerateParams["quality"],
    tier: args.tier as RodinGenerateParams["tier"],
    ai_model: args.ai_model as RodinGenerateParams["ai_model"],
    seed: args.seed as number | undefined,
    mesh_simplify: args.mesh_simplify as number | undefined,
    mesh_smooth: args.mesh_smooth as boolean | undefined,
  };

  try {
    const task = await createRodinTask(keyOrErr, params);
    console.error(`[Rodin] Task created: uuid=${task.uuid} subscription_key=${task.jobs.subscription_key}`);

    const statusResult = await pollRodinDone(keyOrErr, task.jobs.subscription_key);
    const failedJobs = statusResult.jobs.filter((j) => j.status === "Failed");
    if (failedJobs.length > 0) {
      return err(`Rodin generation failed for jobs: ${failedJobs.map((j) => j.uuid).join(", ")}`);
    }

    const downloads = await downloadRodinResult(keyOrErr, task.uuid);
    const glbEntry = downloads.list.find((f) => f.name.endsWith(".glb"));
    if (!glbEntry) {
      const available = downloads.list.map((f) => f.name).join(", ");
      return err(`No GLB file in result. Available: ${available}`);
    }

    const destDir = join(projectRoot, "assets", "models", "rodin");
    const destPath = join(destDir, `${task.uuid}.glb`);
    await downloadRodinFile(glbEntry.url, destPath);
    await triggerGodotRescan(projectRoot);

    const resPath = `res://assets/models/rodin/${task.uuid}.glb`;
    return ok(
      `3D model generated from: "${prompt}"\n\nSaved to: ${resPath}\nTask UUID: ${task.uuid}\n` +
        `Files available: ${downloads.list.map((f) => f.name).join(", ")}`
    );
  } catch (e) {
    return err(`Rodin error: ${(e as Error).message}`);
  }
}

export async function handleRodinCheckTask(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const subscriptionKey = args.subscription_key as string;
  if (!subscriptionKey) return err("subscription_key is required");

  try {
    const status = await getRodinStatus(keyOrErr, subscriptionKey);
    const lines = status.jobs.map((j) => `  ${j.uuid}: ${j.status}`);
    return ok(`Rodin task status:\n${lines.join("\n")}`);
  } catch (e) {
    return err(`Rodin error: ${(e as Error).message}`);
  }
}
