/**
 * Blender tool definitions for MCP server registration.
 * ~17 essential tools for Phase A.
 */

import { z } from "zod";

export interface BlenderToolDef {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
}

export const BLENDER_TOOLS: BlenderToolDef[] = [
  // Modeling
  {
    name: "blender.create_mesh",
    description:
      "Create a mesh primitive in Blender (cube, sphere, cylinder, plane, cone, torus).",
    schema: {
      type: z
        .enum([
          "cube",
          "sphere",
          "uv_sphere",
          "ico_sphere",
          "cylinder",
          "plane",
          "cone",
          "torus",
        ])
        .describe("Mesh primitive type"),
      name: z.string().optional().describe("Object name"),
      location: z
        .array(z.number())
        .optional()
        .describe("Position [x, y, z]"),
      scale: z
        .array(z.number())
        .optional()
        .describe("Scale [x, y, z]"),
    },
  },
  {
    name: "blender.delete_object",
    description: "Delete an object from the Blender scene.",
    schema: {
      name: z.string().describe("Object name to delete"),
    },
  },
  {
    name: "blender.duplicate_object",
    description: "Duplicate an object in Blender.",
    schema: {
      name: z.string().describe("Object name to duplicate"),
      new_name: z.string().optional().describe("Name for the copy"),
    },
  },
  {
    name: "blender.transform",
    description:
      "Move, rotate, or scale an object in Blender. Rotation is in degrees.",
    schema: {
      name: z.string().describe("Object name"),
      location: z.array(z.number()).optional().describe("Position [x, y, z]"),
      rotation: z
        .array(z.number())
        .optional()
        .describe("Rotation in degrees [x, y, z]"),
      scale: z.array(z.number()).optional().describe("Scale [x, y, z]"),
    },
  },
  {
    name: "blender.modify",
    description:
      "Apply a modifier to an object (mirror, array, solidify, bevel, subsurf, boolean, decimate).",
    schema: {
      name: z.string().describe("Object name"),
      modifier: z
        .enum([
          "MIRROR",
          "ARRAY",
          "SOLIDIFY",
          "BEVEL",
          "SUBSURF",
          "BOOLEAN",
          "DECIMATE",
        ])
        .describe("Modifier type"),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe("Modifier properties to set"),
    },
  },
  {
    name: "blender.boolean",
    description:
      "Boolean operation between two objects (UNION, DIFFERENCE, INTERSECT).",
    schema: {
      name: z.string().describe("Object to modify"),
      target: z.string().describe("Object to use as operand"),
      operation: z
        .enum(["UNION", "DIFFERENCE", "INTERSECT"])
        .optional()
        .describe("Boolean operation (default: DIFFERENCE)"),
    },
  },
  {
    name: "blender.join_objects",
    description: "Join multiple objects into one.",
    schema: {
      names: z.array(z.string()).describe("Object names to join"),
    },
  },

  // Materials
  {
    name: "blender.create_material",
    description: "Create a PBR material in Blender.",
    schema: {
      name: z.string().describe("Material name"),
      color: z
        .array(z.number())
        .optional()
        .describe("Base color [r, g, b, a] (0-1)"),
      metallic: z.number().optional().describe("Metallic value (0-1)"),
      roughness: z.number().optional().describe("Roughness value (0-1)"),
    },
  },
  {
    name: "blender.assign_material",
    description: "Assign a material to an object.",
    schema: {
      object: z.string().describe("Object name"),
      material: z.string().describe("Material name"),
    },
  },
  {
    name: "blender.list_materials",
    description: "List all materials in the Blender scene.",
    schema: {},
  },

  // Scene & Info
  {
    name: "blender.get_scene_objects",
    description: "List all objects in the Blender scene with type and location.",
    schema: {},
  },
  {
    name: "blender.get_object_properties",
    description:
      "Get detailed properties of a Blender object (vertices, faces, materials, etc.).",
    schema: {
      name: z.string().describe("Object name"),
    },
  },
  {
    name: "blender.get_blender_info",
    description:
      "Get Blender version, current file, object count, and collection info.",
    schema: {},
  },

  // Export
  {
    name: "blender.export_gltf",
    description: "Export Blender scene or selection as GLTF/GLB file.",
    schema: {
      filepath: z
        .string()
        .describe("Output file path (.gltf or .glb)"),
      selected_only: z
        .boolean()
        .optional()
        .describe("Export only selected objects"),
    },
  },
  {
    name: "blender.export_for_godot",
    description:
      "Export Blender scene optimized for Godot (GLB format, Y-up, applied transforms).",
    schema: {
      filepath: z.string().describe("Output .glb file path"),
    },
  },

  // UV
  {
    name: "blender.unwrap_uv",
    description: "UV unwrap a mesh object (smart or standard unwrap).",
    schema: {
      name: z.string().describe("Mesh object name"),
      method: z
        .enum(["smart", "unwrap"])
        .optional()
        .describe("Unwrap method (default: smart)"),
    },
  },

  // Script (escape hatch)
  {
    name: "blender.execute_python",
    description:
      'Execute arbitrary Python/bpy code in Blender. Use _result = "text" to return output.',
    schema: {
      code: z.string().describe("Python code to execute"),
    },
  },
];

/**
 * Map full tool name (blender.create_mesh) to handler name (create_mesh).
 */
export function blenderHandlerName(toolName: string): string {
  return toolName.replace("blender.", "");
}
