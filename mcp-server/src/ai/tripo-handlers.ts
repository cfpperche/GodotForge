/**
 * Tripo AI tool handlers — text/image/multiview to 3D, refine, animate, stylize.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import {
  createTripoTask,
  uploadTripoImage,
  getTripoTaskStatus,
  getTripoBalance,
  pollTripoDone,
  downloadTripoModel,
  type TripoTask,
} from "./tripo.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG =
  "Tripo API key not configured. Set TRIPO_API_KEY environment variable or configure via web settings (API Keys tab).";

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("tripo");
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

async function downloadAndRescan(
  task: TripoTask,
  subdir: string,
  projectRoot: string
): Promise<string> {
  const output = task.output || {};
  const m = output.model;
  const glbUrl = output.pbr_model || (typeof m === "string" ? m : m?.url) || null;
  if (!glbUrl) throw new Error("No model URL in task output: " + JSON.stringify(Object.keys(output)));

  const destDir = join(projectRoot, "assets", "models", "tripo", subdir);
  const destPath = join(destDir, `${task.task_id}.glb`);
  await downloadTripoModel(glbUrl, destPath);
  await triggerGodotRescan(projectRoot);
  return `res://assets/models/tripo/${subdir}/${task.task_id}.glb`;
}

// --- Handlers ---

export async function handleTripoTextTo3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  try {
    const result = await createTripoTask(keyOrErr, {
      type: "text_to_model",
      prompt,
      negative_prompt: args.negative_prompt as string | undefined,
      model_version: args.model_version as string | undefined,
      art_style: args.art_style as "auto" | "realistic" | "cartoon" | "sculpture" | "pbr" | undefined,
      face_limit: args.face_limit as number | undefined,
      texture: args.texture as boolean | undefined,
      pbr: args.pbr as boolean | undefined,
    });

    const taskId = result.data.task_id;
    console.error(`[Tripo] Text-to-3D task: ${taskId}`);

    const task = await pollTripoDone(keyOrErr, taskId);
    if (task.status !== "success") return err(`Task failed: ${task.status}`);

    const resPath = await downloadAndRescan(task, "text", projectRoot);
    return ok(`3D model generated from: "${prompt}"\n\nSaved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Tripo error: ${(e as Error).message}`);
  }
}

export async function handleTripoImageTo3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imagePath = args.image_path as string;
  if (!imagePath) return err("image_path is required");

  try {
    const upload = await uploadTripoImage(keyOrErr, imagePath);
    const fileToken = upload.data.image_token;
    console.error(`[Tripo] Image uploaded: token=${fileToken}`);

    const result = await createTripoTask(keyOrErr, {
      type: "image_to_model",
      file: { type: "png", file_token: fileToken },
      model_version: args.model_version as string | undefined,
      face_limit: args.face_limit as number | undefined,
      texture: args.texture as boolean | undefined,
      pbr: args.pbr as boolean | undefined,
    });

    const taskId = result.data.task_id;
    console.error(`[Tripo] Image-to-3D task: ${taskId}`);

    const task = await pollTripoDone(keyOrErr, taskId);
    if (task.status !== "success") return err(`Task failed: ${task.status}`);

    const resPath = await downloadAndRescan(task, "image", projectRoot);
    return ok(`3D model generated from image: ${imagePath}\n\nSaved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Tripo error: ${(e as Error).message}`);
  }
}

export async function handleTripoRefine(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const draftTaskId = args.draft_model_task_id as string;
  if (!draftTaskId) return err("draft_model_task_id is required");

  try {
    const result = await createTripoTask(keyOrErr, {
      type: "refine_model",
      draft_model_task_id: draftTaskId,
      model_version: args.model_version as string | undefined,
    });

    const taskId = result.data.task_id;
    console.error(`[Tripo] Refine task: ${taskId}`);

    const task = await pollTripoDone(keyOrErr, taskId);
    if (task.status !== "success") return err(`Task failed: ${task.status}`);

    const resPath = await downloadAndRescan(task, "refined", projectRoot);
    return ok(`Refined model saved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Tripo error: ${(e as Error).message}`);
  }
}

export async function handleTripoAnimate(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const originalTaskId = args.original_model_task_id as string;
  if (!originalTaskId) return err("original_model_task_id is required");

  try {
    // Step 1: rig
    const rigResult = await createTripoTask(keyOrErr, {
      type: "animate_rig",
      original_model_task_id: originalTaskId,
      model_version: args.model_version as string | undefined,
    });

    const rigTaskId = rigResult.data.task_id;
    console.error(`[Tripo] Animate rig task: ${rigTaskId}`);

    const rigTask = await pollTripoDone(keyOrErr, rigTaskId);
    if (rigTask.status !== "success") return err(`Rig task failed: ${rigTask.status}`);

    // Step 2: retarget (optional — only if animation preset provided)
    const animation = args.animation as string | undefined;
    if (!animation) {
      const resPath = await downloadAndRescan(rigTask, "animated", projectRoot);
      return ok(`Rigged model saved to: ${resPath}\nRig Task ID: ${rigTaskId}`);
    }

    const retargetResult = await createTripoTask(keyOrErr, {
      type: "animate_retarget",
      original_model_task_id: rigTaskId,
      animation,
      model_version: args.model_version as string | undefined,
    });

    const retargetTaskId = retargetResult.data.task_id;
    console.error(`[Tripo] Animate retarget task: ${retargetTaskId}`);

    const retargetTask = await pollTripoDone(keyOrErr, retargetTaskId);
    if (retargetTask.status !== "success") return err(`Retarget task failed: ${retargetTask.status}`);

    const resPath = await downloadAndRescan(retargetTask, "animated", projectRoot);
    return ok(
      `Animated model (${animation}) saved to: ${resPath}\nRig Task ID: ${rigTaskId}\nRetarget Task ID: ${retargetTaskId}`
    );
  } catch (e) {
    return err(`Tripo error: ${(e as Error).message}`);
  }
}

export async function handleTripoStylize(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const originalTaskId = args.original_model_task_id as string;
  const style = args.style as "voronoi" | "lego" | "minecraft";
  if (!originalTaskId) return err("original_model_task_id is required");
  if (!style) return err("style is required (voronoi, lego, minecraft)");

  try {
    const result = await createTripoTask(keyOrErr, {
      type: "stylize_model",
      original_model_task_id: originalTaskId,
      style,
      model_version: args.model_version as string | undefined,
    });

    const taskId = result.data.task_id;
    console.error(`[Tripo] Stylize task: ${taskId}`);

    const task = await pollTripoDone(keyOrErr, taskId);
    if (task.status !== "success") return err(`Task failed: ${task.status}`);

    const resPath = await downloadAndRescan(task, "stylized", projectRoot);
    return ok(`Stylized model (${style}) saved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Tripo error: ${(e as Error).message}`);
  }
}

export async function handleTripoCheckTask(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const taskId = args.task_id as string;
  if (!taskId) return err("task_id is required");

  try {
    const result = await getTripoTaskStatus(keyOrErr, taskId);
    const { data: task } = result;
    const lines = [
      `Task ID: ${task.task_id}`,
      `Type: ${task.type}`,
      `Status: ${task.status}`,
    ];
    if (task.progress !== undefined) lines.push(`Progress: ${task.progress}%`);
    const m = task.output?.model;
    const modelUrl = task.output?.pbr_model || (typeof m === "string" ? m : m?.url) || null;
    if (modelUrl) lines.push(`Model URL: ${String(modelUrl).slice(0, 80)}...`);
    const renderedImg = task.output?.rendered_image;
    if (typeof renderedImg === "string") lines.push(`Preview: ${renderedImg.slice(0, 80)}...`);
    else if (renderedImg && typeof renderedImg === "object" && "url" in renderedImg) lines.push(`Preview: ${renderedImg.url}`);

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`Tripo error: ${(e as Error).message}`);
  }
}

export async function handleTripoBalance(config: ConfigManager): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  try {
    const result = await getTripoBalance(keyOrErr);
    return ok(`Tripo balance: ${result.data.balance} credits`);
  } catch (e) {
    return err(`Tripo error: ${(e as Error).message}`);
  }
}
