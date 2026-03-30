import { describe, it, expect } from "vitest";
import {
  extractGodotClasses,
  isLikelyGodotClass,
  extractBpyClasses,
  buildCompactClassDoc,
  buildCompactBpyDoc,
} from "./builder.js";

describe("extractGodotClasses", () => {
  it("extracts classes with 2D/3D suffixes", () => {
    const result = extractGodotClasses("Use a CharacterBody2D with Sprite2D child");
    expect(result).toContain("CharacterBody2D");
    expect(result).toContain("Sprite2D");
  });

  it("extracts known exact classes", () => {
    const result = extractGodotClasses("Load a PackedScene via SceneTree");
    expect(result).toContain("PackedScene");
    expect(result).toContain("SceneTree");
  });

  it("filters common English words", () => {
    const result = extractGodotClasses("Create a new Scene with this Script");
    expect(result).not.toContain("Create");
    expect(result).not.toContain("Scene");
    expect(result).not.toContain("Script");
  });

  it("returns empty for non-Godot text", () => {
    const result = extractGodotClasses("hello world this is plain text");
    expect(result).toHaveLength(0);
  });

  it("deduplicates class names", () => {
    const result = extractGodotClasses("Node2D and Node2D again Node2D");
    const count = result.filter((c) => c === "Node2D").length;
    expect(count).toBe(1);
  });
});

describe("isLikelyGodotClass", () => {
  it("recognizes suffix-based classes", () => {
    expect(isLikelyGodotClass("CollisionShape2D")).toBe(true);
    expect(isLikelyGodotClass("MeshInstance3D")).toBe(true);
    expect(isLikelyGodotClass("AudioStreamPlayer")).toBe(true);
  });

  it("recognizes prefix-based classes", () => {
    expect(isLikelyGodotClass("RigidBody")).toBe(true);
    expect(isLikelyGodotClass("AnimatedSprite")).toBe(true);
    expect(isLikelyGodotClass("CharacterBody")).toBe(true);
  });

  it("recognizes known exact classes", () => {
    expect(isLikelyGodotClass("PackedScene")).toBe(true);
    expect(isLikelyGodotClass("Tween")).toBe(true);
    expect(isLikelyGodotClass("Timer")).toBe(true);
    expect(isLikelyGodotClass("EditorInterface")).toBe(true);
  });

  it("rejects non-Godot names", () => {
    expect(isLikelyGodotClass("MyCustomThing")).toBe(false);
    expect(isLikelyGodotClass("HttpServer")).toBe(false);
    expect(isLikelyGodotClass("UserProfile")).toBe(false);
  });
});

describe("extractBpyClasses", () => {
  it("extracts bpy.types references", () => {
    const result = extractBpyClasses("Use bpy.types.Mesh and bpy.types.Material");
    expect(result).toContain("Mesh");
    expect(result).toContain("Material");
  });

  it("extracts known bpy classes by name", () => {
    const result = extractBpyClasses("Create an armature with bones for the character");
    expect(result).toContain("Armature");
    expect(result).toContain("Bone");
  });

  it("returns empty for unrelated text", () => {
    const result = extractBpyClasses("how do I print hello there");
    expect(result).toHaveLength(0);
  });
});

describe("buildCompactClassDoc", () => {
  it("formats class header with inheritance", () => {
    const doc = buildCompactClassDoc({
      name: "Sprite2D",
      inherits: "Node2D",
      brief_description: "A 2D sprite node",
      properties: [{ name: "texture", type: "Texture2D", default_value: "" }],
      methods: [{ name: "set_texture", return_type: "void", params: [{ name: "tex", type: "Texture2D" }] }],
      signals: [{ name: "texture_changed", params: [] }],
    });

    expect(doc).toContain("## Sprite2D (extends Node2D)");
    expect(doc).toContain("texture: Texture2D");
    expect(doc).toContain("set_texture(tex: Texture2D) -> void");
    expect(doc).toContain("texture_changed()");
  });

  it("truncates properties at 15", () => {
    const props = Array.from({ length: 20 }, (_, i) => ({
      name: `prop_${i}`, type: "int", default_value: "",
    }));
    const doc = buildCompactClassDoc({
      name: "Big", inherits: "Node", brief_description: "",
      properties: props, methods: [], signals: [],
    });
    expect(doc).toContain("... +5 more");
  });

  it("truncates methods at 20", () => {
    const methods = Array.from({ length: 25 }, (_, i) => ({
      name: `method_${i}`, return_type: "void", params: [],
    }));
    const doc = buildCompactClassDoc({
      name: "Big", inherits: "Node", brief_description: "",
      properties: [], methods, signals: [],
    });
    expect(doc).toContain("... +5 more");
  });

  it("omits empty sections", () => {
    const doc = buildCompactClassDoc({
      name: "Empty", inherits: "Node", brief_description: "",
      properties: [], methods: [], signals: [],
    });
    expect(doc).not.toContain("Properties:");
    expect(doc).not.toContain("Methods:");
    expect(doc).not.toContain("Signals:");
  });
});

describe("buildCompactBpyDoc", () => {
  it("formats bpy class reference", () => {
    const doc = buildCompactBpyDoc({
      name: "Mesh",
      inherits: "ID",
      description: "Mesh data-block",
      properties: [{ name: "vertices", type: "MeshVertices", description: "Vertex collection" }],
      methods: [{ name: "update", signature: "(calc_edges=False)", description: "Update mesh" }],
    });

    expect(doc).toContain("## bpy.types.Mesh (extends ID)");
    expect(doc).toContain("vertices: MeshVertices");
    expect(doc).toContain("update(calc_edges=False)");
  });

  it("truncates properties at 12", () => {
    const props = Array.from({ length: 15 }, (_, i) => ({
      name: `p${i}`, type: "float", description: "desc",
    }));
    const doc = buildCompactBpyDoc({
      name: "Big", inherits: "ID", description: "",
      properties: props, methods: [],
    });
    expect(doc).toContain("... +3 more");
  });
});
