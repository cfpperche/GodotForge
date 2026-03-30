import { z } from "zod";
import type { ToolContext } from "./types.js";

export function registerAssetTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  regTool(
    "assets.search_polyhaven",
    "Search Poly Haven for free textures, 3D models, and HDRIs. No API key needed.",
    {
      type: z.enum(["hdris", "textures", "models", "all"]).optional().describe("Asset type (default: all)"),
      categories: z.string().optional().describe("Filter by categories (comma-separated)"),
    },
    async (args) => runTool("assets.search_polyhaven", args)
  );

  regTool(
    "assets.download_polyhaven",
    "Download a Poly Haven asset (texture, model, or HDRI) into the project.",
    {
      asset_id: z.string().describe("Asset ID from search results"),
      resolution: z.string().optional().describe("Resolution (1k, 2k, 4k — default: 1k)"),
      format: z.string().optional().describe("File format (jpg, png, exr, gltf — default: jpg)"),
      target_dir: z.string().optional().describe("Target directory (default: assets/textures)"),
    },
    async (args) => runTool("assets.download_polyhaven", args)
  );

  regTool(
    "assets.search_sketchfab",
    "Search Sketchfab for downloadable 3D models.",
    {
      query: z.string().describe("Search query"),
      downloadable: z.boolean().optional().describe("Only downloadable models (default: true)"),
      animated: z.boolean().optional().describe("Only animated models"),
      count: z.number().optional().describe("Results count (default: 10)"),
    },
    async (args) => runTool("assets.search_sketchfab", args)
  );

  regTool(
    "assets.download_sketchfab",
    "Download a Sketchfab model (GLTF) into the project. Requires Sketchfab API token.",
    {
      uid: z.string().describe("Model UID from search results"),
      target_dir: z.string().optional().describe("Target directory (default: assets/models)"),
    },
    async (args) => runTool("assets.download_sketchfab", args)
  );

  regTool(
    "assets.search_opengameart",
    "Search OpenGameArt.org for free sprites, 3D models, sounds, and music.",
    {
      query: z.string().describe("Search query"),
      type: z.enum(["2d", "3d", "music", "sound"]).optional().describe("Filter by asset type"),
    },
    async (args) => runTool("assets.search_opengameart", args)
  );

  regTool(
    "assets.download_asset",
    "Download any asset from a URL into the project. Triggers Godot filesystem rescan.",
    {
      url: z.string().describe("Direct download URL"),
      target_dir: z.string().optional().describe("Target directory (default: assets/downloads)"),
      file_name: z.string().optional().describe("Override filename"),
    },
    async (args) => runTool("assets.download_asset", args)
  );

  regTool(
    "assets.list_local",
    "List downloaded assets in the project with type and size.",
    {
      directory: z.string().optional().describe("Directory to scan (default: assets)"),
      type: z.enum(["texture", "model", "audio", "scene", "script", "material"]).optional().describe("Filter by asset type"),
    },
    async (args) => runTool("assets.list_local", args)
  );
}
