/**
 * AI generation tool handlers — Meshy.ai full API coverage.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import { pollUntil } from "./poll.js";
import {
  createTextTo3DPreview,
  createTextTo3DRefine,
  createImageTo3D,
  createMultiImageTo3D,
  createRemesh,
  createRetexture,
  getTaskStatus,
  getBalance,
  downloadModel,
  MESHY_POLL_OPTS,
  TERMINAL_STATUSES,
  type TaskEndpoint,
  type TextTo3DPreviewParams,
  type TextTo3DRefineParams,
  type ImageTo3DParams,
  type MultiImageTo3DParams,
  type RemeshParams,
  type RetextureParams,
} from "./meshy.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG = "Meshy API key not configured. Set MESHY_API_KEY environment variable or configure via web settings (API Keys tab).";

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("meshy");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
}

async function downloadAndRescan(
  glbUrl: string,
  taskId: string,
  projectRoot: string
): Promise<string> {
  const destDir = join(projectRoot, "assets", "models", "meshy");
  const destPath = join(destDir, `${taskId}.glb`);
  await downloadModel(glbUrl, destPath);
  await triggerGodotRescan(projectRoot);
  return `res://assets/models/meshy/${taskId}.glb`;
}

// --- Tool Handlers ---

export async function handleMeshyTextTo3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: TextTo3DPreviewParams = {
    prompt,
    model_type: args.model_type as TextTo3DPreviewParams["model_type"],
    ai_model: args.ai_model as TextTo3DPreviewParams["ai_model"],
    topology: args.topology as TextTo3DPreviewParams["topology"],
    target_polycount: args.target_polycount as number | undefined,
    should_remesh: args.should_remesh as boolean | undefined,
    symmetry_mode: args.symmetry_mode as TextTo3DPreviewParams["symmetry_mode"],
    pose_mode: args.pose_mode as TextTo3DPreviewParams["pose_mode"],
    moderation: args.moderation as boolean | undefined,
    target_formats: (args.target_formats as string[] | undefined) || ["glb"],
    auto_size: args.auto_size as boolean | undefined,
    origin_at: args.origin_at as TextTo3DPreviewParams["origin_at"],
  };

  try {
    const taskId = await createTextTo3DPreview(keyOrErr, params);
    console.error(`[Meshy] Text-to-3D preview task: ${taskId}`);
    const task = await pollUntil(() => getTaskStatus(taskId, "text-to-3d", keyOrErr), (t) => TERMINAL_STATUSES.has(t.status), { ...MESHY_POLL_OPTS, label: `Meshy text-to-3d ${taskId}` });
    if (task.status !== "SUCCEEDED") return err(`Task failed: ${task.task_error?.message || task.status}`);

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return err("No GLB model in result");

    const resPath = await downloadAndRescan(glbUrl, taskId, projectRoot);
    return ok(`3D model generated from: "${prompt}"\n\nSaved to: ${resPath}\nTask ID: ${taskId}\nUse ai.meshy_refine with this task ID to add textures.`);
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
  }
}

export async function handleMeshyRefine(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const previewTaskId = args.preview_task_id as string;
  if (!previewTaskId) return err("preview_task_id is required");

  const params: TextTo3DRefineParams = {
    preview_task_id: previewTaskId,
    enable_pbr: args.enable_pbr as boolean | undefined,
    texture_prompt: args.texture_prompt as string | undefined,
    texture_image_url: args.texture_image_url as string | undefined,
    ai_model: args.ai_model as TextTo3DRefineParams["ai_model"],
    moderation: args.moderation as boolean | undefined,
    remove_lighting: args.remove_lighting as boolean | undefined,
    target_formats: (args.target_formats as string[] | undefined) || ["glb"],
    auto_size: args.auto_size as boolean | undefined,
    origin_at: args.origin_at as TextTo3DRefineParams["origin_at"],
  };

  try {
    const taskId = await createTextTo3DRefine(keyOrErr, params);
    console.error(`[Meshy] Text-to-3D refine task: ${taskId}`);
    const task = await pollUntil(() => getTaskStatus(taskId, "text-to-3d", keyOrErr), (t) => TERMINAL_STATUSES.has(t.status), { ...MESHY_POLL_OPTS, label: `Meshy text-to-3d ${taskId}` });
    if (task.status !== "SUCCEEDED") return err(`Task failed: ${task.task_error?.message || task.status}`);

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return err("No GLB model in result");

    const resPath = await downloadAndRescan(glbUrl, taskId, projectRoot);
    return ok(`Textured 3D model generated.\n\nSaved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
  }
}

export async function handleMeshyImageTo3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imageUrl = args.image_url as string;
  if (!imageUrl) return err("image_url is required");

  const params: ImageTo3DParams = {
    image_url: imageUrl,
    model_type: args.model_type as ImageTo3DParams["model_type"],
    ai_model: args.ai_model as ImageTo3DParams["ai_model"],
    topology: args.topology as ImageTo3DParams["topology"],
    target_polycount: args.target_polycount as number | undefined,
    symmetry_mode: args.symmetry_mode as ImageTo3DParams["symmetry_mode"],
    should_remesh: args.should_remesh as boolean | undefined,
    save_pre_remeshed_model: args.save_pre_remeshed_model as boolean | undefined,
    should_texture: args.should_texture as boolean | undefined,
    enable_pbr: args.enable_pbr as boolean | undefined,
    pose_mode: args.pose_mode as ImageTo3DParams["pose_mode"],
    texture_prompt: args.texture_prompt as string | undefined,
    texture_image_url: args.texture_image_url as string | undefined,
    moderation: args.moderation as boolean | undefined,
    image_enhancement: args.image_enhancement as boolean | undefined,
    remove_lighting: args.remove_lighting as boolean | undefined,
    target_formats: (args.target_formats as string[] | undefined) || ["glb"],
    auto_size: args.auto_size as boolean | undefined,
    origin_at: args.origin_at as ImageTo3DParams["origin_at"],
  };

  try {
    const taskId = await createImageTo3D(keyOrErr, params);
    console.error(`[Meshy] Image-to-3D task: ${taskId}`);
    const task = await pollUntil(() => getTaskStatus(taskId, "image-to-3d", keyOrErr), (t) => TERMINAL_STATUSES.has(t.status), { ...MESHY_POLL_OPTS, label: `Meshy image-to-3d ${taskId}` });
    if (task.status !== "SUCCEEDED") return err(`Task failed: ${task.task_error?.message || task.status}`);

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return err("No GLB model in result");

    const resPath = await downloadAndRescan(glbUrl, taskId, projectRoot);
    return ok(`3D model generated from image.\n\nSaved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
  }
}

export async function handleMeshyMultiImageTo3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imageUrls = args.image_urls as string[];
  if (!imageUrls || imageUrls.length === 0) return err("image_urls is required (1-4 images)");

  const params: MultiImageTo3DParams = {
    image_urls: imageUrls,
    model_type: args.model_type as ImageTo3DParams["model_type"],
    ai_model: args.ai_model as ImageTo3DParams["ai_model"],
    topology: args.topology as ImageTo3DParams["topology"],
    target_polycount: args.target_polycount as number | undefined,
    symmetry_mode: args.symmetry_mode as ImageTo3DParams["symmetry_mode"],
    should_remesh: args.should_remesh as boolean | undefined,
    save_pre_remeshed_model: args.save_pre_remeshed_model as boolean | undefined,
    should_texture: args.should_texture as boolean | undefined,
    enable_pbr: args.enable_pbr as boolean | undefined,
    pose_mode: args.pose_mode as ImageTo3DParams["pose_mode"],
    texture_prompt: args.texture_prompt as string | undefined,
    texture_image_url: args.texture_image_url as string | undefined,
    moderation: args.moderation as boolean | undefined,
    image_enhancement: args.image_enhancement as boolean | undefined,
    remove_lighting: args.remove_lighting as boolean | undefined,
    target_formats: (args.target_formats as string[] | undefined) || ["glb"],
    auto_size: args.auto_size as boolean | undefined,
    origin_at: args.origin_at as ImageTo3DParams["origin_at"],
  };

  try {
    const taskId = await createMultiImageTo3D(keyOrErr, params);
    console.error(`[Meshy] Multi-Image-to-3D task: ${taskId}`);
    const task = await pollUntil(() => getTaskStatus(taskId, "multi-image-to-3d", keyOrErr), (t) => TERMINAL_STATUSES.has(t.status), { ...MESHY_POLL_OPTS, label: `Meshy multi-image-to-3d ${taskId}` });
    if (task.status !== "SUCCEEDED") return err(`Task failed: ${task.task_error?.message || task.status}`);

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return err("No GLB model in result");

    const resPath = await downloadAndRescan(glbUrl, taskId, projectRoot);
    return ok(`3D model generated from ${imageUrls.length} images.\n\nSaved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
  }
}

export async function handleMeshyRemesh(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  if (!args.input_task_id && !args.model_url) return err("input_task_id or model_url is required");

  const params: RemeshParams = {
    input_task_id: args.input_task_id as string | undefined,
    model_url: args.model_url as string | undefined,
    target_formats: (args.target_formats as string[] | undefined) || ["glb"],
    topology: args.topology as RemeshParams["topology"],
    target_polycount: args.target_polycount as number | undefined,
    resize_height: args.resize_height as number | undefined,
    auto_size: args.auto_size as boolean | undefined,
    origin_at: args.origin_at as RemeshParams["origin_at"],
    convert_format_only: args.convert_format_only as boolean | undefined,
  };

  try {
    const taskId = await createRemesh(keyOrErr, params);
    console.error(`[Meshy] Remesh task: ${taskId}`);
    const task = await pollUntil(() => getTaskStatus(taskId, "remesh", keyOrErr), (t) => TERMINAL_STATUSES.has(t.status), { ...MESHY_POLL_OPTS, label: `Meshy remesh ${taskId}` });
    if (task.status !== "SUCCEEDED") return err(`Task failed: ${task.task_error?.message || task.status}`);

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return err("No GLB model in result");

    const resPath = await downloadAndRescan(glbUrl, taskId, projectRoot);
    return ok(`Remeshed model saved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
  }
}

export async function handleMeshyRetexture(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  if (!args.input_task_id && !args.model_url) return err("input_task_id or model_url is required");
  if (!args.text_style_prompt && !args.image_style_url) return err("text_style_prompt or image_style_url is required");

  const params: RetextureParams = {
    input_task_id: args.input_task_id as string | undefined,
    model_url: args.model_url as string | undefined,
    text_style_prompt: args.text_style_prompt as string | undefined,
    image_style_url: args.image_style_url as string | undefined,
    ai_model: args.ai_model as RetextureParams["ai_model"],
    enable_original_uv: args.enable_original_uv as boolean | undefined,
    enable_pbr: args.enable_pbr as boolean | undefined,
    remove_lighting: args.remove_lighting as boolean | undefined,
    target_formats: (args.target_formats as string[] | undefined) || ["glb"],
  };

  try {
    const taskId = await createRetexture(keyOrErr, params);
    console.error(`[Meshy] Retexture task: ${taskId}`);
    const task = await pollUntil(() => getTaskStatus(taskId, "retexture", keyOrErr), (t) => TERMINAL_STATUSES.has(t.status), { ...MESHY_POLL_OPTS, label: `Meshy retexture ${taskId}` });
    if (task.status !== "SUCCEEDED") return err(`Task failed: ${task.task_error?.message || task.status}`);

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) return err("No GLB model in result");

    const resPath = await downloadAndRescan(glbUrl, taskId, projectRoot);
    return ok(`Retextured model saved to: ${resPath}\nTask ID: ${taskId}`);
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
  }
}

export async function handleMeshyCheckTask(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const taskId = args.task_id as string;
  if (!taskId) return err("task_id is required");

  const endpoint = (args.endpoint as TaskEndpoint) || "text-to-3d";

  try {
    const task = await getTaskStatus(taskId, endpoint, keyOrErr);
    const lines = [
      `Task: ${task.id}`,
      `Type: ${task.type}`,
      `Status: ${task.status}`,
      `Progress: ${task.progress}%`,
    ];
    if (task.preceding_tasks) lines.push(`Queue position: ${task.preceding_tasks}`);
    if (task.model_urls) lines.push(`Models: ${Object.keys(task.model_urls).join(", ")}`);
    if (task.texture_urls?.length) lines.push(`Textures: ${task.texture_urls.length} set(s)`);
    if (task.thumbnail_url) lines.push(`Thumbnail: ${task.thumbnail_url}`);
    if (task.task_error?.message) lines.push(`Error: ${task.task_error.message}`);

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
  }
}

export async function handleMeshyBalance(
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  try {
    const balance = await getBalance(keyOrErr);
    return ok(`Meshy balance: ${balance} credits`);
  } catch (e) {
    return err(`Meshy error: ${(e as Error).message}`);
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
