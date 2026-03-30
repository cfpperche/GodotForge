/**
 * OpenAI DALL-E tool handlers — image generation, editing, variations.
 */

import { join, resolve, extname } from "path";
import { existsSync, readFileSync } from "fs";
import { ConfigManager } from "../config.js";
import {
  generateImage,
  editImage,
  createVariation,
  downloadImage,
  saveBase64Image,
  type GenerateImageParams,
  type EditImageParams,
  type VariationParams,
} from "./openai-dalle.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG =
  "OpenAI API key not configured. Set OPENAI_API_KEY environment variable or configure via web settings (API Keys tab).";

const DALLE_DIR = join("assets", "images", "dalle");

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("openai");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function validatePath(filePath: string, projectRoot: string): string | ToolResult {
  const resolved = resolve(filePath);
  if (!resolved.startsWith(resolve(projectRoot))) {
    return err(`Path "${filePath}" is outside the project root.`);
  }
  if (!existsSync(resolved)) {
    return err(`File not found: ${filePath}`);
  }
  return resolved;
}

function makeDestPath(projectRoot: string, subdir: string, baseName: string, ext = ".png"): string {
  return join(projectRoot, DALLE_DIR, subdir, `${baseName}${ext}`);
}

function resPath(projectRoot: string, absPath: string): string {
  const rel = absPath.slice(resolve(projectRoot).length + 1).replace(/\\/g, "/");
  return `res://${rel}`;
}

async function saveResults(
  results: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>,
  projectRoot: string,
  subdir: string,
  prefix: string
): Promise<string[]> {
  const saved: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const destPath = makeDestPath(projectRoot, subdir, `${prefix}_${Date.now()}_${i}`);
    if (result.url) {
      await downloadImage(result.url, destPath);
    } else if (result.b64_json) {
      saveBase64Image(result.b64_json, destPath);
    } else {
      continue;
    }
    saved.push(resPath(projectRoot, destPath));
  }
  return saved;
}

// --- Tool Handlers ---

export async function handleDalleGenerate(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const prompt = args.prompt as string | undefined;
  if (!prompt) return err("prompt is required");

  const params: GenerateImageParams = {
    prompt,
    model: (args.model as GenerateImageParams["model"]) ?? "dall-e-3",
    n: args.n as number | undefined,
    quality: args.quality as GenerateImageParams["quality"],
    size: args.size as GenerateImageParams["size"],
    style: args.style as GenerateImageParams["style"],
    response_format: (args.response_format as GenerateImageParams["response_format"]) ?? "url",
  };

  try {
    const results = await generateImage(keyOrErr, params);
    const saved = await saveResults(results, projectRoot, "generated", "dalle");
    await triggerGodotRescan(projectRoot);

    const lines = [`Generated ${saved.length} image(s).`, ""];
    for (let i = 0; i < saved.length; i++) {
      lines.push(`Image ${i + 1}: ${saved[i]}`);
      if (results[i].revised_prompt) lines.push(`  Revised prompt: ${results[i].revised_prompt}`);
    }

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`DALL-E error: ${(e as Error).message}`);
  }
}

export async function handleDalleEdit(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imagePath = args.image_path as string | undefined;
  if (!imagePath) return err("image_path is required");

  const prompt = args.prompt as string | undefined;
  if (!prompt) return err("prompt is required");

  const resolvedImage = validatePath(imagePath, projectRoot);
  if (typeof resolvedImage !== "string") return resolvedImage;

  let resolvedMask: string | undefined;
  if (args.mask_path) {
    const result = validatePath(args.mask_path as string, projectRoot);
    if (typeof result !== "string") return result;
    resolvedMask = result;
  }

  const params: EditImageParams = {
    n: args.n as number | undefined,
    size: args.size as EditImageParams["size"],
    response_format: (args.response_format as EditImageParams["response_format"]) ?? "url",
  };

  try {
    const results = await editImage(keyOrErr, resolvedImage, prompt, params, resolvedMask);
    const saved = await saveResults(results, projectRoot, "edited", "dalle_edit");
    await triggerGodotRescan(projectRoot);

    const lines = [`Edited ${saved.length} image(s).`, ""];
    saved.forEach((p, i) => lines.push(`Image ${i + 1}: ${p}`));

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`DALL-E error: ${(e as Error).message}`);
  }
}

export async function handleDalleVariation(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const imagePath = args.image_path as string | undefined;
  if (!imagePath) return err("image_path is required");

  const resolvedImage = validatePath(imagePath, projectRoot);
  if (typeof resolvedImage !== "string") return resolvedImage;

  const params: VariationParams = {
    n: args.n as number | undefined,
    size: args.size as VariationParams["size"],
    response_format: (args.response_format as VariationParams["response_format"]) ?? "url",
  };

  try {
    const results = await createVariation(keyOrErr, resolvedImage, params);
    const saved = await saveResults(results, projectRoot, "variations", "dalle_var");
    await triggerGodotRescan(projectRoot);

    const lines = [`Created ${saved.length} variation(s).`, ""];
    saved.forEach((p, i) => lines.push(`Image ${i + 1}: ${p}`));

    return ok(lines.join("\n"));
  } catch (e) {
    return err(`DALL-E error: ${(e as Error).message}`);
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
