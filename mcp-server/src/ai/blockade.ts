/**
 * Blockade Labs Skybox AI API client.
 * Docs: https://api-documentation.blockadelabs.com/api/skybox.html
 *
 * Status flow: pending -> dispatched -> processing -> complete | abort | error
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { pollUntil } from "./poll.js";

const BASE_URL = "https://backend.blockadelabs.com";
const POLL_INTERVAL_MS = 5_000;

// --- Types ---

export interface SkyboxParams {
  prompt: string;
  skybox_style_id?: number;
  negative_text?: string;
  enhance_prompt?: boolean;
  seed?: number;
  control_image?: string;
  control_model?: "remix" | "scribble";
  init_image?: string;
  init_strength?: number;
  return_depth_hq?: boolean;
  webhook_url?: string;
}

export interface SkyboxObject {
  id: number;
  obfuscated_id: string;
  title: string;
  prompt: string;
  status: "pending" | "dispatched" | "processing" | "complete" | "abort" | "error";
  file_url: string;
  thumb_url: string;
  depth_map_url: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  skybox_style_id?: number;
  skybox_style_name?: string;
  seed?: number;
}

export interface SkyboxStyle {
  id: number;
  name: string;
  "max-char": number;
  negative_text?: string;
  model_version?: string;
  premium?: boolean;
}

// --- Core fetch ---

async function blockadeFetch(
  path: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Blockade Labs API ${res.status}: ${body}`);
  }
  return res;
}

// --- API Functions ---

export async function generateSkybox(
  apiKey: string,
  params: SkyboxParams
): Promise<SkyboxObject> {
  if (!params.prompt) throw new Error("prompt is required");
  if (params.prompt.length > 550) throw new Error("prompt must be 550 characters or fewer");
  if (params.negative_text && params.negative_text.length > 200) {
    throw new Error("negative_text must be 200 characters or fewer");
  }
  if (params.seed !== undefined && (params.seed < 0 || params.seed > 2_147_483_647)) {
    throw new Error("seed must be between 0 and 2147483647");
  }
  if (params.init_strength !== undefined && (params.init_strength < 0 || params.init_strength > 0.97)) {
    throw new Error("init_strength must be between 0 and 0.97");
  }

  const body: Record<string, unknown> = { prompt: params.prompt };
  if (params.skybox_style_id !== undefined) body.skybox_style_id = params.skybox_style_id;
  if (params.negative_text) body.negative_text = params.negative_text;
  if (params.enhance_prompt !== undefined) body.enhance_prompt = params.enhance_prompt;
  if (params.seed !== undefined) body.seed = params.seed;
  if (params.control_image) body.control_image = params.control_image;
  if (params.control_model) body.control_model = params.control_model;
  if (params.init_image) body.init_image = params.init_image;
  if (params.init_strength !== undefined) body.init_strength = params.init_strength;
  if (params.return_depth_hq !== undefined) body.return_depth_hq = params.return_depth_hq;
  if (params.webhook_url) body.webhook_url = params.webhook_url;

  const res = await blockadeFetch("/api/v1/skybox", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (await res.json()) as SkyboxObject;
}

export async function getSkyboxStatus(
  apiKey: string,
  id: number | string
): Promise<SkyboxObject> {
  const res = await blockadeFetch(`/api/v1/imagine/requests/${id}`, apiKey);
  const data = (await res.json()) as { request: SkyboxObject };
  return data.request;
}

export async function listStyles(
  apiKey: string,
  modelVersion?: "2" | "3"
): Promise<SkyboxStyle[]> {
  const query = modelVersion ? `?model_version=${modelVersion}` : "";
  const res = await blockadeFetch(`/api/v1/skybox/styles${query}`, apiKey);
  return (await res.json()) as SkyboxStyle[];
}

export async function pollSkyboxDone(
  apiKey: string,
  id: number | string,
  maxWaitMs: number
): Promise<SkyboxObject> {
  const skybox = await pollUntil(
    () => getSkyboxStatus(apiKey, id),
    (s) => s.status === "complete" || s.status === "error" || s.status === "abort",
    { intervalMs: POLL_INTERVAL_MS, maxWaitMs, label: `Skybox ${id}` }
  );

  if (skybox.status === "error") {
    throw new Error(`Skybox generation failed: ${skybox.error_message || "unknown error"}`);
  }
  if (skybox.status === "abort") {
    throw new Error("Skybox generation was aborted");
  }

  return skybox;
}

export async function downloadSkybox(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download skybox: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
