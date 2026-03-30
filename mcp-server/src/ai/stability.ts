/**
 * Stability AI API client — full coverage of image generation, editing, upscaling, and control.
 * All v2beta endpoints use multipart/form-data. Responses return raw image bytes or JSON with base64.
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";

const BASE_URL = "https://api.stability.ai";

// --- Types ---

export const STYLE_PRESETS = [
  "3d-model", "analog-film", "anime", "cinematic", "comic-book", "digital-art",
  "enhance", "fantasy-art", "isometric", "line-art", "low-poly", "modeling-compound",
  "neon-punk", "origami", "photographic", "pixel-art", "tile-texture",
] as const;
export type StylePreset = typeof STYLE_PRESETS[number];

export const ASPECT_RATIOS = ["16:9", "1:1", "21:9", "2:3", "3:2", "4:5", "5:4", "9:16", "9:21"] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];

export const OUTPUT_FORMATS = ["jpeg", "png", "webp"] as const;
export type OutputFormat = typeof OUTPUT_FORMATS[number];

export const SD3_MODELS = ["sd3.5-large", "sd3.5-large-turbo", "sd3.5-medium"] as const;

export interface GenerateResult {
  image: Buffer;
  seed: number;
  finish_reason: string;
}

// --- Core fetch ---

async function stabilityFetch(
  path: string,
  apiKey: string,
  formData: FormData
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Stability API ${res.status}: ${body}`);
  }
  return res;
}

function addOptional(fd: FormData, key: string, value: unknown): void {
  if (value !== undefined && value !== null && value !== "") {
    fd.append(key, String(value));
  }
}

function addImageFile(fd: FormData, key: string, imagePath: string): void {
  const data = readFileSync(imagePath);
  const ext = imagePath.split(".").pop()?.toLowerCase() || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  fd.append(key, new Blob([data], { type: mime }), `image.${ext}`);
}

async function parseImageResponse(res: Response): Promise<GenerateResult> {
  const json = (await res.json()) as { image: string; seed: number; finish_reason: string };
  return {
    image: Buffer.from(json.image, "base64"),
    seed: json.seed,
    finish_reason: json.finish_reason,
  };
}

// --- Generation Endpoints ---

export interface GenerateSD3Params {
  prompt: string;
  negative_prompt?: string;
  model?: string;
  aspect_ratio?: string;
  seed?: number;
  output_format?: string;
  cfg_scale?: number;
  // image-to-image
  image_path?: string;
  strength?: number;
  mode?: "text-to-image" | "image-to-image";
}

export async function generateSD3(apiKey: string, params: GenerateSD3Params): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "model", params.model);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "cfg_scale", params.cfg_scale);

  if (params.image_path && params.mode === "image-to-image") {
    addImageFile(fd, "image", params.image_path);
    addOptional(fd, "strength", params.strength);
    fd.append("mode", "image-to-image");
  } else {
    addOptional(fd, "aspect_ratio", params.aspect_ratio);
  }

  const res = await stabilityFetch("/v2beta/stable-image/generate/sd3", apiKey, fd);
  return parseImageResponse(res);
}

export interface GenerateUltraParams {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  seed?: number;
  output_format?: string;
  image_path?: string;
  strength?: number;
}

export async function generateUltra(apiKey: string, params: GenerateUltraParams): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");

  if (params.image_path) {
    addImageFile(fd, "image", params.image_path);
    addOptional(fd, "strength", params.strength);
  } else {
    addOptional(fd, "aspect_ratio", params.aspect_ratio);
  }

  const res = await stabilityFetch("/v2beta/stable-image/generate/ultra", apiKey, fd);
  return parseImageResponse(res);
}

export interface GenerateCoreParams {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  seed?: number;
  output_format?: string;
  style_preset?: string;
}

export async function generateCore(apiKey: string, params: GenerateCoreParams): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "aspect_ratio", params.aspect_ratio);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "style_preset", params.style_preset);

  const res = await stabilityFetch("/v2beta/stable-image/generate/core", apiKey, fd);
  return parseImageResponse(res);
}

// --- Edit Endpoints ---

export interface InpaintParams {
  prompt: string;
  image_path: string;
  mask_path?: string;
  negative_prompt?: string;
  seed?: number;
  output_format?: string;
  grow_mask?: number;
  style_preset?: string;
}

export async function inpaint(apiKey: string, params: InpaintParams): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  addImageFile(fd, "image", params.image_path);
  if (params.mask_path) addImageFile(fd, "mask", params.mask_path);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "grow_mask", params.grow_mask);
  addOptional(fd, "style_preset", params.style_preset);

  const res = await stabilityFetch("/v2beta/stable-image/edit/inpaint", apiKey, fd);
  return parseImageResponse(res);
}

export interface OutpaintParams {
  image_path: string;
  prompt?: string;
  negative_prompt?: string;
  left?: number;
  right?: number;
  up?: number;
  down?: number;
  creativity?: number;
  seed?: number;
  output_format?: string;
  style_preset?: string;
}

export async function outpaint(apiKey: string, params: OutpaintParams): Promise<GenerateResult> {
  const fd = new FormData();
  addImageFile(fd, "image", params.image_path);
  addOptional(fd, "prompt", params.prompt);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "left", params.left);
  addOptional(fd, "right", params.right);
  addOptional(fd, "up", params.up);
  addOptional(fd, "down", params.down);
  addOptional(fd, "creativity", params.creativity);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "style_preset", params.style_preset);

  const res = await stabilityFetch("/v2beta/stable-image/edit/outpaint", apiKey, fd);
  return parseImageResponse(res);
}

export interface SearchReplaceParams {
  prompt: string;
  search_prompt: string;
  image_path: string;
  negative_prompt?: string;
  seed?: number;
  output_format?: string;
  grow_mask?: number;
  style_preset?: string;
}

export async function searchReplace(apiKey: string, params: SearchReplaceParams): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  fd.append("search_prompt", params.search_prompt);
  addImageFile(fd, "image", params.image_path);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "grow_mask", params.grow_mask);
  addOptional(fd, "style_preset", params.style_preset);

  const res = await stabilityFetch("/v2beta/stable-image/edit/search-and-replace", apiKey, fd);
  return parseImageResponse(res);
}

export interface RecolorParams {
  prompt: string;
  select_prompt: string;
  image_path: string;
  negative_prompt?: string;
  seed?: number;
  output_format?: string;
  grow_mask?: number;
  style_preset?: string;
}

export async function recolor(apiKey: string, params: RecolorParams): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  fd.append("select_prompt", params.select_prompt);
  addImageFile(fd, "image", params.image_path);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "grow_mask", params.grow_mask);
  addOptional(fd, "style_preset", params.style_preset);

  const res = await stabilityFetch("/v2beta/stable-image/edit/search-and-recolor", apiKey, fd);
  return parseImageResponse(res);
}

export interface EraseParams {
  image_path: string;
  mask_path?: string;
  seed?: number;
  output_format?: string;
  grow_mask?: number;
}

export async function erase(apiKey: string, params: EraseParams): Promise<GenerateResult> {
  const fd = new FormData();
  addImageFile(fd, "image", params.image_path);
  if (params.mask_path) addImageFile(fd, "mask", params.mask_path);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "grow_mask", params.grow_mask);

  const res = await stabilityFetch("/v2beta/stable-image/edit/erase", apiKey, fd);
  return parseImageResponse(res);
}

export async function removeBackground(apiKey: string, imagePath: string, outputFormat?: string): Promise<GenerateResult> {
  const fd = new FormData();
  addImageFile(fd, "image", imagePath);
  addOptional(fd, "output_format", outputFormat || "png");

  const res = await stabilityFetch("/v2beta/stable-image/edit/remove-background", apiKey, fd);
  return parseImageResponse(res);
}

// --- Upscale ---

export async function upscaleFast(apiKey: string, imagePath: string, outputFormat?: string): Promise<GenerateResult> {
  const fd = new FormData();
  addImageFile(fd, "image", imagePath);
  addOptional(fd, "output_format", outputFormat || "png");

  const res = await stabilityFetch("/v2beta/stable-image/upscale/fast", apiKey, fd);
  return parseImageResponse(res);
}

// --- Control ---

export interface ControlParams {
  prompt: string;
  image_path: string;
  control_strength?: number;
  negative_prompt?: string;
  seed?: number;
  output_format?: string;
  style_preset?: string;
  // style-only
  aspect_ratio?: string;
  fidelity?: number;
}

export async function controlSketch(apiKey: string, params: ControlParams): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  addImageFile(fd, "image", params.image_path);
  addOptional(fd, "control_strength", params.control_strength);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "style_preset", params.style_preset);

  const res = await stabilityFetch("/v2beta/stable-image/control/sketch", apiKey, fd);
  return parseImageResponse(res);
}

export async function controlStyle(apiKey: string, params: ControlParams): Promise<GenerateResult> {
  const fd = new FormData();
  fd.append("prompt", params.prompt);
  addImageFile(fd, "image", params.image_path);
  addOptional(fd, "fidelity", params.fidelity);
  addOptional(fd, "aspect_ratio", params.aspect_ratio);
  addOptional(fd, "negative_prompt", params.negative_prompt);
  addOptional(fd, "seed", params.seed);
  addOptional(fd, "output_format", params.output_format || "png");
  addOptional(fd, "style_preset", params.style_preset);

  const res = await stabilityFetch("/v2beta/stable-image/control/style", apiKey, fd);
  return parseImageResponse(res);
}

// --- Balance ---

export async function getBalance(apiKey: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/v1/user/balance`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Stability API ${res.status}`);
  const data = (await res.json()) as { credits: number };
  return data.credits;
}

// --- Save Helper ---

export function saveImage(image: Buffer, destPath: string): void {
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, image);
}
