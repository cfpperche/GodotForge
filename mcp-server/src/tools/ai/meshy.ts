import { z } from "zod";
import type { ToolContext } from "../types.js";
import { meshyFormats, meshyAiModel, meshyTopology, meshyPolycount, meshyOrigin } from "./schemas.js";

export function registerMeshyTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  regTool(
    "ai.meshy_text_to_3d",
    "Generate a 3D mesh from a text description using Meshy AI (preview mode). Returns a GLB file. Takes 1-5 minutes. Use ai.meshy_refine to add textures afterwards.",
    {
      prompt: z.string().max(600).describe("Text description of the 3D model to generate (max 600 chars)"),
      model_type: z.enum(["standard", "lowpoly"]).optional().describe("Model type (default: standard)"),
      ai_model: meshyAiModel,
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      should_remesh: z.boolean().optional().describe("Enable remesh phase (default: false for meshy-6, true for others)"),
      symmetry_mode: z.enum(["off", "auto", "on"]).optional().describe("Symmetry mode (default: auto)"),
      pose_mode: z.enum(["a-pose", "t-pose", ""]).optional().describe("Character pose mode (empty for non-characters)"),
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_text_to_3d", args)
  );

  regTool(
    "ai.meshy_refine",
    "Apply AI texture to a completed text-to-3D preview task. Costs 10 credits. Takes 1-3 minutes.",
    {
      preview_task_id: z.string().describe("Task ID of a completed text-to-3D preview"),
      enable_pbr: z.boolean().optional().describe("Generate metallic, roughness, normal maps (default: false)"),
      texture_prompt: z.string().max(600).optional().describe("Text description for texture (mutually exclusive with texture_image_url)"),
      texture_image_url: z.string().optional().describe("Reference image URL for texture (mutually exclusive with texture_prompt)"),
      ai_model: meshyAiModel,
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      remove_lighting: z.boolean().optional().describe("Remove highlights/shadows from texture (default: true, meshy-6 only)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_refine", args)
  );

  regTool(
    "ai.meshy_image_to_3d",
    "Generate a 3D model from a single image using Meshy AI. Returns a GLB file. Takes 1-5 minutes.",
    {
      image_url: z.string().describe("Public image URL or base64 data URI (.jpg, .png)"),
      model_type: z.enum(["standard", "lowpoly"]).optional().describe("Model type (default: standard)"),
      ai_model: meshyAiModel,
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      symmetry_mode: z.enum(["off", "auto", "on"]).optional().describe("Symmetry mode (default: auto)"),
      should_remesh: z.boolean().optional().describe("Enable remesh phase"),
      save_pre_remeshed_model: z.boolean().optional().describe("Save model before remesh (default: false)"),
      should_texture: z.boolean().optional().describe("Generate texture (default: true)"),
      enable_pbr: z.boolean().optional().describe("Generate PBR maps (default: false)"),
      pose_mode: z.enum(["a-pose", "t-pose", ""]).optional().describe("Character pose mode"),
      texture_prompt: z.string().max(600).optional().describe("Text description for texture"),
      texture_image_url: z.string().optional().describe("Reference image URL for texture"),
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      image_enhancement: z.boolean().optional().describe("Enhance input image (default: true, meshy-6 only)"),
      remove_lighting: z.boolean().optional().describe("Remove lighting from texture (default: true, meshy-6 only)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_image_to_3d", args)
  );

  regTool(
    "ai.meshy_multi_image_to_3d",
    "Generate a 3D model from 1-4 images of the same object (different angles) using Meshy AI. Takes 1-5 minutes.",
    {
      image_urls: z.array(z.string()).min(1).max(4).describe("1-4 image URLs of the same object from different angles"),
      model_type: z.enum(["standard", "lowpoly"]).optional().describe("Model type (default: standard)"),
      ai_model: meshyAiModel,
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      symmetry_mode: z.enum(["off", "auto", "on"]).optional().describe("Symmetry mode (default: auto)"),
      should_remesh: z.boolean().optional().describe("Enable remesh phase"),
      should_texture: z.boolean().optional().describe("Generate texture (default: true)"),
      enable_pbr: z.boolean().optional().describe("Generate PBR maps (default: false)"),
      pose_mode: z.enum(["a-pose", "t-pose", ""]).optional().describe("Character pose mode"),
      moderation: z.boolean().optional().describe("Enable content screening (default: false)"),
      target_formats: meshyFormats,
      auto_size: z.boolean().optional().describe("AI-driven real-world sizing (default: false)"),
      origin_at: meshyOrigin,
    },
    async (args) => runTool("ai.meshy_multi_image_to_3d", args)
  );

  regTool(
    "ai.meshy_remesh",
    "Remesh/retopologize an existing 3D model. Can change topology, polycount, format, or resize. 5 credits.",
    {
      input_task_id: z.string().optional().describe("Completed Meshy task ID (provide this OR model_url)"),
      model_url: z.string().optional().describe("Public 3D model URL (.glb, .gltf, .obj, .fbx, .stl) (provide this OR input_task_id)"),
      topology: meshyTopology,
      target_polycount: meshyPolycount,
      resize_height: z.number().optional().describe("Target height in meters (0 = no resize, mutually exclusive with auto_size)"),
      auto_size: z.boolean().optional().describe("AI estimates real-world height (mutually exclusive with resize_height)"),
      origin_at: meshyOrigin,
      convert_format_only: z.boolean().optional().describe("Skip remeshing, only convert format (default: false)"),
      target_formats: z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz", "blend"])).optional().describe("Output formats (default: [glb])"),
    },
    async (args) => runTool("ai.meshy_remesh", args)
  );

  regTool(
    "ai.meshy_retexture",
    "Apply new AI-generated texture to an existing 3D model. Describe the style with text or provide a reference image. 10 credits.",
    {
      input_task_id: z.string().optional().describe("Completed Meshy task ID (provide this OR model_url)"),
      model_url: z.string().optional().describe("Public 3D model URL (.glb, .gltf, .obj, .fbx, .stl) (provide this OR input_task_id)"),
      text_style_prompt: z.string().max(600).optional().describe("Texture description (provide this OR image_style_url)"),
      image_style_url: z.string().optional().describe("Reference image URL for texture style (provide this OR text_style_prompt)"),
      ai_model: meshyAiModel,
      enable_original_uv: z.boolean().optional().describe("Preserve original UV mapping (default: true)"),
      enable_pbr: z.boolean().optional().describe("Generate PBR maps (default: false)"),
      remove_lighting: z.boolean().optional().describe("Remove lighting from texture (default: true, meshy-6 only)"),
      target_formats: meshyFormats,
    },
    async (args) => runTool("ai.meshy_retexture", args)
  );

  regTool(
    "ai.meshy_check_task",
    "Check the status and progress of any Meshy AI generation task.",
    {
      task_id: z.string().describe("Meshy task ID to check"),
      endpoint: z.enum(["text-to-3d", "image-to-3d", "multi-image-to-3d", "remesh", "retexture"]).optional().describe("Task type (default: text-to-3d)"),
    },
    async (args) => runTool("ai.meshy_check_task", args)
  );

  regTool(
    "ai.meshy_balance",
    "Check remaining Meshy AI credit balance.",
    {},
    async (args) => runTool("ai.meshy_balance", args)
  );
}
