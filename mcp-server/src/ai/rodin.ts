/**
 * Rodin (Hyper3D) API client — 3D model generation.
 * Docs: https://hyperhuman.deemos.com/api/v2
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const BASE_URL = "https://hyperhuman.deemos.com/api/v2";
const POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_WAIT_MS = 600_000; // 10 minutes

// --- Types ---

export type RodinJobStatus = "Done" | "Processing" | "Failed";

export interface RodinJob {
  uuid: string;
  status?: RodinJobStatus;
}

export interface RodinCreateResponse {
  uuid: string;
  jobs: { subscription_key: string };
}

export interface RodinStatusResponse {
  jobs: Array<{ uuid: string; status: RodinJobStatus }>;
}

export interface RodinDownloadResponse {
  list: Array<{ name: string; url: string }>;
}

export interface RodinGenerateParams {
  prompt: string;
  images?: string[];
  condition_mode?: "concat" | "fuse";
  geometry?: "mesh" | "mesh_and_rig";
  material?: "PBR" | "Shaded";
  quality?: "high" | "medium" | "low" | "extra-low";
  tier?: "Regular" | "Sketch";
  ai_model?: "Rodin" | "Rodin-Large";
  seed?: number;
  mesh_simplify?: number;
  mesh_smooth?: boolean;
}

// --- Helpers ---

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

async function throwOnError(response: Response, context: string): Promise<void> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${context}: HTTP ${response.status} — ${body.slice(0, 200)}`);
  }
}

// --- API functions ---

export async function createRodinTask(
  apiKey: string,
  params: RodinGenerateParams
): Promise<RodinCreateResponse> {
  const form = new FormData();
  form.append("prompt", params.prompt);

  if (params.images) {
    for (const url of params.images) {
      form.append("images", url);
    }
  }
  if (params.condition_mode !== undefined) form.append("condition_mode", params.condition_mode);
  if (params.geometry !== undefined) form.append("geometry", params.geometry);
  if (params.material !== undefined) form.append("material", params.material);
  if (params.quality !== undefined) form.append("quality", params.quality);
  if (params.tier !== undefined) form.append("tier", params.tier);
  if (params.ai_model !== undefined) form.append("ai_model", params.ai_model);
  if (params.seed !== undefined) form.append("seed", String(params.seed));
  if (params.mesh_simplify !== undefined) form.append("mesh_simplify", String(params.mesh_simplify));
  if (params.mesh_smooth !== undefined) form.append("mesh_smooth", String(params.mesh_smooth));

  const response = await fetch(`${BASE_URL}/rodin`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: form,
  });

  await throwOnError(response, "createRodinTask");
  return response.json() as Promise<RodinCreateResponse>;
}

export async function getRodinStatus(
  apiKey: string,
  subscriptionKey: string
): Promise<RodinStatusResponse> {
  const response = await fetch(`${BASE_URL}/status`, {
    method: "POST",
    headers: { ...authHeaders(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify({ subscription_key: subscriptionKey }),
  });

  await throwOnError(response, "getRodinStatus");
  return response.json() as Promise<RodinStatusResponse>;
}

export async function downloadRodinResult(
  apiKey: string,
  taskUuid: string
): Promise<RodinDownloadResponse> {
  const response = await fetch(`${BASE_URL}/download`, {
    method: "POST",
    headers: { ...authHeaders(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify({ task_uuid: taskUuid }),
  });

  await throwOnError(response, "downloadRodinResult");
  return response.json() as Promise<RodinDownloadResponse>;
}

export async function pollRodinDone(
  apiKey: string,
  subscriptionKey: string,
  maxWaitMs: number = DEFAULT_MAX_WAIT_MS
): Promise<RodinStatusResponse> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const status = await getRodinStatus(apiKey, subscriptionKey);
    const allDone = status.jobs.every(
      (j) => j.status === "Done" || j.status === "Failed"
    );
    if (allDone) return status;

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Rodin task timed out after ${maxWaitMs / 1000}s`);
}

export async function downloadRodinFile(url: string, destPath: string): Promise<void> {
  mkdirSync(dirname(destPath), { recursive: true });
  const response = await fetch(url, { headers: { "User-Agent": "GodotForge/0.2.0" } });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destPath, buffer);
}
