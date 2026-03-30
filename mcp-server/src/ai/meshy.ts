/**
 * Meshy.ai API client — full coverage of all endpoints and parameters.
 * Text-to-3D, Image-to-3D, Multi-Image-to-3D, Remesh, Retexture, Balance.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { pollUntil } from "./poll.js";

const BASE_URL = "https://api.meshy.ai";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 300_000; // 5 minutes

// --- Types ---

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED" | "EXPIRED";

export interface MeshyTask {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number;
  prompt?: string;
  model_urls?: Record<string, string>;
  texture_urls?: Array<Record<string, string>>;
  thumbnail_url?: string;
  created_at?: number;
  started_at?: number;
  finished_at?: number;
  expires_at?: number;
  preceding_tasks?: number;
  task_error?: { message: string };
}

export interface TextTo3DPreviewParams {
  prompt: string;
  model_type?: "standard" | "lowpoly";
  ai_model?: "meshy-5" | "meshy-6" | "latest";
  topology?: "quad" | "triangle";
  target_polycount?: number;
  should_remesh?: boolean;
  symmetry_mode?: "off" | "auto" | "on";
  pose_mode?: "a-pose" | "t-pose" | "";
  moderation?: boolean;
  target_formats?: string[];
  auto_size?: boolean;
  origin_at?: "bottom" | "center";
}

export interface TextTo3DRefineParams {
  preview_task_id: string;
  enable_pbr?: boolean;
  texture_prompt?: string;
  texture_image_url?: string;
  ai_model?: "meshy-5" | "meshy-6" | "latest";
  moderation?: boolean;
  remove_lighting?: boolean;
  target_formats?: string[];
  auto_size?: boolean;
  origin_at?: "bottom" | "center";
}

export interface ImageTo3DParams {
  image_url: string;
  model_type?: "standard" | "lowpoly";
  ai_model?: "meshy-5" | "meshy-6" | "latest";
  topology?: "quad" | "triangle";
  target_polycount?: number;
  symmetry_mode?: "off" | "auto" | "on";
  should_remesh?: boolean;
  save_pre_remeshed_model?: boolean;
  should_texture?: boolean;
  enable_pbr?: boolean;
  pose_mode?: "a-pose" | "t-pose" | "";
  texture_prompt?: string;
  texture_image_url?: string;
  moderation?: boolean;
  image_enhancement?: boolean;
  remove_lighting?: boolean;
  target_formats?: string[];
  auto_size?: boolean;
  origin_at?: "bottom" | "center";
}

export interface MultiImageTo3DParams extends Omit<ImageTo3DParams, "image_url"> {
  image_urls: string[];
}

export interface RemeshParams {
  input_task_id?: string;
  model_url?: string;
  target_formats?: string[];
  topology?: "quad" | "triangle";
  target_polycount?: number;
  resize_height?: number;
  auto_size?: boolean;
  origin_at?: "bottom" | "center";
  convert_format_only?: boolean;
}

export interface RetextureParams {
  input_task_id?: string;
  model_url?: string;
  text_style_prompt?: string;
  image_style_url?: string;
  ai_model?: "meshy-5" | "meshy-6" | "latest";
  enable_original_uv?: boolean;
  enable_pbr?: boolean;
  remove_lighting?: boolean;
  target_formats?: string[];
}

// --- API Client ---

async function meshyFetch(
  path: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meshy API ${res.status}: ${body}`);
  }
  return res;
}

function buildBody(params: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      body[key] = value;
    }
  }
  return body;
}

// --- Endpoints ---

export async function createTextTo3DPreview(
  apiKey: string,
  params: TextTo3DPreviewParams
): Promise<string> {
  const body = buildBody({
    mode: "preview",
    prompt: params.prompt,
    model_type: params.model_type,
    ai_model: params.ai_model,
    topology: params.topology,
    target_polycount: params.target_polycount,
    should_remesh: params.should_remesh,
    symmetry_mode: params.symmetry_mode,
    pose_mode: params.pose_mode,
    moderation: params.moderation,
    target_formats: params.target_formats || ["glb"],
    auto_size: params.auto_size,
    origin_at: params.origin_at,
  });
  const res = await meshyFetch("/openapi/v2/text-to-3d", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function createTextTo3DRefine(
  apiKey: string,
  params: TextTo3DRefineParams
): Promise<string> {
  const body = buildBody({
    mode: "refine",
    preview_task_id: params.preview_task_id,
    enable_pbr: params.enable_pbr,
    texture_prompt: params.texture_prompt,
    texture_image_url: params.texture_image_url,
    ai_model: params.ai_model,
    moderation: params.moderation,
    remove_lighting: params.remove_lighting,
    target_formats: params.target_formats || ["glb"],
    auto_size: params.auto_size,
    origin_at: params.origin_at,
  });
  const res = await meshyFetch("/openapi/v2/text-to-3d", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function createImageTo3D(
  apiKey: string,
  params: ImageTo3DParams
): Promise<string> {
  const body = buildBody({
    image_url: params.image_url,
    model_type: params.model_type,
    ai_model: params.ai_model,
    topology: params.topology,
    target_polycount: params.target_polycount,
    symmetry_mode: params.symmetry_mode,
    should_remesh: params.should_remesh,
    save_pre_remeshed_model: params.save_pre_remeshed_model,
    should_texture: params.should_texture,
    enable_pbr: params.enable_pbr,
    pose_mode: params.pose_mode,
    texture_prompt: params.texture_prompt,
    texture_image_url: params.texture_image_url,
    moderation: params.moderation,
    image_enhancement: params.image_enhancement,
    remove_lighting: params.remove_lighting,
    target_formats: params.target_formats || ["glb"],
    auto_size: params.auto_size,
    origin_at: params.origin_at,
  });
  const res = await meshyFetch("/openapi/v1/image-to-3d", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function createMultiImageTo3D(
  apiKey: string,
  params: MultiImageTo3DParams
): Promise<string> {
  const { image_urls, ...rest } = params;
  const body = buildBody({
    image_urls,
    model_type: rest.model_type,
    ai_model: rest.ai_model,
    topology: rest.topology,
    target_polycount: rest.target_polycount,
    symmetry_mode: rest.symmetry_mode,
    should_remesh: rest.should_remesh,
    save_pre_remeshed_model: rest.save_pre_remeshed_model,
    should_texture: rest.should_texture,
    enable_pbr: rest.enable_pbr,
    pose_mode: rest.pose_mode,
    texture_prompt: rest.texture_prompt,
    texture_image_url: rest.texture_image_url,
    moderation: rest.moderation,
    image_enhancement: rest.image_enhancement,
    remove_lighting: rest.remove_lighting,
    target_formats: rest.target_formats || ["glb"],
    auto_size: rest.auto_size,
    origin_at: rest.origin_at,
  });
  const res = await meshyFetch("/openapi/v1/multi-image-to-3d", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function createRemesh(
  apiKey: string,
  params: RemeshParams
): Promise<string> {
  const body = buildBody({
    input_task_id: params.input_task_id,
    model_url: params.model_url,
    target_formats: params.target_formats || ["glb"],
    topology: params.topology,
    target_polycount: params.target_polycount,
    resize_height: params.resize_height,
    auto_size: params.auto_size,
    origin_at: params.origin_at,
    convert_format_only: params.convert_format_only,
  });
  const res = await meshyFetch("/openapi/v1/remesh", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function createRetexture(
  apiKey: string,
  params: RetextureParams
): Promise<string> {
  const body = buildBody({
    input_task_id: params.input_task_id,
    model_url: params.model_url,
    text_style_prompt: params.text_style_prompt,
    image_style_url: params.image_style_url,
    ai_model: params.ai_model,
    enable_original_uv: params.enable_original_uv,
    enable_pbr: params.enable_pbr,
    remove_lighting: params.remove_lighting,
    target_formats: params.target_formats || ["glb"],
  });
  const res = await meshyFetch("/openapi/v1/retexture", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export type TaskEndpoint = "text-to-3d" | "image-to-3d" | "multi-image-to-3d" | "remesh" | "retexture";

const ENDPOINT_VERSIONS: Record<TaskEndpoint, string> = {
  "text-to-3d": "v2",
  "image-to-3d": "v1",
  "multi-image-to-3d": "v1",
  "remesh": "v1",
  "retexture": "v1",
};

export async function getTaskStatus(
  taskId: string,
  endpoint: TaskEndpoint,
  apiKey: string
): Promise<MeshyTask> {
  const version = ENDPOINT_VERSIONS[endpoint];
  const res = await meshyFetch(`/openapi/${version}/${endpoint}/${taskId}`, apiKey);
  return (await res.json()) as MeshyTask;
}

export async function getBalance(apiKey: string): Promise<number> {
  const res = await meshyFetch("/openapi/v1/balance", apiKey);
  const data = (await res.json()) as { balance: number };
  return data.balance;
}

// --- Polling & Download ---

export const TERMINAL_STATUSES: Set<TaskStatus> = new Set(["SUCCEEDED", "FAILED", "CANCELED", "EXPIRED"]);

/** Poll interval and max wait, exported for handlers to pass to pollUntil. */
export const MESHY_POLL_OPTS = { intervalMs: POLL_INTERVAL_MS, maxWaitMs: MAX_POLL_MS };

export async function downloadModel(modelUrl: string, destPath: string): Promise<void> {
  const res = await fetch(modelUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
