/**
 * Blender tool definitions for MCP server registration.
 * Phase B: ~40 tools covering modeling, materials, animation, scene, export, UV, collision.
 */

import { z } from "zod";

export interface BlenderToolDef {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
}

export const BLENDER_TOOLS: BlenderToolDef[] = [
  // ==================== Modeling (12) ====================
  {
    name: "blender.create_mesh",
    description: "Create a mesh primitive in Blender (cube, sphere, cylinder, plane, cone, torus).",
    schema: {
      type: z.enum(["cube", "sphere", "uv_sphere", "ico_sphere", "cylinder", "plane", "cone", "torus"]).describe("Mesh primitive type"),
      name: z.string().optional().describe("Object name"),
      location: z.array(z.number()).optional().describe("Position [x, y, z]"),
      scale: z.array(z.number()).optional().describe("Scale [x, y, z]"),
    },
  },
  {
    name: "blender.delete_object",
    description: "Delete an object from the Blender scene.",
    schema: { name: z.string().describe("Object name to delete") },
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
    description: "Move, rotate, or scale an object in Blender. Rotation is in degrees.",
    schema: {
      name: z.string().describe("Object name"),
      location: z.array(z.number()).optional().describe("Position [x, y, z]"),
      rotation: z.array(z.number()).optional().describe("Rotation in degrees [x, y, z]"),
      scale: z.array(z.number()).optional().describe("Scale [x, y, z]"),
    },
  },
  {
    name: "blender.modify",
    description: "Apply a modifier to an object (mirror, array, solidify, bevel, subsurf, boolean, decimate).",
    schema: {
      name: z.string().describe("Object name"),
      modifier: z.enum(["MIRROR", "ARRAY", "SOLIDIFY", "BEVEL", "SUBSURF", "BOOLEAN", "DECIMATE"]).describe("Modifier type"),
      properties: z.record(z.string(), z.any()).optional().describe("Modifier properties to set"),
    },
  },
  {
    name: "blender.boolean",
    description: "Boolean operation between two objects (UNION, DIFFERENCE, INTERSECT).",
    schema: {
      name: z.string().describe("Object to modify"),
      target: z.string().describe("Object to use as operand"),
      operation: z.enum(["UNION", "DIFFERENCE", "INTERSECT"]).optional().describe("Boolean operation (default: DIFFERENCE)"),
    },
  },
  {
    name: "blender.join_objects",
    description: "Join multiple objects into one.",
    schema: { names: z.array(z.string()).describe("Object names to join") },
  },
  {
    name: "blender.extrude",
    description: "Extrude all faces of a mesh along Z axis.",
    schema: {
      name: z.string().describe("Mesh object name"),
      offset: z.number().optional().describe("Extrude distance (default: 1.0)"),
    },
  },
  {
    name: "blender.subdivide",
    description: "Subdivide a mesh to add geometry.",
    schema: {
      name: z.string().describe("Mesh object name"),
      cuts: z.number().optional().describe("Number of cuts (default: 1)"),
    },
  },
  {
    name: "blender.set_origin",
    description: "Set the origin point of an object (geometry center, center of mass, etc.).",
    schema: {
      name: z.string().describe("Object name"),
      type: z.enum(["ORIGIN_GEOMETRY", "ORIGIN_CENTER_OF_MASS", "ORIGIN_CENTER_OF_VOLUME", "ORIGIN_CURSOR", "GEOMETRY_ORIGIN"]).optional().describe("Origin type"),
    },
  },
  {
    name: "blender.separate_mesh",
    description: "Separate a mesh by loose parts or by material.",
    schema: {
      name: z.string().describe("Mesh object name"),
      method: z.enum(["LOOSE", "MATERIAL"]).optional().describe("Separation method"),
    },
  },

  // ==================== Materials (8) ====================
  {
    name: "blender.create_material",
    description: "Create a PBR material in Blender.",
    schema: {
      name: z.string().describe("Material name"),
      color: z.array(z.number()).optional().describe("Base color [r, g, b, a] (0-1)"),
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
    name: "blender.set_material_texture",
    description: "Assign a texture image to a material channel (base_color, metallic, roughness, normal).",
    schema: {
      material: z.string().describe("Material name"),
      channel: z.enum(["base_color", "albedo", "metallic", "roughness", "normal"]).describe("Texture channel"),
      filepath: z.string().describe("Image file path"),
    },
  },
  {
    name: "blender.bake_textures",
    description: "Bake textures (DIFFUSE, NORMAL, AO, ROUGHNESS) for a mesh object.",
    schema: {
      name: z.string().describe("Mesh object name"),
      type: z.enum(["DIFFUSE", "NORMAL", "AO", "ROUGHNESS", "COMBINED"]).optional().describe("Bake type"),
      resolution: z.number().optional().describe("Texture resolution (default: 1024)"),
      filepath: z.string().optional().describe("Output file path"),
    },
  },
  {
    name: "blender.delete_material",
    description: "Remove a material from the scene.",
    schema: { name: z.string().describe("Material name") },
  },
  {
    name: "blender.list_materials",
    description: "List all materials in the Blender scene.",
    schema: {},
  },

  // ==================== Animation (8) ====================
  {
    name: "blender.create_armature",
    description: "Create an armature (skeleton) for rigging.",
    schema: {
      name: z.string().optional().describe("Armature name"),
      location: z.array(z.number()).optional().describe("Position [x, y, z]"),
    },
  },
  {
    name: "blender.add_bone",
    description: "Add a bone to an armature.",
    schema: {
      armature: z.string().describe("Armature object name"),
      name: z.string().describe("Bone name"),
      head: z.array(z.number()).optional().describe("Head position [x, y, z]"),
      tail: z.array(z.number()).optional().describe("Tail position [x, y, z]"),
      parent: z.string().optional().describe("Parent bone name"),
    },
  },
  {
    name: "blender.parent_to_armature",
    description: "Parent a mesh to an armature with automatic weights.",
    schema: {
      mesh: z.string().describe("Mesh object name"),
      armature: z.string().describe("Armature object name"),
    },
  },
  {
    name: "blender.insert_keyframe",
    description: "Insert a keyframe on an object (location, rotation_euler, scale).",
    schema: {
      name: z.string().describe("Object name"),
      data_path: z.enum(["location", "rotation_euler", "scale"]).describe("Property to keyframe"),
      frame: z.number().describe("Frame number"),
      value: z.array(z.number()).optional().describe("Value to set before keyframing"),
    },
  },
  {
    name: "blender.create_animation",
    description: "Create a new animation action and assign it to an object.",
    schema: {
      object: z.string().describe("Object name"),
      name: z.string().describe("Action name"),
      frame_start: z.number().optional().describe("Start frame (default: 1)"),
      frame_end: z.number().optional().describe("End frame (default: 60)"),
    },
  },
  {
    name: "blender.set_animation_range",
    description: "Set the scene frame range.",
    schema: {
      frame_start: z.number().describe("Start frame"),
      frame_end: z.number().describe("End frame"),
    },
  },
  {
    name: "blender.auto_weight_paint",
    description: "Auto weight paint a mesh to its armature parent.",
    schema: { mesh: z.string().describe("Mesh object name") },
  },
  {
    name: "blender.list_animations",
    description: "List all animation actions in the scene.",
    schema: {},
  },

  // ==================== UV (1) ====================
  {
    name: "blender.unwrap_uv",
    description: "UV unwrap a mesh object (smart or standard unwrap).",
    schema: {
      name: z.string().describe("Mesh object name"),
      method: z.enum(["smart", "unwrap"]).optional().describe("Unwrap method (default: smart)"),
    },
  },

  // ==================== Scene & Render (6) ====================
  {
    name: "blender.set_camera",
    description: "Add or configure a camera in the Blender scene.",
    schema: {
      name: z.string().optional().describe("Camera name"),
      location: z.array(z.number()).optional().describe("Position [x, y, z]"),
      rotation: z.array(z.number()).optional().describe("Rotation in degrees [x, y, z]"),
      focal_length: z.number().optional().describe("Focal length in mm (default: 50)"),
    },
  },
  {
    name: "blender.set_light",
    description: "Add or configure a light (SUN, POINT, SPOT, AREA).",
    schema: {
      name: z.string().optional().describe("Light name"),
      type: z.enum(["SUN", "POINT", "SPOT", "AREA"]).optional().describe("Light type"),
      location: z.array(z.number()).optional().describe("Position [x, y, z]"),
      energy: z.number().optional().describe("Light energy/intensity"),
      color: z.array(z.number()).optional().describe("Light color [r, g, b]"),
    },
  },
  {
    name: "blender.render_image",
    description: "Render an image from the active camera.",
    schema: {
      filepath: z.string().optional().describe("Output file path (default: //render.png)"),
      resolution_x: z.number().optional().describe("Width (default: 1920)"),
      resolution_y: z.number().optional().describe("Height (default: 1080)"),
      samples: z.number().optional().describe("Render samples (default: 64)"),
    },
  },
  {
    name: "blender.set_render_settings",
    description: "Configure render engine and resolution (EEVEE, CYCLES, WORKBENCH).",
    schema: {
      engine: z.enum(["EEVEE", "CYCLES", "WORKBENCH"]).optional().describe("Render engine"),
      resolution_x: z.number().optional().describe("Width"),
      resolution_y: z.number().optional().describe("Height"),
      samples: z.number().optional().describe("Render samples"),
    },
  },
  {
    name: "blender.get_scene_objects",
    description: "List all objects in the Blender scene with type and location.",
    schema: {},
  },
  {
    name: "blender.get_object_properties",
    description: "Get detailed properties of a Blender object (vertices, faces, materials, etc.).",
    schema: { name: z.string().describe("Object name") },
  },
  {
    name: "blender.get_blender_info",
    description: "Get Blender version, current file, object count, and collection info.",
    schema: {},
  },

  // ==================== Export (4) ====================
  {
    name: "blender.export_gltf",
    description: "Export Blender scene or selection as GLTF/GLB file.",
    schema: {
      filepath: z.string().describe("Output file path (.gltf or .glb)"),
      selected_only: z.boolean().optional().describe("Export only selected objects"),
    },
  },
  {
    name: "blender.export_for_godot",
    description: "Export Blender scene optimized for Godot (GLB format, Y-up, applied transforms).",
    schema: { filepath: z.string().describe("Output .glb file path") },
  },
  {
    name: "blender.export_with_animations",
    description: "Export GLTF/GLB with animations and armatures included.",
    schema: { filepath: z.string().describe("Output .glb file path") },
  },
  {
    name: "blender.export_fbx",
    description: "Export scene as FBX.",
    schema: {
      filepath: z.string().describe("Output .fbx file path"),
      selected_only: z.boolean().optional().describe("Export only selected objects"),
    },
  },

  // ==================== Collision (1) ====================
  {
    name: "blender.generate_collision_hints",
    description: "Create collision hint objects for Godot import (adds -col, -colonly, -trimesh suffixed duplicates that Godot auto-detects).",
    schema: {
      name: z.string().describe("Object name to create collision for"),
      type: z.enum(["convex", "collision_only", "convex_only", "trimesh"]).optional().describe("Collision type (default: convex)"),
    },
  },

  // ==================== Script (1) ====================
  {
    name: "blender.execute_python",
    description: 'Execute arbitrary Python/bpy code in Blender. Use _result = "text" to return output.',
    schema: { code: z.string().describe("Python code to execute") },
  },
];

/**
 * Map full tool name (blender.create_mesh) to handler name (create_mesh).
 */
export function blenderHandlerName(toolName: string): string {
  return toolName.replace("blender.", "");
}
