/**
 * OpenAI DALL-E API client.
 * Image generation (DALL-E 2 + 3), editing, and variations.
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { dirname, extname } from "path";

const BASE_URL = "https://api.openai.com";

// --- Types ---

export type DalleModel = "dall-e-2" | "dall-e-3";
export type ImageQuality = "standard" | "hd";
export type ImageStyle = "vivid" | "natural";
export type ResponseFormat = "url" | "b64_json";

export type DallE2Size = "256x256" | "512x512" | "1024x1024";
export type DallE3Size = "1024x1024" | "1792x1024" | "1024x1792";

export interface GenerateImageParams {
  prompt: string;
  model?: DalleModel;
  n?: number;
  quality?: ImageQuality;
  size?: DallE2Size | DallE3Size;
  style?: ImageStyle;
  response_format?: ResponseFormat;
}

export interface ImageResult {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface EditImageParams {
  n?: number;
  size?: DallE2Size;
  response_format?: ResponseFormat;
}

export interface VariationParams {
  n?: number;
  size?: DallE2Size;
  response_format?: ResponseFormat;
}

// --- Helpers ---

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

async function apiPost<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function apiPostMultipart<T>(apiKey: string, path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function fileToBlob(filePath: string): Blob {
  const buffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase().replace(".", "");
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  return new Blob([buffer], { type: mime });
}

// --- API Functions ---

export async function generateImage(
  apiKey: string,
  params: GenerateImageParams
): Promise<ImageResult[]> {
  const body: Record<string, unknown> = { prompt: params.prompt };
  if (params.model) body.model = params.model;
  if (params.n !== undefined) body.n = params.n;
  if (params.quality) body.quality = params.quality;
  if (params.size) body.size = params.size;
  if (params.style) body.style = params.style;
  if (params.response_format) body.response_format = params.response_format;

  const data = await apiPost<{ data: ImageResult[] }>(apiKey, "/v1/images/generations", body);
  return data.data;
}

export async function editImage(
  apiKey: string,
  imagePath: string,
  prompt: string,
  params: EditImageParams,
  maskPath?: string
): Promise<ImageResult[]> {
  const form = new FormData();
  form.append("image", fileToBlob(imagePath), "image.png");
  form.append("prompt", prompt);
  if (maskPath) form.append("mask", fileToBlob(maskPath), "mask.png");
  if (params.n !== undefined) form.append("n", String(params.n));
  if (params.size) form.append("size", params.size);
  if (params.response_format) form.append("response_format", params.response_format);

  const data = await apiPostMultipart<{ data: ImageResult[] }>(apiKey, "/v1/images/edits", form);
  return data.data;
}

export async function createVariation(
  apiKey: string,
  imagePath: string,
  params: VariationParams
): Promise<ImageResult[]> {
  const form = new FormData();
  form.append("image", fileToBlob(imagePath), "image.png");
  if (params.n !== undefined) form.append("n", String(params.n));
  if (params.size) form.append("size", params.size);
  if (params.response_format) form.append("response_format", params.response_format);

  const data = await apiPostMultipart<{ data: ImageResult[] }>(apiKey, "/v1/images/variations", form);
  return data.data;
}

export async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}

export function saveBase64Image(b64: string, destPath: string): void {
  const buffer = Buffer.from(b64, "base64");
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
