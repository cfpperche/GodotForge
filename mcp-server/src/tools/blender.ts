import { z } from "zod";
import type { ToolContext } from "./types.js";
import { BLENDER_TOOLS } from "../blender-tools.js";
import { ensureBlenderDocs, searchBlenderDocs, getBlenderClassReference } from "../docs/blender-docs.js";
import { executeTool } from "../tool-handlers.js";
import type { BlenderBridge } from "../blender-bridge.js";
import type { GodotBridge } from "../bridge.js";
import type { ConfigManager } from "../config.js";

export function registerBlenderTools(
  ctx: ToolContext,
  blender: BlenderBridge,
  root: string,
  bridge: GodotBridge,
  config: ConfigManager
): void {
  const { regTool } = ctx;

  regTool(
    "search_blender_docs",
    "Search Blender bpy API documentation for classes, methods, properties, or operators.",
    {
      query: z.string().describe("Search query (e.g. 'Mesh', 'modifier', 'keyframe')"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async ({ query, limit }) => {
      try {
        const db = await ensureBlenderDocs(blender);
        const results = searchBlenderDocs(db, query, limit || 10);
        if (results.length === 0) {
          return { content: [{ type: "text" as const, text: `No Blender docs found for "${query}".` }] };
        }
        const formatted = results.map((r) => `[${r.kind}] ${r.class_name}.${r.symbol_name}\n  ${r.description}`).join("\n\n");
        return { content: [{ type: "text" as const, text: `Blender API — ${results.length} results:\n\n${formatted}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Blender docs search failed: ${error instanceof Error ? error.message : error}` }], isError: true };
      }
    }
  );

  regTool(
    "get_blender_class",
    "Get the full bpy.types class reference including properties and methods.",
    {
      class_name: z.string().describe("Class name (e.g. 'Object', 'Mesh', 'Material')"),
    },
    async ({ class_name }) => {
      try {
        const db = await ensureBlenderDocs(blender);
        const ref = getBlenderClassReference(db, class_name);
        if (!ref) {
          return { content: [{ type: "text" as const, text: `Blender class "${class_name}" not found.` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(ref, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Failed: ${error instanceof Error ? error.message : error}` }], isError: true };
      }
    }
  );

  for (const tool of BLENDER_TOOLS) {
    regTool(
      tool.name,
      tool.description,
      tool.schema,
      async (args) => executeTool(tool.name, args, root, bridge, blender, config)
    );
  }
}
