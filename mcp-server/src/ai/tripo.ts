/**
 * Tripo AI API client — 3D model generation.
 * Docs: https://api.tripo3d.ai/v2/openapi
 */

import { writeFileSync, mkdirSync, createReadStream } from "fs";
import { dirname } from "path";

const BASE_URL = "https://api.tripo3d.ai/v2/openapi";
const POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_WAIT_MS = 600_000; // 10 minutes

// --- Types ---

export type TripoTaskStatus = "queued" | "running" | "success" | "failed" | "cancelled" | "unknown";

export interface TripoTaskOutput {
  model?: { url: string };
  rendered_image?: { url: string };
}

export interface TripoTask {
  task_id: string;
  type: string;
  status: TripoTaskStatus;
  progress?: number;
  output?: TripoTaskOutput;
  create_time?: number;
}

export interface TripoTaskResponse {
  code: number;
  data: TripoTask;
}

export interface TripoCreateResponse {
  code: number;
  data: { task_id: string };
}

export interface TripoUploadResponse {
  code: number;
  data: { image_token: string };
}

export interface TripoBalanceResponse {
  code: number;
  data: { balance: number };
}

// --- Param types ---

export interface TripoTextTo3DParams {
  type: "text_to_model";
  prompt: string;
  negative_prompt?: string;
  model_version?: string;
  art_style?: "auto" | "realistic" | "cartoon" | "sculpture" | "pbr";
  face_limit?: number;
  texture?: boolean;
  pbr?: boolean;
}

export interface TripoImageTo3DParams {
  type: "image_to_model";
  file: { type: string; file_token: string };
  model_version?: string;
  face_limit?: number;
  texture?: boolean;
  pbr?: boolean;
}

export interface TripoMultiviewParams {
  type: "multiview_to_model";
  files: Array<{ type: string; file_token: string; mode: "LEFT" | "RIGHT" | "BACK" | "LEFT_RIGHT_BACK" }>;
  model_version?: string;
}

export interface TripoRefineParams {
  type: "refine_model";
  draft_model_task_id: string;
  model_version?: string;
}

export interface TripoAnimateRigParams {
  type: "animate_rig";
  original_model_task_id: string;
  model_version?: string;
}

export interface TripoAnimateRetargetParams {
  type: "animate_retarget";
  original_model_task_id: string;
  animation: string;
  model_version?: string;
}

export interface TripoStylizeParams {
  type: "stylize_model";
  original_model_task_id: string;
  style: "voronoi" | "lego" | "minecraft";
  model_version?: string;
}

export interface TripoConversionParams {
  type: "conversion";
  original_model_task_id: string;
  format: "GLTF" | "USDZ" | "FBX" | "OBJ" | "STL";
  quad?: boolean;
  face_limit?: number;
  texture_size?: number;
  texture_format?: string;
  model_version?: string;
}

export type TripoTaskParams =
  | TripoTextTo3DParams
  | TripoImageTo3DParams
  | TripoMultiviewParams
  | TripoRefineParams
  | TripoAnimateRigParams
  | TripoAnimateRetargetParams
  | TripoStylizeParams
  | TripoConversionParams;

// --- Helpers ---

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function throwOnError(response: Response, context: string): Promise<void> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${context}: HTTP ${response.status} — ${body.slice(0, 200)}`);
  }
}

// --- API functions ---

export async function createTripoTask(
  apiKey: string,
  params: TripoTaskParams
): Promise<TripoCreateResponse> {
  const response = await fetch(`${BASE_URL}/task`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(params),
  });

  await throwOnError(response, "createTripoTask");
  return response.json() as Promise<TripoCreateResponse>;
}

export async function uploadTripoImage(
  apiKey: string,
  imagePath: string
): Promise<TripoUploadResponse> {
  const form = new FormData();
  const { readFileSync } = await import("fs");
  const { basename } = await import("path");
  const fileBuffer = readFileSync(imagePath);
  const blob = new Blob([fileBuffer]);
  form.append("file", blob, basename(imagePath));

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  await throwOnError(response, "uploadTripoImage");
  return response.json() as Promise<TripoUploadResponse>;
}

export async function getTripoTaskStatus(
  apiKey: string,
  taskId: string
): Promise<TripoTaskResponse> {
  const response = await fetch(`${BASE_URL}/task/${taskId}`, {
    headers: authHeaders(apiKey),
  });

  await throwOnError(response, "getTripoTaskStatus");
  return response.json() as Promise<TripoTaskResponse>;
}

export async function getTripoBalance(apiKey: string): Promise<TripoBalanceResponse> {
  const response = await fetch(`${BASE_URL}/user/balance`, {
    headers: authHeaders(apiKey),
  });

  await throwOnError(response, "getTripoBalance");
  return response.json() as Promise<TripoBalanceResponse>;
}

export async function pollTripoDone(
  apiKey: string,
  taskId: string,
  maxWaitMs: number = DEFAULT_MAX_WAIT_MS
): Promise<TripoTask> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const result = await getTripoTaskStatus(apiKey, taskId);
    const { status } = result.data;
    if (status === "success" || status === "failed" || status === "cancelled") {
      return result.data;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Tripo task ${taskId} timed out after ${maxWaitMs / 1000}s`);
}

export async function downloadTripoModel(url: string, destPath: string): Promise<void> {
  mkdirSync(dirname(destPath), { recursive: true });
  const response = await fetch(url, { headers: { "User-Agent": "GodotForge/0.2.0" } });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destPath, buffer);
}
