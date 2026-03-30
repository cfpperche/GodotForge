/**
 * AI generation tool handlers — Meshy and future AI services.
 */

import { join } from "path";
import { ConfigManager } from "../config.js";
import {
  createTextTo3D,
  createImageTo3D,
  getTaskStatus,
  getBalance,
  pollUntilDone,
  downloadModel,
  type TextTo3DOptions,
  type ImageTo3DOptions,
} from "./meshy.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG = "Meshy API key not configured. Set MESHY_API_KEY environment variable or configure via web settings (API Keys tab).";

function requireMeshyKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("meshy");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

export async function handleMeshyTextTo3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrError = requireMeshyKey(config);
  if (typeof keyOrError !== "string") return keyOrError;
  const apiKey = keyOrError;

  const prompt = args.prompt as string;
  if (!prompt) return { content: [{ type: "text" as const, text: "prompt is required" }], isError: true };

  const options: TextTo3DOptions = {};
  if (args.topology) options.topology = args.topology as "quad" | "triangle";
  if (args.target_polycount) options.target_polycount = args.target_polycount as number;

  try {
    const taskId = await createTextTo3D(prompt, apiKey, options);
    console.error(`[Meshy] Text-to-3D task created: ${taskId} — polling...`);

    const task = await pollUntilDone(taskId, "text-to-3d", apiKey);

    if (task.status !== "SUCCEEDED") {
      const reason = task.task_error?.message || task.status;
      return { content: [{ type: "text" as const, text: `Meshy task failed: ${reason}` }], isError: true };
    }

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return { content: [{ type: "text" as const, text: "No GLB model in result" }], isError: true };

    const destDir = join(projectRoot, "assets", "models", "meshy");
    const destPath = join(destDir, `${taskId}.glb`);
    await downloadModel(glbUrl, destPath);
    await triggerGodotRescan(projectRoot);

    const resPath = `res://assets/models/meshy/${taskId}.glb`;
    return {
      content: [{
        type: "text" as const,
        text: `3D model generated from: "${prompt}"\n\nSaved to: ${resPath}\nTask ID: ${taskId}\n\nUse add_scene_instance or pipeline tools to add this model to your scene.`,
      }],
    };
  } catch (err) {
    return { content: [{ type: "text" as const, text: `Meshy error: ${(err as Error).message}` }], isError: true };
  }
}

export async function handleMeshyImageTo3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrError = requireMeshyKey(config);
  if (typeof keyOrError !== "string") return keyOrError;
  const apiKey = keyOrError;

  const imageUrl = args.image_url as string;
  if (!imageUrl) return { content: [{ type: "text" as const, text: "image_url is required" }], isError: true };

  const options: ImageTo3DOptions = {};
  if (args.ai_model) options.ai_model = args.ai_model as string;
  if (args.topology) options.topology = args.topology as "quad" | "triangle";
  if (args.target_polycount) options.target_polycount = args.target_polycount as number;
  if (args.enable_pbr !== undefined) options.enable_pbr = args.enable_pbr as boolean;

  try {
    const taskId = await createImageTo3D(imageUrl, apiKey, options);
    console.error(`[Meshy] Image-to-3D task created: ${taskId} — polling...`);

    const task = await pollUntilDone(taskId, "image-to-3d", apiKey);

    if (task.status !== "SUCCEEDED") {
      const reason = task.task_error?.message || task.status;
      return { content: [{ type: "text" as const, text: `Meshy task failed: ${reason}` }], isError: true };
    }

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return { content: [{ type: "text" as const, text: "No GLB model in result" }], isError: true };

    const destDir = join(projectRoot, "assets", "models", "meshy");
    const destPath = join(destDir, `${taskId}.glb`);
    await downloadModel(glbUrl, destPath);
    await triggerGodotRescan(projectRoot);

    const resPath = `res://assets/models/meshy/${taskId}.glb`;
    return {
      content: [{
        type: "text" as const,
        text: `3D model generated from image.\n\nSaved to: ${resPath}\nTask ID: ${taskId}\n\nUse add_scene_instance or pipeline tools to add this model to your scene.`,
      }],
    };
  } catch (err) {
    return { content: [{ type: "text" as const, text: `Meshy error: ${(err as Error).message}` }], isError: true };
  }
}

export async function handleMeshyCheckTask(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrError = requireMeshyKey(config);
  if (typeof keyOrError !== "string") return keyOrError;
  const apiKey = keyOrError;

  const taskId = args.task_id as string;
  if (!taskId) return { content: [{ type: "text" as const, text: "task_id is required" }], isError: true };

  const endpoint = (args.endpoint as string) === "image-to-3d" ? "image-to-3d" as const : "text-to-3d" as const;

  try {
    const task = await getTaskStatus(taskId, endpoint, apiKey);
    const lines = [
      `Task: ${task.id}`,
      `Status: ${task.status}`,
      `Progress: ${task.progress}%`,
    ];
    if (task.model_urls) lines.push(`Models: ${Object.keys(task.model_urls).join(", ")}`);
    if (task.task_error) lines.push(`Error: ${task.task_error.message}`);

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  } catch (err) {
    return { content: [{ type: "text" as const, text: `Meshy error: ${(err as Error).message}` }], isError: true };
  }
}

export async function handleMeshyBalance(
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrError = requireMeshyKey(config);
  if (typeof keyOrError !== "string") return keyOrError;
  const apiKey = keyOrError;

  try {
    const credits = await getBalance(apiKey);
    return { content: [{ type: "text" as const, text: `Meshy balance: ${credits} credits` }] };
  } catch (err) {
    return { content: [{ type: "text" as const, text: `Meshy error: ${(err as Error).message}` }], isError: true };
  }
}

// Reuse the Godot rescan pattern from assets/handlers.ts
import { existsSync, readFileSync } from "fs";

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
  } catch { /* Godot not running — ok */ }
}
