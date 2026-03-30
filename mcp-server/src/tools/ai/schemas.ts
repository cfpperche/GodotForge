import { z } from "zod";

// Meshy shared schemas
export const meshyFormats = z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz"])).optional().describe("Output formats (default: [glb])");
export const meshyAiModel = z.enum(["meshy-5", "meshy-6", "latest"]).optional().describe("AI model (default: latest)");
export const meshyTopology = z.enum(["quad", "triangle"]).optional().describe("Mesh topology (default: triangle)");
export const meshyPolycount = z.number().min(100).max(300000).optional().describe("Target polygon count (100-300000, default: 30000)");
export const meshyOrigin = z.enum(["bottom", "center"]).optional().describe("Model origin point (default: bottom)");

// Stability shared schemas
export const stabilityFormat = z.enum(["jpeg", "png", "webp"]).optional().describe("Output format (default: png)");
export const stabilityAspect = z.enum(["16:9", "1:1", "21:9", "2:3", "3:2", "4:5", "5:4", "9:16", "9:21"]).optional().describe("Aspect ratio (default: 1:1)");
export const stabilitySeed = z.number().int().min(0).max(4294967294).optional().describe("Seed for reproducibility (0 = random)");
export const stabilityNeg = z.string().optional().describe("Negative prompt — what to exclude from the image");
export const stabilityStyle = z.enum([
  "3d-model", "analog-film", "anime", "cinematic", "comic-book", "digital-art",
  "enhance", "fantasy-art", "isometric", "line-art", "low-poly", "modeling-compound",
  "neon-punk", "origami", "photographic", "pixel-art", "tile-texture",
]).optional().describe("Style preset to guide generation");
export const stabilityGrowMask = z.number().int().min(0).max(20).optional().describe("Pixels to grow mask edges (default: 5)");
