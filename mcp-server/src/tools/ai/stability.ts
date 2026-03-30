import { z } from "zod";
import type { ToolContext } from "../types.js";
import { stabilityFormat, stabilityAspect, stabilitySeed, stabilityNeg, stabilityStyle, stabilityGrowMask } from "./schemas.js";

export function registerStabilityTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  regTool(
    "ai.stability_generate",
    "Generate an image using Stable Diffusion 3.5. Supports text-to-image and image-to-image modes. 3.5-6.5 credits. Great for textures (use tile-texture style), sprites, concept art.",
    {
      prompt: z.string().max(10000).describe("Text description of the image to generate"),
      negative_prompt: stabilityNeg,
      model: z.enum(["sd3.5-large", "sd3.5-large-turbo", "sd3.5-medium"]).optional().describe("SD3 model variant (default: sd3.5-large)"),
      aspect_ratio: stabilityAspect,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      cfg_scale: z.number().min(1).max(10).optional().describe("Prompt adherence strength (default: 4.0, SD3.5 only)"),
      image_path: z.string().optional().describe("Input image path (res:// or absolute) for image-to-image mode"),
      strength: z.number().min(0).max(1).optional().describe("How much to change input image (0=identical, 1=ignore input, default: 0.5)"),
    },
    async (args) => runTool("ai.stability_generate", args)
  );

  regTool(
    "ai.stability_generate_ultra",
    "Generate a high-quality image using Stable Image Ultra. 8 credits. Best for concept art and hero images.",
    {
      prompt: z.string().max(10000).describe("Text description of the image"),
      negative_prompt: stabilityNeg,
      aspect_ratio: stabilityAspect,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      image_path: z.string().optional().describe("Input image for image-to-image mode"),
      strength: z.number().min(0).max(1).optional().describe("Transformation strength (default: 0.35)"),
    },
    async (args) => runTool("ai.stability_generate_ultra", args)
  );

  regTool(
    "ai.stability_generate_core",
    "Generate an image using Stable Image Core. Fast, 3 credits. Supports style presets (pixel-art, anime, low-poly, etc.).",
    {
      prompt: z.string().max(10000).describe("Text description of the image"),
      negative_prompt: stabilityNeg,
      aspect_ratio: stabilityAspect,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      style_preset: stabilityStyle,
    },
    async (args) => runTool("ai.stability_generate_core", args)
  );

  regTool(
    "ai.stability_inpaint",
    "Fill or replace a masked area in an image. 5 credits. Use for editing textures or sprites.",
    {
      prompt: z.string().max(10000).describe("What to fill the masked area with"),
      image_path: z.string().describe("Source image path (res:// or absolute)"),
      mask_path: z.string().optional().describe("B&W mask image (white=inpaint, black=keep). If omitted, uses alpha channel."),
      negative_prompt: stabilityNeg,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      grow_mask: stabilityGrowMask,
      style_preset: stabilityStyle,
    },
    async (args) => runTool("ai.stability_inpaint", args)
  );

  regTool(
    "ai.stability_outpaint",
    "Extend an image beyond its borders in any direction. 5 credits. Great for extending tilesets.",
    {
      image_path: z.string().describe("Source image path"),
      prompt: z.string().optional().describe("Describe desired extension"),
      negative_prompt: stabilityNeg,
      left: z.number().int().min(0).max(2000).optional().describe("Pixels to extend left"),
      right: z.number().int().min(0).max(2000).optional().describe("Pixels to extend right"),
      up: z.number().int().min(0).max(2000).optional().describe("Pixels to extend upward"),
      down: z.number().int().min(0).max(2000).optional().describe("Pixels to extend downward"),
      creativity: z.number().min(0.1).max(1).optional().describe("How creative the extension is (default: 0.5)"),
      seed: stabilitySeed,
      output_format: stabilityFormat,
      style_preset: stabilityStyle,
    },
    async (args) => runTool("ai.stability_outpaint", args)
  );

  regTool(
    "ai.stability_search_replace",
    "Find an object in an image and replace it with something else. No mask needed. 5 credits.",
    {
      prompt: z.string().max(10000).describe("What to replace the object WITH"),
      search_prompt: z.string().max(10000).describe("What to find and replace in the image"),
      image_path: z.string().describe("Source image path"),
      negative_prompt: stabilityNeg,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      grow_mask: stabilityGrowMask,
      style_preset: stabilityStyle,
    },
    async (args) => runTool("ai.stability_search_replace", args)
  );

  regTool(
    "ai.stability_recolor",
    "Find an object in an image and recolor it. 5 credits. Great for creating color variants of assets.",
    {
      prompt: z.string().max(10000).describe("Desired color/appearance"),
      select_prompt: z.string().max(10000).describe("What to find and recolor"),
      image_path: z.string().describe("Source image path"),
      negative_prompt: stabilityNeg,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      grow_mask: stabilityGrowMask,
      style_preset: stabilityStyle,
    },
    async (args) => runTool("ai.stability_recolor", args)
  );

  regTool(
    "ai.stability_erase",
    "Erase an object from an image using a mask. 5 credits.",
    {
      image_path: z.string().describe("Source image path"),
      mask_path: z.string().optional().describe("B&W mask (white=erase). If omitted, uses alpha channel."),
      seed: stabilitySeed,
      output_format: stabilityFormat,
      grow_mask: stabilityGrowMask,
    },
    async (args) => runTool("ai.stability_erase", args)
  );

  regTool(
    "ai.stability_remove_bg",
    "Remove the background from an image. 5 credits. Essential for creating sprites with transparent backgrounds.",
    {
      image_path: z.string().describe("Source image path"),
      output_format: stabilityFormat,
    },
    async (args) => runTool("ai.stability_remove_bg", args)
  );

  regTool(
    "ai.stability_upscale_fast",
    "Upscale an image 4x using fast AI upscaling. 2 credits. Good for pixel art.",
    {
      image_path: z.string().describe("Source image path (32-1536px per side)"),
      output_format: stabilityFormat,
    },
    async (args) => runTool("ai.stability_upscale_fast", args)
  );

  regTool(
    "ai.stability_sketch",
    "Transform a sketch or outline into a finished image. 5 credits. Great for concept art workflow.",
    {
      prompt: z.string().max(10000).describe("What to generate from the sketch"),
      image_path: z.string().describe("Sketch/outline image path"),
      control_strength: z.number().min(0).max(1).optional().describe("How closely to follow the sketch (default: 0.7)"),
      negative_prompt: stabilityNeg,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      style_preset: stabilityStyle,
    },
    async (args) => runTool("ai.stability_sketch", args)
  );

  regTool(
    "ai.stability_style",
    "Generate an image matching the style of a reference image. 5 credits. Perfect for consistent art direction.",
    {
      prompt: z.string().max(10000).describe("What to generate in the reference style"),
      image_path: z.string().describe("Style reference image path"),
      fidelity: z.number().min(0).max(1).optional().describe("How closely to match reference style (default: 0.5)"),
      aspect_ratio: stabilityAspect,
      negative_prompt: stabilityNeg,
      seed: stabilitySeed,
      output_format: stabilityFormat,
      style_preset: stabilityStyle,
    },
    async (args) => runTool("ai.stability_style", args)
  );

  regTool(
    "ai.stability_balance",
    "Check remaining Stability AI credit balance.",
    {},
    async (args) => runTool("ai.stability_balance", args)
  );
}
