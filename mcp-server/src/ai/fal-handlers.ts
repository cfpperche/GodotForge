/**
 * fal.ai tool handlers — image generation, 3D generation, audio, and utilities.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import { run, downloadFile, resolveImageUrl } from "./fal.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const FAL_KEY_ERROR =
  "fal.ai API key not configured. Set FAL_KEY environment variable or configure via web settings " +
  "(API Keys tab). Get a key at https://fal.ai/dashboard/keys";

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("fal");
  if (!key) return { content: [{ type: "text" as const, text: FAL_KEY_ERROR }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function ts36(): string {
  return Date.now().toString(36);
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

// --- Save helpers ---

async function saveImage(
  url: string,
  projectRoot: string,
  subdir: string,
  filename: string
): Promise<string> {
  const destPath = join(projectRoot, "assets", "images", subdir, filename);
  await downloadFile(url, destPath);
  await triggerGodotRescan(projectRoot);
  return `res://assets/images/${subdir}/${filename}`;
}

async function saveModel(
  url: string,
  projectRoot: string,
  subdir: string,
  filename: string
): Promise<string> {
  const destPath = join(projectRoot, "assets", "models", subdir, filename);
  await downloadFile(url, destPath);
  await triggerGodotRescan(projectRoot);
  return `res://assets/models/${subdir}/${filename}`;
}

async function saveAudio(
  url: string,
  projectRoot: string,
  subdir: string,
  filename: string
): Promise<string> {
  const destPath = join(projectRoot, "assets", "audio", subdir, filename);
  await downloadFile(url, destPath);
  await triggerGodotRescan(projectRoot);
  return `res://assets/audio/${subdir}/${filename}`;
}

// --- Image result type ---

interface ImageResult {
  images?: Array<{ url: string; width?: number; height?: number; content_type?: string }>;
  image?: { url: string };
}

interface ModelResult {
  model_mesh?: { url: string } | string;
}

interface AudioResult {
  audio_file?: { url: string } | string;
  audio?: { url: string } | string;
}

function extractUrl(value: { url: string } | string | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.url;
}

// --- Image Generation ---

export async function handleFalFluxPro(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: Record<string, unknown> = { prompt };
  if (args.image_size !== undefined) params.image_size = args.image_size;
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.num_images !== undefined) params.num_images = args.num_images;
  if (args.output_format !== undefined) params.output_format = args.output_format;
  if (args.safety_tolerance !== undefined) params.safety_tolerance = args.safety_tolerance;
  if (args.enhance_prompt !== undefined) params.enhance_prompt = args.enhance_prompt;

  try {
    const result = await run<ImageResult>("fal-ai/flux-pro/v1.1", params, keyOrErr);
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) return err("No image in fal.ai response");

    const fmt = (args.output_format as string) ?? "jpeg";
    const resPath = await saveImage(imageUrl, projectRoot, "fal/flux-pro", `flux_pro_${ts36()}.${fmt}`);
    return ok(`FLUX Pro image generated.\n\nPrompt: "${prompt}"\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalFluxSchnell(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: Record<string, unknown> = { prompt };
  if (args.image_size !== undefined) params.image_size = args.image_size;
  if (args.num_inference_steps !== undefined) params.num_inference_steps = args.num_inference_steps;
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.guidance_scale !== undefined) params.guidance_scale = args.guidance_scale;
  if (args.num_images !== undefined) params.num_images = args.num_images;
  if (args.output_format !== undefined) params.output_format = args.output_format;

  try {
    const result = await run<ImageResult>("fal-ai/flux/schnell", params, keyOrErr);
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) return err("No image in fal.ai response");

    const fmt = (args.output_format as string) ?? "jpeg";
    const resPath = await saveImage(imageUrl, projectRoot, "fal/flux-schnell", `flux_schnell_${ts36()}.${fmt}`);
    return ok(`FLUX Schnell image generated.\n\nPrompt: "${prompt}"\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalSD35(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: Record<string, unknown> = { prompt };
  if (args.negative_prompt !== undefined) params.negative_prompt = args.negative_prompt;
  if (args.image_size !== undefined) params.image_size = args.image_size;
  if (args.num_inference_steps !== undefined) params.num_inference_steps = args.num_inference_steps;
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.guidance_scale !== undefined) params.guidance_scale = args.guidance_scale;
  if (args.num_images !== undefined) params.num_images = args.num_images;
  if (args.output_format !== undefined) params.output_format = args.output_format;

  try {
    const result = await run<ImageResult>("fal-ai/stable-diffusion-v35-large", params, keyOrErr);
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) return err("No image in fal.ai response");

    const fmt = (args.output_format as string) ?? "jpeg";
    const resPath = await saveImage(imageUrl, projectRoot, "fal/sd35", `sd35_${ts36()}.${fmt}`);
    return ok(`Stable Diffusion 3.5 image generated.\n\nPrompt: "${prompt}"\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalSDXL(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: Record<string, unknown> = { prompt };
  if (args.negative_prompt !== undefined) params.negative_prompt = args.negative_prompt;
  if (args.image_size !== undefined) params.image_size = args.image_size;
  if (args.num_inference_steps !== undefined) params.num_inference_steps = args.num_inference_steps;
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.guidance_scale !== undefined) params.guidance_scale = args.guidance_scale;
  if (args.num_images !== undefined) params.num_images = args.num_images;
  if (args.format !== undefined) params.format = args.format;
  if (args.expand_prompt !== undefined) params.expand_prompt = args.expand_prompt;

  try {
    const result = await run<ImageResult>("fal-ai/fast-sdxl", params, keyOrErr);
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) return err("No image in fal.ai response");

    const fmt = (args.format as string) ?? "jpeg";
    const resPath = await saveImage(imageUrl, projectRoot, "fal/sdxl", `sdxl_${ts36()}.${fmt}`);
    return ok(`SDXL image generated.\n\nPrompt: "${prompt}"\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

// --- 3D Generation ---

export async function handleFalRodin(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  if (!args.prompt && !args.input_image_urls) return err("prompt or input_image_urls is required");

  const params: Record<string, unknown> = {};
  if (args.prompt !== undefined) params.prompt = args.prompt;
  if (args.input_image_urls !== undefined) {
    const urls = args.input_image_urls as string[];
    params.input_image_urls = urls.map((u) => resolveImageUrl(u, projectRoot));
  }
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.geometry_file_format !== undefined) params.geometry_file_format = args.geometry_file_format;
  if (args.material !== undefined) params.material = args.material;
  if (args.quality_mesh_option !== undefined) params.quality_mesh_option = args.quality_mesh_option;
  if (args.TAPose !== undefined) params.TAPose = args.TAPose;
  if (args.addons !== undefined) params.addons = args.addons;

  try {
    const result = await run<ModelResult>("fal-ai/hyper3d/rodin", params, keyOrErr);
    const modelUrl = extractUrl(result.model_mesh);
    if (!modelUrl) return err("No model_mesh in fal.ai response");

    const resPath = await saveModel(modelUrl, projectRoot, "fal/rodin", `rodin_${ts36()}.glb`);
    return ok(`Rodin 3D model generated.\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalTripo(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imageUrl = args.image_url as string;
  if (!imageUrl) return err("image_url is required");

  const params: Record<string, unknown> = {
    image_url: resolveImageUrl(imageUrl, projectRoot),
  };
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.face_limit !== undefined) params.face_limit = args.face_limit;
  if (args.pbr !== undefined) params.pbr = args.pbr;
  if (args.texture !== undefined) params.texture = args.texture;
  if (args.style !== undefined) params.style = args.style;
  if (args.quad !== undefined) params.quad = args.quad;
  if (args.auto_size !== undefined) params.auto_size = args.auto_size;
  if (args.texture_alignment !== undefined) params.texture_alignment = args.texture_alignment;
  if (args.orientation !== undefined) params.orientation = args.orientation;

  try {
    const result = await run<ModelResult>("tripo3d/tripo/v2.5/image-to-3d", params, keyOrErr);
    const modelUrl = extractUrl(result.model_mesh);
    if (!modelUrl) return err("No model_mesh in fal.ai response");

    const resPath = await saveModel(modelUrl, projectRoot, "fal/tripo", `tripo_${ts36()}.glb`);
    return ok(`Tripo 3D model generated from image.\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalTrellis(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imageUrl = args.image_url as string;
  if (!imageUrl) return err("image_url is required");

  const params: Record<string, unknown> = {
    image_url: resolveImageUrl(imageUrl, projectRoot),
  };
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.ss_guidance_strength !== undefined) params.ss_guidance_strength = args.ss_guidance_strength;
  if (args.ss_sampling_steps !== undefined) params.ss_sampling_steps = args.ss_sampling_steps;
  if (args.slat_guidance_strength !== undefined) params.slat_guidance_strength = args.slat_guidance_strength;
  if (args.slat_sampling_steps !== undefined) params.slat_sampling_steps = args.slat_sampling_steps;
  if (args.mesh_simplify !== undefined) params.mesh_simplify = args.mesh_simplify;
  if (args.texture_size !== undefined) params.texture_size = args.texture_size;

  try {
    const result = await run<ModelResult>("fal-ai/trellis", params, keyOrErr);
    const modelUrl = extractUrl(result.model_mesh);
    if (!modelUrl) return err("No model_mesh in fal.ai response");

    const resPath = await saveModel(modelUrl, projectRoot, "fal/trellis", `trellis_${ts36()}.glb`);
    return ok(`Trellis 3D model generated from image.\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalHunyuan3D(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const inputImageUrl = args.input_image_url as string;
  if (!inputImageUrl) return err("input_image_url is required");

  const params: Record<string, unknown> = {
    input_image_url: resolveImageUrl(inputImageUrl, projectRoot),
  };
  if (args.seed !== undefined) params.seed = args.seed;
  if (args.num_inference_steps !== undefined) params.num_inference_steps = args.num_inference_steps;
  if (args.guidance_scale !== undefined) params.guidance_scale = args.guidance_scale;
  if (args.octree_resolution !== undefined) params.octree_resolution = args.octree_resolution;
  if (args.textured_mesh !== undefined) params.textured_mesh = args.textured_mesh;

  try {
    const result = await run<ModelResult>("fal-ai/hunyuan3d/v2", params, keyOrErr);
    const modelUrl = extractUrl(result.model_mesh);
    if (!modelUrl) return err("No model_mesh in fal.ai response");

    const resPath = await saveModel(modelUrl, projectRoot, "fal/hunyuan3d", `hunyuan3d_${ts36()}.glb`);
    return ok(`Hunyuan3D model generated from image.\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

// --- Audio ---

export async function handleFalStableAudio(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt is required");

  const params: Record<string, unknown> = { prompt };
  if (args.seconds_start !== undefined) params.seconds_start = args.seconds_start;
  if (args.seconds_total !== undefined) params.seconds_total = args.seconds_total;
  if (args.steps !== undefined) params.steps = args.steps;

  try {
    const result = await run<AudioResult>("fal-ai/stable-audio", params, keyOrErr);
    const audioUrl = extractUrl(result.audio_file);
    if (!audioUrl) return err("No audio_file in fal.ai response");

    const resPath = await saveAudio(audioUrl, projectRoot, "fal/stable-audio", `stable_audio_${ts36()}.wav`);
    return ok(`Stable Audio generated.\n\nPrompt: "${prompt}"\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalKokoroTTS(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string;
  if (!prompt) return err("prompt (text to speak) is required");

  const params: Record<string, unknown> = { prompt };
  if (args.voice !== undefined) params.voice = args.voice;
  if (args.speed !== undefined) params.speed = args.speed;

  try {
    const result = await run<AudioResult>("fal-ai/kokoro/american-english", params, keyOrErr);
    const audioUrl = extractUrl(result.audio);
    if (!audioUrl) return err("No audio in fal.ai response");

    const resPath = await saveAudio(audioUrl, projectRoot, "fal/kokoro", `kokoro_${ts36()}.wav`);
    return ok(`Kokoro TTS generated.\n\nText: "${prompt}"\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

// --- Utility ---

export async function handleFalUpscale(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imageUrl = args.image_url as string;
  if (!imageUrl) return err("image_url is required");

  const params: Record<string, unknown> = {
    image_url: resolveImageUrl(imageUrl, projectRoot),
  };
  if (args.scale !== undefined) params.scale = args.scale;
  if (args.model !== undefined) params.model = args.model;
  if (args.face !== undefined) params.face = args.face;
  if (args.tile !== undefined) params.tile = args.tile;
  if (args.output_format !== undefined) params.output_format = args.output_format;

  try {
    const result = await run<{ image: { url: string } }>("fal-ai/esrgan", params, keyOrErr);
    const upscaledUrl = result.image?.url;
    if (!upscaledUrl) return err("No image in fal.ai response");

    const fmt = (args.output_format as string) ?? "png";
    const resPath = await saveImage(upscaledUrl, projectRoot, "fal/upscaled", `upscaled_${ts36()}.${fmt}`);
    return ok(`Image upscaled.\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}

export async function handleFalRemoveBg(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imageUrl = args.image_url as string;
  if (!imageUrl) return err("image_url is required");

  const params: Record<string, unknown> = {
    image_url: resolveImageUrl(imageUrl, projectRoot),
  };
  if (args.model !== undefined) params.model = args.model;
  if (args.operating_resolution !== undefined) params.operating_resolution = args.operating_resolution;
  if (args.output_mask !== undefined) params.output_mask = args.output_mask;
  if (args.refine_foreground !== undefined) params.refine_foreground = args.refine_foreground;
  if (args.output_format !== undefined) params.output_format = args.output_format;

  try {
    const result = await run<ImageResult>("fal-ai/birefnet/v2", params, keyOrErr);
    const outUrl = result.images?.[0]?.url ?? (result.image as { url: string } | undefined)?.url;
    if (!outUrl) return err("No image in fal.ai response");

    const fmt = (args.output_format as string) ?? "png";
    const resPath = await saveImage(outUrl, projectRoot, "fal/nobg", `nobg_${ts36()}.${fmt}`);
    return ok(`Background removed.\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`fal.ai error: ${(e as Error).message}`);
  }
}
