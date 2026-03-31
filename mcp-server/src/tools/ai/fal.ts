import { z } from "zod";
import type { ToolContext } from "../types.js";

const falImageSize = z.union([
  z.enum(["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"]),
  z.object({ width: z.number().int(), height: z.number().int() }),
]).optional().describe("Image size preset or {width, height} (default: landscape_4_3)");

const falSeed = z.number().int().optional().describe("Seed for reproducibility (random if omitted)");
const falOutputFormat = z.enum(["jpeg", "png"]).optional().describe("Output format (default: jpeg)");

export function registerFalTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  // --- Image Generation ---

  regTool(
    "ai.fal_flux_pro",
    "Generate an image using FLUX Pro 1.1 via fal.ai. High quality, $0.04/megapixel.",
    {
      prompt: z.string().describe("Text description of the image to generate"),
      image_size: falImageSize,
      seed: falSeed,
      num_images: z.number().int().min(1).optional().describe("Number of images (default: 1)"),
      output_format: falOutputFormat,
      safety_tolerance: z.number().int().min(1).max(6).optional().describe("Safety filter: 1 (strictest) to 6 (most permissive), default: 2"),
      enhance_prompt: z.boolean().optional().describe("Auto-optimize prompt (default: false)"),
    },
    async (args) => runTool("ai.fal_flux_pro", args)
  );

  regTool(
    "ai.fal_flux_schnell",
    "Generate an image using FLUX Schnell via fal.ai. Fast and cheap.",
    {
      prompt: z.string().describe("Text description of the image"),
      image_size: falImageSize,
      num_inference_steps: z.number().int().min(1).max(50).optional().describe("Denoising steps (default: 4)"),
      seed: falSeed,
      guidance_scale: z.number().min(1).max(20).optional().describe("Prompt adherence (default: 3.5)"),
      num_images: z.number().int().min(1).max(4).optional().describe("Number of images (default: 1)"),
      output_format: falOutputFormat,
    },
    async (args) => runTool("ai.fal_flux_schnell", args)
  );

  regTool(
    "ai.fal_sd35",
    "Generate an image using Stable Diffusion 3.5 Large via fal.ai. Supports negative prompts.",
    {
      prompt: z.string().describe("Text description of the image"),
      negative_prompt: z.string().optional().describe("What to exclude from the image"),
      image_size: falImageSize,
      num_inference_steps: z.number().int().min(1).max(50).optional().describe("Denoising steps (default: 28)"),
      seed: falSeed,
      guidance_scale: z.number().min(0).max(20).optional().describe("Prompt adherence (default: 3.5)"),
      num_images: z.number().int().min(1).max(4).optional().describe("Number of images (default: 1)"),
      output_format: falOutputFormat,
    },
    async (args) => runTool("ai.fal_sd35", args)
  );

  regTool(
    "ai.fal_sdxl",
    "Generate an image using Fast SDXL via fal.ai. Supports negative prompts and prompt expansion.",
    {
      prompt: z.string().describe("Text description of the image"),
      negative_prompt: z.string().optional().describe("What to exclude"),
      image_size: falImageSize,
      num_inference_steps: z.number().int().min(1).max(50).optional().describe("Denoising steps (default: 25)"),
      seed: falSeed,
      guidance_scale: z.number().min(0).max(20).optional().describe("Prompt adherence (default: 7.5)"),
      num_images: z.number().int().min(1).max(8).optional().describe("Number of images (default: 1)"),
      format: z.enum(["jpeg", "png"]).optional().describe("Output format (default: jpeg)"),
      expand_prompt: z.boolean().optional().describe("Auto-expand prompt (default: false)"),
    },
    async (args) => runTool("ai.fal_sdxl", args)
  );

  // --- 3D Generation ---

  regTool(
    "ai.fal_rodin",
    "Generate a 3D model using Hyper3D Rodin via fal.ai. Text-to-3D or image-to-3D. Returns GLB.",
    {
      prompt: z.string().optional().describe("Text description (required for text-to-3D, optional guidance for image-to-3D)"),
      input_image_urls: z.array(z.string()).optional().describe("Image URLs for image-to-3D (up to 5)"),
      seed: z.number().int().min(0).max(65535).optional().describe("Seed (0-65535)"),
      geometry_file_format: z.enum(["glb", "usdz", "fbx", "obj", "stl"]).optional().describe("Output format (default: glb)"),
      material: z.enum(["PBR", "Shaded", "All"]).optional().describe("Material type (default: All)"),
      quality_mesh_option: z.string().optional().describe("Mesh quality: 4K/8K/18K/50K Quad or 2K/20K/150K/500K Triangle"),
      TAPose: z.boolean().optional().describe("T-pose / A-pose for characters"),
      bbox_condition: z.array(z.number().int()).optional().describe("Bounding box [width, height, length]"),
      addons: z.string().optional().describe("'HighPack' for 4K textures + high-poly"),
    },
    async (args) => runTool("ai.fal_rodin", args)
  );

  regTool(
    "ai.fal_tripo",
    "Generate a 3D model from an image using Tripo3D v2.5 via fal.ai. Returns GLB with textures.",
    {
      image_url: z.string().describe("Image URL or local path (res://)"),
      seed: falSeed,
      face_limit: z.number().int().optional().describe("Max polygon count"),
      pbr: z.boolean().optional().describe("Enable PBR textures (default: false)"),
      texture: z.enum(["no", "standard", "HD"]).optional().describe("Texture quality (default: standard)"),
      style: z.string().optional().describe("Style: person:person2cartoon, object:clay, object:steampunk, animal:venom, object:barbie, object:christmas, gold, ancient_bronze"),
      quad: z.boolean().optional().describe("Quad mesh topology (default: false, forces FBX)"),
      auto_size: z.boolean().optional().describe("Scale to real-world meters"),
      texture_alignment: z.enum(["original_image", "geometry"]).optional().describe("Texture alignment (default: original_image)"),
      orientation: z.enum(["default", "align_image"]).optional().describe("Orientation mode"),
    },
    async (args) => runTool("ai.fal_tripo", args)
  );

  regTool(
    "ai.fal_trellis",
    "Generate a 3D model from an image using Trellis via fal.ai. Very cheap ($0.02). Returns GLB.",
    {
      image_url: z.string().describe("Image URL or local path (res://)"),
      seed: falSeed,
      ss_guidance_strength: z.number().min(0).max(10).optional().describe("Structure guidance (default: 7.5)"),
      ss_sampling_steps: z.number().int().min(1).max(50).optional().describe("Structure sampling steps (default: 12)"),
      slat_guidance_strength: z.number().min(0).max(10).optional().describe("Latent guidance (default: 3.0)"),
      slat_sampling_steps: z.number().int().min(1).max(50).optional().describe("Latent sampling steps (default: 12)"),
      mesh_simplify: z.number().min(0.9).max(0.98).optional().describe("Mesh simplification ratio (default: 0.95)"),
      texture_size: z.number().int().optional().describe("Texture resolution: 512, 1024, or 2048 (default: 1024)"),
    },
    async (args) => runTool("ai.fal_trellis", args)
  );

  regTool(
    "ai.fal_hunyuan3d",
    "Generate a 3D model from an image using Hunyuan3D v2 via fal.ai. Returns GLB. Textured mesh costs 3x.",
    {
      input_image_url: z.string().describe("Image URL or local path (res://)"),
      seed: falSeed,
      num_inference_steps: z.number().int().min(1).max(50).optional().describe("Inference steps (default: 50)"),
      guidance_scale: z.number().min(0).max(20).optional().describe("Guidance scale (default: 7.5)"),
      octree_resolution: z.number().int().min(1).max(1024).optional().describe("Octree resolution (default: 256)"),
      textured_mesh: z.boolean().optional().describe("Generate textured mesh (3x price, default: false)"),
    },
    async (args) => runTool("ai.fal_hunyuan3d", args)
  );

  // --- Audio ---

  regTool(
    "ai.fal_stable_audio",
    "Generate music or sound effects using Stable Audio via fal.ai. Returns WAV up to 47 seconds.",
    {
      prompt: z.string().describe("Audio description (e.g. '128 BPM tech house drum loop')"),
      seconds_start: z.number().int().min(0).max(47).optional().describe("Start offset in seconds (default: 0)"),
      seconds_total: z.number().int().min(0).max(47).optional().describe("Total duration in seconds (default: 30)"),
      steps: z.number().int().min(1).max(1000).optional().describe("Diffusion steps (default: 100)"),
    },
    async (args) => runTool("ai.fal_stable_audio", args)
  );

  regTool(
    "ai.fal_kokoro_tts",
    "Generate speech using Kokoro TTS via fal.ai. Fast, cheap ($0.02/1K chars). 20 American English voices.",
    {
      prompt: z.string().describe("Text to speak"),
      voice: z.enum([
        "af_heart", "af_alloy", "af_aoede", "af_bella", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky",
        "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx", "am_puck", "am_santa",
      ]).optional().describe("Voice ID (default: af_heart). af_ = female, am_ = male"),
      speed: z.number().min(0.1).max(5).optional().describe("Speech speed (default: 1.0)"),
    },
    async (args) => runTool("ai.fal_kokoro_tts", args)
  );

  // --- Utility ---

  regTool(
    "ai.fal_upscale",
    "Upscale an image using ESRGAN via fal.ai. Supports 1-8x scale with 6 model variants.",
    {
      image_url: z.string().describe("Image URL or local path (res://)"),
      scale: z.number().min(1).max(8).optional().describe("Upscale factor (default: 2)"),
      model: z.enum([
        "RealESRGAN_x4plus", "RealESRGAN_x2plus", "RealESRGAN_x4plus_anime_6B",
        "RealESRGAN_x4_v3", "RealESRGAN_x4_wdn_v3", "RealESRGAN_x4_anime_v3",
      ]).optional().describe("ESRGAN model variant (default: RealESRGAN_x4plus)"),
      face: z.boolean().optional().describe("Face upscaling mode (default: false)"),
      tile: z.number().int().optional().describe("Tiling size for OOM issues (0 = no tiling, try 200-400)"),
      output_format: z.enum(["png", "jpeg"]).optional().describe("Output format (default: png)"),
    },
    async (args) => runTool("ai.fal_upscale", args)
  );

  regTool(
    "ai.fal_remove_bg",
    "Remove background from an image using BiRefNet v2 via fal.ai. Returns transparent PNG.",
    {
      image_url: z.string().describe("Image URL or local path (res://)"),
      model: z.enum([
        "General Use (Light)", "General Use (Light 2K)", "General Use (Heavy)",
        "Matting", "Portrait", "General Use (Dynamic)",
      ]).optional().describe("Model variant (default: General Use (Light))"),
      operating_resolution: z.enum(["1024x1024", "2048x2048", "2304x2304"]).optional().describe("Processing resolution (default: 1024x1024)"),
      output_mask: z.boolean().optional().describe("Also return the mask image (default: false)"),
      refine_foreground: z.boolean().optional().describe("Refine using estimated mask (default: true)"),
      output_format: z.enum(["png", "webp"]).optional().describe("Output format (default: png)"),
    },
    async (args) => runTool("ai.fal_remove_bg", args)
  );
}
