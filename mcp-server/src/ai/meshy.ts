/**
 * Meshy.ai API client — AI-powered 3D model generation.
 * Text-to-3D, Image-to-3D, task polling, and model download.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const BASE_URL = "https://api.meshy.ai";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 300_000; // 5 minutes

export interface MeshyTask {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED" | "EXPIRED";
  progress: number;
  model_urls?: Record<string, string>;
  texture_urls?: Array<Record<string, string>>;
  thumbnail_url?: string;
  task_error?: { message: string };
  created_at?: number;
  finished_at?: number;
}

export interface TextTo3DOptions {
  topology?: "quad" | "triangle";
  target_polycount?: number;
}

export interface ImageTo3DOptions {
  ai_model?: string;
  topology?: "quad" | "triangle";
  target_polycount?: number;
  enable_pbr?: boolean;
}

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

export async function createTextTo3D(
  prompt: string,
  apiKey: string,
  options: TextTo3DOptions = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    mode: "preview",
    prompt,
    target_formats: ["glb"],
  };
  if (options.topology) body.topology = options.topology;
  if (options.target_polycount) body.target_polycount = options.target_polycount;

  const res = await meshyFetch("/openapi/v2/text-to-3d", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function createImageTo3D(
  imageUrl: string,
  apiKey: string,
  options: ImageTo3DOptions = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    image_url: imageUrl,
    target_formats: ["glb"],
  };
  if (options.ai_model) body.ai_model = options.ai_model;
  if (options.topology) body.topology = options.topology;
  if (options.target_polycount) body.target_polycount = options.target_polycount;
  if (options.enable_pbr !== undefined) body.enable_pbr = options.enable_pbr;

  const res = await meshyFetch("/openapi/v1/image-to-3d", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result: string };
  return data.result;
}

export async function getTaskStatus(
  taskId: string,
  endpoint: "text-to-3d" | "image-to-3d",
  apiKey: string
): Promise<MeshyTask> {
  const version = endpoint === "text-to-3d" ? "v2" : "v1";
  const res = await meshyFetch(`/openapi/${version}/${endpoint}/${taskId}`, apiKey);
  return (await res.json()) as MeshyTask;
}

export async function getBalance(apiKey: string): Promise<number> {
  const res = await meshyFetch("/openapi/v1/balance", apiKey);
  const data = (await res.json()) as { credits: number };
  return data.credits;
}

export async function pollUntilDone(
  taskId: string,
  endpoint: "text-to-3d" | "image-to-3d",
  apiKey: string,
  maxWaitMs: number = MAX_POLL_MS
): Promise<MeshyTask> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const task = await getTaskStatus(taskId, endpoint, apiKey);
    if (task.status === "SUCCEEDED" || task.status === "FAILED" || task.status === "CANCELED" || task.status === "EXPIRED") {
      return task;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Meshy task ${taskId} timed out after ${maxWaitMs / 1000}s`);
}

export async function downloadModel(modelUrl: string, destPath: string): Promise<void> {
  const res = await fetch(modelUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
