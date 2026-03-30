import { z } from "zod";
import type { ToolContext } from "./types.js";

export function registerPipelineTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  regTool(
    "pipeline.blender_to_godot",
    "Export from Blender as GLB and import into the Godot project. Handles path conversion and filesystem rescan.",
    {
      target_dir: z.string().optional().describe("Target directory in project (default: 'assets/models')"),
      file_name: z.string().optional().describe("Output filename (default: 'export.glb')"),
    },
    async (args) => runTool("pipeline.blender_to_godot", args)
  );

  regTool(
    "pipeline.blender_to_godot_animated",
    "Export from Blender with animations and armatures as GLB into the Godot project.",
    {
      target_dir: z.string().optional().describe("Target directory in project (default: 'assets/models')"),
      file_name: z.string().optional().describe("Output filename (default: 'export.glb')"),
    },
    async (args) => runTool("pipeline.blender_to_godot_animated", args)
  );

  regTool(
    "pipeline.sync_collision",
    "Generate collision shape hints in Blender for Godot import. Creates -col/-colonly/-trimesh suffixed duplicates that Godot auto-detects on GLTF import.",
    {
      object_name: z.string().describe("Object to create collision for"),
      collision_type: z.enum(["convex", "collision_only", "convex_only", "trimesh"]).optional().describe("Collision type (default: convex)"),
    },
    async (args) => runTool("pipeline.sync_collision", args)
  );

  regTool(
    "pipeline.batch_import",
    "Batch import multiple 3D asset files (GLB, GLTF, FBX, OBJ) from a directory into the Godot project.",
    {
      source_dir: z.string().describe("Source directory (relative to project root)"),
      target_dir: z.string().optional().describe("Target directory (default: 'assets/models')"),
    },
    async (args) => runTool("pipeline.batch_import", args)
  );
}
