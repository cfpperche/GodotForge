/**
 * Hugging Face tool handlers — text-to-image generation.
 */

import { join, resolve } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { ConfigManager } from "../config.js";
import { textToImage, type TextToImageParams } from "./huggingface.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const NO_KEY_MSG =
  "HuggingFace API key not configured. Set HUGGINGFACE_API_KEY environment variable or configure via web settings (API Keys tab).";

const HF_DIR = join("assets", "images", "huggingface");

function requireKey(config: ConfigManager): string | ToolResult {
  const key = config.getKey("huggingface");
  if (!key) return { content: [{ type: "text" as const, text: NO_KEY_MSG }], isError: true };
  return key;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
}

// --- Tool Handler ---

export async function handleHFTextToImage(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const keyOrErr = requireKey(config);
  if (typeof keyOrErr !== "string") return keyOrErr;

  const inputs = args.prompt as string | undefined;
  if (!inputs) return err("prompt is required");

  const params: TextToImageParams = {
    inputs,
    model: args.model as string | undefined,
    parameters: buildParameters(args),
  };

  try {
    const imageBuffer = await textToImage(keyOrErr, params);

    const model = (params.model ?? "flux").split("/").pop() ?? "hf";
    const filename = `${model}_${Date.now()}.png`;
    const destDir = join(projectRoot, HF_DIR);
    const destPath = join(destDir, filename);

    mkdirSync(destDir, { recursive: true });
    writeFileSync(destPath, imageBuffer);

    await triggerGodotRescan(projectRoot);

    const rel = destPath.slice(resolve(projectRoot).length + 1).replace(/\\/g, "/");
    return ok(`Image generated.\n\nSaved to: res://${rel}\nModel: ${params.model ?? "black-forest-labs/FLUX.1-dev"}`);
  } catch (e) {
    return err(`HuggingFace error: ${(e as Error).message}`);
  }
}

function buildParameters(
  args: Record<string, unknown>
): TextToImageParams["parameters"] {
  const p: TextToImageParams["parameters"] = {};

  if (args.guidance_scale !== undefined) p!.guidance_scale = args.guidance_scale as number;
  if (args.negative_prompt !== undefined) p!.negative_prompt = args.negative_prompt as string;
  if (args.num_inference_steps !== undefined) p!.num_inference_steps = args.num_inference_steps as number;
  if (args.width !== undefined) p!.width = args.width as number;
  if (args.height !== undefined) p!.height = args.height as number;
  if (args.seed !== undefined) p!.seed = args.seed as number;

  return Object.keys(p!).length > 0 ? p : undefined;
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
