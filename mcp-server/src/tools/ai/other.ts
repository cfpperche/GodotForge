import { z } from "zod";
import type { ToolContext } from "../types.js";

export function registerOtherAITools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  // --- Blockade Labs (Skybox AI) ---

  regTool(
    "ai.blockade_generate_skybox",
    "Generate a 360° skybox image from a text description using Blockade Labs. Takes 30-120 seconds. Output: equirectangular image.",
    {
      prompt: z.string().max(550).describe("Scene description for the skybox (max 550 chars)"),
      skybox_style_id: z.number().int().optional().describe("Style ID from ai.blockade_list_styles"),
      negative_text: z.string().max(200).optional().describe("Elements to exclude (max 200 chars)"),
      enhance_prompt: z.boolean().optional().describe("AI prompt enhancement (default: false)"),
      seed: z.number().int().min(0).max(2147483647).optional().describe("Seed for reproducibility (0 = random)"),
      control_image: z.string().optional().describe("Control image URL/base64 (equirectangular, 2:1 ratio)"),
      control_model: z.enum(["remix", "scribble"]).optional().describe("Control image mode"),
      init_image: z.string().optional().describe("Initial image URL/base64 for color/composition base"),
      init_strength: z.number().min(0).max(0.97).optional().describe("Init image influence (0=max influence, 0.97=min)"),
      return_depth_hq: z.boolean().optional().describe("Return high-quality depth map"),
      max_wait_seconds: z.number().optional().describe("Max wait time in seconds (default: 300)"),
    },
    async (args) => runTool("ai.blockade_generate_skybox", args)
  );

  regTool(
    "ai.blockade_list_styles",
    "List available Blockade Labs skybox styles with their IDs, names, and character limits.",
    {
      model_version: z.enum(["2", "3"]).optional().describe("Filter by model version"),
    },
    async (args) => runTool("ai.blockade_list_styles", args)
  );

  regTool(
    "ai.blockade_check_task",
    "Check the status of a Blockade Labs skybox generation task.",
    {
      task_id: z.union([z.string(), z.number()]).describe("Skybox generation ID"),
    },
    async (args) => runTool("ai.blockade_check_task", args)
  );

  // --- ElevenLabs (Voice & Audio AI) ---

  regTool(
    "ai.elevenlabs_tts",
    "Generate speech audio from text using ElevenLabs AI voices. Returns an audio file. Use ai.elevenlabs_list_voices to find voice IDs.",
    {
      text: z.string().describe("Text to convert to speech"),
      voice_id: z.string().optional().describe("Voice ID (default: Rachel). Use ai.elevenlabs_list_voices to find IDs."),
      model_id: z.string().optional().describe("Model: eleven_multilingual_v2 (default), eleven_flash_v2_5 (fast), eleven_v3 (expressive)"),
      language_code: z.string().optional().describe("ISO 639-1 language code (e.g. 'en', 'pt', 'es')"),
      output_format: z.string().optional().describe("Audio format: mp3_44100_128 (default), wav_44100, pcm_16000, opus_48000_128, etc."),
      stability: z.number().min(0).max(1).optional().describe("Voice stability (0=emotional, 1=monotone, default: 0.5)"),
      similarity_boost: z.number().min(0).max(1).optional().describe("Voice similarity fidelity (default: 0.75)"),
      style: z.number().min(0).optional().describe("Style exaggeration (0=none, increases latency)"),
      speed: z.number().min(0.7).max(1.2).optional().describe("Speech speed (default: 1.0)"),
      use_speaker_boost: z.boolean().optional().describe("Boost voice similarity (slight latency increase)"),
      seed: z.number().int().min(0).max(4294967295).optional().describe("Seed for deterministic output"),
      apply_text_normalization: z.enum(["auto", "on", "off"]).optional().describe("Text normalization mode (default: auto)"),
    },
    async (args) => runTool("ai.elevenlabs_tts", args)
  );

  regTool(
    "ai.elevenlabs_sound_effect",
    "Generate a sound effect from a text description using ElevenLabs. Great for game SFX.",
    {
      text: z.string().describe("Description of the desired sound effect"),
      duration_seconds: z.number().min(0.5).max(30).optional().describe("Duration in seconds (default: auto)"),
      prompt_influence: z.number().min(0).max(1).optional().describe("How closely to follow the prompt (default: 0.3)"),
      loop: z.boolean().optional().describe("Generate seamless loop (default: false)"),
      output_format: z.string().optional().describe("Audio format (default: mp3_44100_128)"),
    },
    async (args) => runTool("ai.elevenlabs_sound_effect", args)
  );

  regTool(
    "ai.elevenlabs_list_voices",
    "List available ElevenLabs voices with IDs, names, and categories.",
    {
      search: z.string().optional().describe("Search by name/description"),
      category: z.enum(["premade", "cloned", "generated", "professional"]).optional().describe("Filter by category"),
      page_size: z.number().int().min(1).max(100).optional().describe("Results per page (default: 10)"),
    },
    async (args) => runTool("ai.elevenlabs_list_voices", args)
  );

  regTool(
    "ai.elevenlabs_list_models",
    "List available ElevenLabs TTS models with capabilities and language support.",
    {},
    async (args) => runTool("ai.elevenlabs_list_models", args)
  );

  // --- Rodin (Hyper3D) ---

  regTool(
    "ai.rodin_generate",
    "Generate a 3D model using Hyper3D Rodin AI. Supports text-to-3D and image-to-3D. Returns a GLB file.",
    {
      prompt: z.string().optional().describe("Text description for the 3D model"),
      images: z.array(z.string()).optional().describe("Image URLs for image-to-3D (multiple for multi-view)"),
      condition_mode: z.enum(["concat", "fuse"]).optional().describe("How multi-image inputs are combined (default: concat)"),
      geometry: z.enum(["mesh", "mesh_and_rig"]).optional().describe("Output type: mesh only or mesh with auto-rigging"),
      material: z.enum(["PBR", "Shaded"]).optional().describe("Material type (default: PBR)"),
      quality: z.enum(["high", "medium", "low", "extra-low"]).optional().describe("Generation quality"),
      tier: z.enum(["Regular", "Sketch"]).optional().describe("Input tier: Regular or Sketch (for hand-drawn)"),
      ai_model: z.enum(["Rodin", "Rodin-Large"]).optional().describe("AI model variant"),
      seed: z.number().int().optional().describe("Random seed for reproducibility"),
      mesh_simplify: z.number().min(0).max(1).optional().describe("Polygon reduction ratio (0=no reduction, 1=maximum)"),
      mesh_smooth: z.boolean().optional().describe("Apply mesh smoothing"),
    },
    async (args) => runTool("ai.rodin_generate", args)
  );

  regTool(
    "ai.rodin_check_task",
    "Check the status of a Rodin 3D generation task.",
    {
      subscription_key: z.string().describe("Subscription key from rodin_generate"),
    },
    async (args) => runTool("ai.rodin_check_task", args)
  );

  // --- Tripo AI ---

  regTool(
    "ai.tripo_text_to_3d",
    "Generate a 3D model from text using Tripo AI. Returns a GLB file with PBR textures.",
    {
      prompt: z.string().describe("Text description of the 3D model"),
      negative_prompt: z.string().optional().describe("What to avoid"),
      art_style: z.enum(["auto", "realistic", "cartoon", "sculpture", "pbr"]).optional().describe("Art style (default: auto)"),
      model_version: z.string().optional().describe("Model version"),
      face_limit: z.number().int().optional().describe("Max polygon count"),
      texture: z.boolean().optional().describe("Generate textures (default: true)"),
      pbr: z.boolean().optional().describe("Generate PBR maps (default: true)"),
    },
    async (args) => runTool("ai.tripo_text_to_3d", args)
  );

  regTool(
    "ai.tripo_image_to_3d",
    "Generate a 3D model from an image using Tripo AI. Uploads the image then generates.",
    {
      image_path: z.string().describe("Local image path (res:// or absolute)"),
      model_version: z.string().optional().describe("Model version"),
      face_limit: z.number().int().optional().describe("Max polygon count"),
      texture: z.boolean().optional().describe("Generate textures (default: true)"),
      pbr: z.boolean().optional().describe("Generate PBR maps (default: true)"),
    },
    async (args) => runTool("ai.tripo_image_to_3d", args)
  );

  regTool(
    "ai.tripo_refine",
    "Refine a previously generated Tripo 3D model for higher quality.",
    {
      draft_model_task_id: z.string().describe("Task ID of the draft model to refine"),
    },
    async (args) => runTool("ai.tripo_refine", args)
  );

  regTool(
    "ai.tripo_animate",
    "Auto-rig and optionally animate a Tripo 3D model. Supports animation presets like walk, run, idle, dance.",
    {
      original_model_task_id: z.string().describe("Task ID of the model to rig/animate"),
      animation: z.string().optional().describe("Animation preset: walk, run, idle, dance, etc. If omitted, returns rigged model only."),
    },
    async (args) => runTool("ai.tripo_animate", args)
  );

  regTool(
    "ai.tripo_stylize",
    "Apply an artistic style to a Tripo 3D model (voronoi, lego, minecraft).",
    {
      original_model_task_id: z.string().describe("Task ID of the source model"),
      style: z.enum(["voronoi", "lego", "minecraft"]).describe("Target style"),
    },
    async (args) => runTool("ai.tripo_stylize", args)
  );

  regTool(
    "ai.tripo_check_task",
    "Check the status of a Tripo AI task.",
    {
      task_id: z.string().describe("Tripo task ID"),
    },
    async (args) => runTool("ai.tripo_check_task", args)
  );

  regTool(
    "ai.tripo_balance",
    "Check remaining Tripo AI credit balance.",
    {},
    async (args) => runTool("ai.tripo_balance", args)
  );

  // --- OpenAI DALL-E ---

  regTool(
    "ai.dalle_generate",
    "Generate an image using OpenAI DALL-E 3 or DALL-E 2.",
    {
      prompt: z.string().max(4000).describe("Image description (max 4000 chars for DALL-E 3, 1000 for DALL-E 2)"),
      model: z.enum(["dall-e-2", "dall-e-3"]).optional().describe("Model (default: dall-e-3)"),
      size: z.enum(["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]).optional().describe("Image size (default: 1024x1024)"),
      quality: z.enum(["standard", "hd"]).optional().describe("Quality: standard or hd (DALL-E 3 only, default: standard)"),
      style: z.enum(["vivid", "natural"]).optional().describe("Style: vivid (dramatic) or natural (DALL-E 3 only, default: vivid)"),
      n: z.number().int().min(1).max(10).optional().describe("Number of images (1-10 for DALL-E 2, must be 1 for DALL-E 3)"),
    },
    async (args) => runTool("ai.dalle_generate", args)
  );

  regTool(
    "ai.dalle_edit",
    "Edit an image using DALL-E 2 with an optional mask. Replace areas with AI-generated content.",
    {
      image_path: z.string().describe("Source image path (PNG, square, <4MB)"),
      prompt: z.string().max(1000).describe("Description of the desired edit"),
      mask_path: z.string().optional().describe("Mask image path (transparent areas = edit). If omitted, edits based on alpha."),
      size: z.enum(["256x256", "512x512", "1024x1024"]).optional().describe("Output size (default: 1024x1024)"),
      n: z.number().int().min(1).max(10).optional().describe("Number of variations (default: 1)"),
    },
    async (args) => runTool("ai.dalle_edit", args)
  );

  regTool(
    "ai.dalle_variation",
    "Create variations of an existing image using DALL-E 2.",
    {
      image_path: z.string().describe("Source image path (PNG, square, <4MB)"),
      size: z.enum(["256x256", "512x512", "1024x1024"]).optional().describe("Output size (default: 1024x1024)"),
      n: z.number().int().min(1).max(10).optional().describe("Number of variations (default: 1)"),
    },
    async (args) => runTool("ai.dalle_variation", args)
  );

  // --- Suno (Music AI) ---

  regTool(
    "ai.suno_generate",
    "Generate music using Suno AI. Returns 2 tracks per request. Custom mode: provide lyrics/style/title. Auto mode: describe what you want.",
    {
      prompt: z.string().describe("Lyrics (custom mode, max 3000 chars) or creative direction (auto mode, max 500 chars)"),
      custom_mode: z.boolean().optional().describe("true = you provide lyrics/style/title, false = AI generates everything (default: false)"),
      instrumental: z.boolean().optional().describe("Instrumental only, no vocals (default: false)"),
      model: z.enum(["V4", "V4_5", "V4_5PLUS", "V5", "V5_5"]).optional().describe("Model version (default: V4_5)"),
      style: z.string().max(200).optional().describe("Genre/style description (custom mode only, max 200 chars)"),
      title: z.string().max(80).optional().describe("Track title (custom mode only)"),
      negative_tags: z.string().optional().describe("Styles to exclude"),
      vocal_gender: z.enum(["m", "f"]).optional().describe("Preferred vocal gender"),
      style_weight: z.number().min(0).max(1).optional().describe("How strongly to follow style (0-1)"),
      max_wait_seconds: z.number().optional().describe("Max wait time in seconds (default: 180)"),
    },
    async (args) => runTool("ai.suno_generate", args)
  );

  regTool(
    "ai.suno_lyrics",
    "Generate lyrics from a prompt using Suno AI.",
    {
      prompt: z.string().describe("Description of the song/theme for lyrics generation"),
    },
    async (args) => runTool("ai.suno_lyrics", args)
  );

  regTool(
    "ai.suno_check_task",
    "Check the status of a Suno music generation task.",
    {
      task_id: z.string().describe("Suno task ID"),
    },
    async (args) => runTool("ai.suno_check_task", args)
  );

  regTool(
    "ai.suno_credits",
    "Check remaining Suno AI credits.",
    {},
    async (args) => runTool("ai.suno_credits", args)
  );

  // --- Hugging Face Inference ---

  regTool(
    "ai.huggingface_text_to_image",
    "Generate an image using open-source models on Hugging Face (FLUX, Stable Diffusion, etc.). Free tier available.",
    {
      prompt: z.string().describe("Text description of the image"),
      model: z.string().optional().describe("Model ID (default: black-forest-labs/FLUX.1-dev). Other options: stabilityai/stable-diffusion-xl-base-1.0"),
      negative_prompt: z.string().optional().describe("What to exclude from the image"),
      guidance_scale: z.number().optional().describe("CFG scale — prompt adherence (default: ~7.5)"),
      num_inference_steps: z.number().int().optional().describe("Denoising steps (more = higher quality, slower)"),
      width: z.number().int().optional().describe("Output width in pixels"),
      height: z.number().int().optional().describe("Output height in pixels"),
      seed: z.number().int().optional().describe("Seed for reproducibility"),
    },
    async (args) => runTool("ai.huggingface_text_to_image", args)
  );
}
