/**
 * Stability AI tool handlers — image generation, editing, upscaling, and control.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import {
  generateSD3, generateUltra, generateCore,
  inpaint, outpaint, searchReplace, recolor, erase, removeBackground,
  upscaleFast, controlSketch, controlStyle,
  getBalance, saveImage,
  type GenerateSD3Params, type GenerateUltraParams, type GenerateCoreParams,
  type InpaintParams, type OutpaintParams, type SearchReplaceParams,
  type RecolorParams, type EraseParams, type ControlParams,
} from "./stability.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG = "Stability AI API key not configured. Set STABILITY_API_KEY environment variable or configure via web settings (API Keys tab). Get a key at https://platform.stability.ai/account/keys";

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("stability");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function resolvePath(projectRoot: string, path: string): string {
  if (path.startsWith("res://")) return join(projectRoot, path.replace("res://", ""));
  if (path.startsWith("/")) return path;
  return join(projectRoot, path);
}

function generateFilename(prefix: string, format: string): string {
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}.${format}`;
}

async function saveAndRescan(
  image: Buffer,
  projectRoot: string,
  subdir: string,
  filename: string
): Promise<string> {
  const destPath = join(projectRoot, "assets", "images", subdir, filename);
  saveImage(image, destPath);
  await triggerGodotRescan(projectRoot);
  return `res://assets/images/${subdir}/${filename}`;
}

// --- Generate Handlers ---

export async function handleStabilityGenerate(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt) return err("prompt is required");

  const format = (args.output_format as string) || "png";
  const params: GenerateSD3Params = {
    prompt: args.prompt as string,
    negative_prompt: args.negative_prompt as string | undefined,
    model: args.model as string | undefined,
    aspect_ratio: args.aspect_ratio as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    cfg_scale: args.cfg_scale as number | undefined,
    image_path: args.image_path ? resolvePath(projectRoot, args.image_path as string) : undefined,
    strength: args.strength as number | undefined,
    mode: args.image_path ? "image-to-image" : "text-to-image",
  };

  try {
    const result = await generateSD3(keyOrErr, params);
    const filename = generateFilename("sd3", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Image generated (SD3, seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilityGenerateUltra(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt) return err("prompt is required");

  const format = (args.output_format as string) || "png";
  const params: GenerateUltraParams = {
    prompt: args.prompt as string,
    negative_prompt: args.negative_prompt as string | undefined,
    aspect_ratio: args.aspect_ratio as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    image_path: args.image_path ? resolvePath(projectRoot, args.image_path as string) : undefined,
    strength: args.strength as number | undefined,
  };

  try {
    const result = await generateUltra(keyOrErr, params);
    const filename = generateFilename("ultra", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Image generated (Ultra, seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilityGenerateCore(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt) return err("prompt is required");

  const format = (args.output_format as string) || "png";
  const params: GenerateCoreParams = {
    prompt: args.prompt as string,
    negative_prompt: args.negative_prompt as string | undefined,
    aspect_ratio: args.aspect_ratio as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    style_preset: args.style_preset as string | undefined,
  };

  try {
    const result = await generateCore(keyOrErr, params);
    const filename = generateFilename("core", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Image generated (Core, seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

// --- Edit Handlers ---

export async function handleStabilityInpaint(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt || !args.image_path) return err("prompt and image_path are required");

  const format = (args.output_format as string) || "png";
  const params: InpaintParams = {
    prompt: args.prompt as string,
    image_path: resolvePath(projectRoot, args.image_path as string),
    mask_path: args.mask_path ? resolvePath(projectRoot, args.mask_path as string) : undefined,
    negative_prompt: args.negative_prompt as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    grow_mask: args.grow_mask as number | undefined,
    style_preset: args.style_preset as string | undefined,
  };

  try {
    const result = await inpaint(keyOrErr, params);
    const filename = generateFilename("inpaint", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Inpainted image (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilityOutpaint(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.image_path) return err("image_path is required");

  const format = (args.output_format as string) || "png";
  const params: OutpaintParams = {
    image_path: resolvePath(projectRoot, args.image_path as string),
    prompt: args.prompt as string | undefined,
    negative_prompt: args.negative_prompt as string | undefined,
    left: args.left as number | undefined,
    right: args.right as number | undefined,
    up: args.up as number | undefined,
    down: args.down as number | undefined,
    creativity: args.creativity as number | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    style_preset: args.style_preset as string | undefined,
  };

  try {
    const result = await outpaint(keyOrErr, params);
    const filename = generateFilename("outpaint", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Outpainted image (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilitySearchReplace(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt || !args.search_prompt || !args.image_path) return err("prompt, search_prompt, and image_path are required");

  const format = (args.output_format as string) || "png";
  const params: SearchReplaceParams = {
    prompt: args.prompt as string,
    search_prompt: args.search_prompt as string,
    image_path: resolvePath(projectRoot, args.image_path as string),
    negative_prompt: args.negative_prompt as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    grow_mask: args.grow_mask as number | undefined,
    style_preset: args.style_preset as string | undefined,
  };

  try {
    const result = await searchReplace(keyOrErr, params);
    const filename = generateFilename("replace", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Search & replace done (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilityRecolor(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt || !args.select_prompt || !args.image_path) return err("prompt, select_prompt, and image_path are required");

  const format = (args.output_format as string) || "png";
  const params: RecolorParams = {
    prompt: args.prompt as string,
    select_prompt: args.select_prompt as string,
    image_path: resolvePath(projectRoot, args.image_path as string),
    negative_prompt: args.negative_prompt as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    grow_mask: args.grow_mask as number | undefined,
    style_preset: args.style_preset as string | undefined,
  };

  try {
    const result = await recolor(keyOrErr, params);
    const filename = generateFilename("recolor", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Recolored image (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilityErase(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.image_path) return err("image_path is required");

  const format = (args.output_format as string) || "png";
  const params: EraseParams = {
    image_path: resolvePath(projectRoot, args.image_path as string),
    mask_path: args.mask_path ? resolvePath(projectRoot, args.mask_path as string) : undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    grow_mask: args.grow_mask as number | undefined,
  };

  try {
    const result = await erase(keyOrErr, params);
    const filename = generateFilename("erase", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Erased objects (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilityRemoveBg(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.image_path) return err("image_path is required");

  const format = (args.output_format as string) || "png";

  try {
    const result = await removeBackground(keyOrErr, resolvePath(projectRoot, args.image_path as string), format);
    const filename = generateFilename("nobg", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Background removed\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

// --- Upscale Handler ---

export async function handleStabilityUpscaleFast(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.image_path) return err("image_path is required");

  const format = (args.output_format as string) || "png";

  try {
    const result = await upscaleFast(keyOrErr, resolvePath(projectRoot, args.image_path as string), format);
    const filename = generateFilename("upscale", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Image upscaled 4x (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

// --- Control Handlers ---

export async function handleStabilitySketch(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt || !args.image_path) return err("prompt and image_path are required");

  const format = (args.output_format as string) || "png";
  const params: ControlParams = {
    prompt: args.prompt as string,
    image_path: resolvePath(projectRoot, args.image_path as string),
    control_strength: args.control_strength as number | undefined,
    negative_prompt: args.negative_prompt as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    style_preset: args.style_preset as string | undefined,
  };

  try {
    const result = await controlSketch(keyOrErr, params);
    const filename = generateFilename("sketch", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Sketch-to-image done (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

export async function handleStabilityStyle(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;
  if (!args.prompt || !args.image_path) return err("prompt and image_path are required");

  const format = (args.output_format as string) || "png";
  const params: ControlParams = {
    prompt: args.prompt as string,
    image_path: resolvePath(projectRoot, args.image_path as string),
    fidelity: args.fidelity as number | undefined,
    aspect_ratio: args.aspect_ratio as string | undefined,
    negative_prompt: args.negative_prompt as string | undefined,
    seed: args.seed as number | undefined,
    output_format: format,
    style_preset: args.style_preset as string | undefined,
  };

  try {
    const result = await controlStyle(keyOrErr, params);
    const filename = generateFilename("style", format);
    const resPath = await saveAndRescan(result.image, projectRoot, "stability", filename);
    return ok(`Style transfer done (seed: ${result.seed})\n\nSaved to: ${resPath}`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
  }
}

// --- Balance ---

export async function handleStabilityBalance(
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  try {
    const credits = await getBalance(keyOrErr);
    return ok(`Stability AI balance: ${credits} credits`);
  } catch (e) {
    return err(`Stability error: ${(e as Error).message}`);
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
