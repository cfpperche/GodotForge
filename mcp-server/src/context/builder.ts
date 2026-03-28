import { readMemory, getSessionLog } from "../memory/store.js";
import { getRecentMemory, ensureMemoryDb } from "../memory/search.js";
import { scanProject } from "./scanner.js";
import { ensureDocsReady, detectGodotVersion } from "../docs/indexer.js";
import { getClassReference } from "../docs/search.js";
import { ensureBlenderDocs, getBlenderClassReference } from "../docs/blender-docs.js";
import type { GodotBridge } from "../bridge.js";

const TOKEN_BUDGET = 12000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = TOKEN_BUDGET * CHARS_PER_TOKEN;

interface ContextBudget {
  memory: number;
  structure: number;
  scene: number;
  session: number;
  godotDocs: number;
  blenderDocs: number;
}

const DEFAULT_BUDGET: ContextBudget = {
  memory: 2500 * CHARS_PER_TOKEN,
  structure: 1500 * CHARS_PER_TOKEN,
  scene: 1500 * CHARS_PER_TOKEN,
  session: 1500 * CHARS_PER_TOKEN,
  godotDocs: 2500 * CHARS_PER_TOKEN,
  blenderDocs: 2500 * CHARS_PER_TOKEN,
};

/**
 * Build context with optional message for docs auto-detection.
 * When a user message is provided, we extract Godot class names and
 * pre-load their docs into context so the LLM doesn't need to call search_docs.
 */
export async function buildContext(
  projectRoot: string,
  bridge?: GodotBridge,
  userMessage?: string
): Promise<string> {
  const sections: string[] = [];

  // 1. Project memory (highest priority)
  const memorySection = buildMemorySection(projectRoot, DEFAULT_BUDGET.memory);
  if (memorySection) sections.push(memorySection);

  // 2. Project structure
  const structureSection = buildStructureSection(projectRoot, DEFAULT_BUDGET.structure);
  if (structureSection) sections.push(structureSection);

  // 3. Current scene tree (via bridge, if available)
  if (bridge) {
    const sceneSection = await buildSceneSection(bridge, DEFAULT_BUDGET.scene);
    if (sceneSection) sections.push(sceneSection);
  }

  // 4. Auto-detected Godot docs (RAG injection)
  const godotDocsSection = await buildGodotDocsSection(projectRoot, userMessage, DEFAULT_BUDGET.godotDocs);
  if (godotDocsSection) sections.push(godotDocsSection);

  // 5. Auto-detected Blender docs (RAG injection)
  const blenderDocsSection = await buildBlenderDocsSection(userMessage, DEFAULT_BUDGET.blenderDocs);
  if (blenderDocsSection) sections.push(blenderDocsSection);

  // 6. Recent session log
  const sessionSection = buildSessionSection(projectRoot, DEFAULT_BUDGET.session);
  if (sessionSection) sections.push(sessionSection);

  const context = sections.join("\n\n");

  if (context.length > MAX_CHARS) {
    return context.slice(0, MAX_CHARS) + "\n\n[Context truncated to fit token budget]";
  }

  return context;
}

function buildMemorySection(projectRoot: string, maxChars: number): string | null {
  const memory = readMemory(projectRoot);
  if (!memory || memory.trim().length < 50) return null;

  const truncated = memory.slice(0, maxChars);
  return `<project-memory>\n${truncated}\n</project-memory>`;
}

function buildStructureSection(projectRoot: string, maxChars: number): string | null {
  const map = scanProject(projectRoot);

  const lines: string[] = [
    `<project-structure>`,
    `Project: ${map.project_name} (Godot ${map.godot_version})`,
  ];

  if (map.scenes.length > 0) {
    lines.push(`Scenes (${map.scenes.length}):`);
    for (const scene of map.scenes.slice(0, 20)) {
      lines.push(`  - ${scene}`);
    }
    if (map.scenes.length > 20) lines.push(`  ... and ${map.scenes.length - 20} more`);
  }

  if (map.scripts.length > 0) {
    lines.push(`Scripts (${map.scripts.length}):`);
    for (const script of map.scripts.slice(0, 20)) {
      lines.push(`  - ${script}`);
    }
    if (map.scripts.length > 20) lines.push(`  ... and ${map.scripts.length - 20} more`);
  }

  if (Object.keys(map.autoloads).length > 0) {
    lines.push(`Autoloads:`);
    for (const [name, path] of Object.entries(map.autoloads)) {
      lines.push(`  - ${name}: ${path}`);
    }
  }

  lines.push(`</project-structure>`);

  const result = lines.join("\n");
  return result.length <= maxChars ? result : result.slice(0, maxChars);
}

async function buildSceneSection(
  bridge: GodotBridge,
  maxChars: number
): Promise<string | null> {
  try {
    const sceneTree = await bridge.getSceneTree();
    if (!sceneTree.result || sceneTree.result.includes("No scene")) return null;

    const section = `<current-scene>\n${sceneTree.result.slice(0, maxChars - 40)}\n</current-scene>`;
    return section;
  } catch {
    return null;
  }
}

/**
 * Auto-detect Godot class names from user message + recent session,
 * then pre-load their docs into context.
 */
async function buildGodotDocsSection(
  projectRoot: string,
  userMessage: string | undefined,
  maxChars: number
): Promise<string | null> {
  // Collect text to scan for class names
  const textToScan = userMessage || "";

  // Also scan recent session for class context
  const sessionLog = getSessionLog(projectRoot);
  const recentSession = sessionLog ? sessionLog.slice(-2000) : "";

  const fullText = `${textToScan}\n${recentSession}`;

  // Extract Godot class names (PascalCase, known patterns)
  const classNames = extractGodotClasses(fullText);

  if (classNames.length === 0) return null;

  try {
    const ver = detectGodotVersion(projectRoot) || "4.3";
    const db = await ensureDocsReady(ver);

    const docs: string[] = [`<godot-docs hint="Auto-detected from conversation. Use these as reference.">`];
    let totalChars = 0;

    // Limit to top 5 most relevant classes to stay within budget
    for (const className of classNames.slice(0, 5)) {
      const ref = getClassReference(db, className);
      if (!ref) continue;

      // Build compact reference (not full dump)
      const compactDoc = buildCompactClassDoc(ref);
      if (totalChars + compactDoc.length > maxChars - 100) break;

      docs.push(compactDoc);
      totalChars += compactDoc.length;
    }

    if (docs.length <= 1) return null; // Only the opening tag, no docs found

    docs.push(`</godot-docs>`);
    return docs.join("\n");
  } catch {
    return null;
  }
}

/**
 * Extract Godot class names from text using known patterns.
 * Matches PascalCase words that look like Godot classes (Node2D, CharacterBody3D, etc.)
 */
function extractGodotClasses(text: string): string[] {
  const classPattern = /\b([A-Z][a-zA-Z]*(?:2D|3D|Body|Shape|Light|Mesh|Material|Camera|Timer|Area|Sprite|Label|Button|Panel|Control|Texture|Resource|Animation|Collision|Audio|Path|Ray|Bone|Skeleton|Armature|Environment|Viewport|Canvas|Tween|Signal|Stream|Player)?(?:2D|3D)?)\b/g;

  const matches = new Set<string>();
  let match;

  while ((match = classPattern.exec(text)) !== null) {
    const name = match[1];
    // Filter: must be >= 4 chars, start with uppercase, not common English words
    if (name.length < 4) continue;
    if (COMMON_WORDS.has(name)) continue;
    // Must look like a Godot class (has 2D/3D suffix, or known prefix/suffix)
    if (isLikelyGodotClass(name)) {
      matches.add(name);
    }
  }

  return Array.from(matches);
}

const COMMON_WORDS = new Set([
  "This", "That", "With", "From", "Into", "What", "When", "Where", "Which",
  "Create", "Delete", "Update", "Build", "Make", "Move", "Copy", "Open",
  "Close", "Start", "Stop", "Play", "Save", "Load", "Find", "Search",
  "Press", "Click", "Type", "Enter", "Space", "Score", "Game", "Level",
  "Scene", "Script", "Error", "Warning", "True", "False", "Null", "None",
  "String", "Array", "Dictionary", "Vector", "Color", "Float", "Boolean",
]);

function isLikelyGodotClass(name: string): boolean {
  // Known suffixes
  const godotSuffixes = [
    "2D", "3D", "Node", "Body", "Shape", "Light", "Mesh", "Material",
    "Camera", "Timer", "Area", "Sprite", "Label", "Button", "Panel",
    "Control", "Texture", "Resource", "Animation", "Player", "Stream",
    "Collision", "Audio", "Path", "Ray", "Bone", "Skeleton", "Environment",
    "Viewport", "Canvas", "Tween", "Container", "Separator", "Slider",
    "Shader", "Particles", "Navigation", "TileMap", "TileSet",
  ];

  // Known prefixes
  const godotPrefixes = [
    "Character", "Rigid", "Static", "Kinematic", "Area", "Collision",
    "Mesh", "Multi", "Sprite", "Animated", "Camera", "Audio", "Animation",
    "Directional", "Omni", "Spot", "World", "Sub", "Packed", "Standard",
    "Visual", "Physical", "Ray", "Shape", "Box", "Sphere", "Capsule",
    "Cylinder", "Plane", "Rectangle", "Circle",
  ];

  for (const suffix of godotSuffixes) {
    if (name.endsWith(suffix) && name.length > suffix.length) return true;
  }
  for (const prefix of godotPrefixes) {
    if (name.startsWith(prefix) && name.length > prefix.length) return true;
  }

  // Known exact class names
  const knownClasses = new Set([
    "Node", "Resource", "Object", "RefCounted", "Tween", "Timer",
    "PackedScene", "SceneTree", "Viewport", "Window", "Theme",
    "InputEvent", "InputMap", "ProjectSettings", "EditorInterface",
    "ResourceLoader", "ResourceSaver", "FileAccess", "DirAccess",
    "ClassDB", "Engine", "OS", "DisplayServer", "RenderingServer",
    "PhysicsServer2D", "PhysicsServer3D", "NavigationServer2D", "NavigationServer3D",
    "GDScript", "Signal",
  ]);

  return knownClasses.has(name);
}

/**
 * Build a compact reference for a class — key methods, properties, signals.
 * Not the full dump, just what's needed for code generation.
 */
function buildCompactClassDoc(ref: {
  name: string;
  inherits: string;
  brief_description: string;
  methods: Array<{ name: string; return_type: string; params: Array<{ name: string; type: string }> }>;
  properties: Array<{ name: string; type: string; default_value: string }>;
  signals: Array<{ name: string; params: Array<{ name: string; type: string }> }>;
}): string {
  const lines: string[] = [];

  lines.push(`## ${ref.name} (extends ${ref.inherits})`);
  if (ref.brief_description) {
    lines.push(ref.brief_description.slice(0, 200));
  }

  // Properties (max 15)
  if (ref.properties.length > 0) {
    lines.push(`Properties:`);
    for (const p of ref.properties.slice(0, 15)) {
      const def = p.default_value ? ` = ${p.default_value}` : "";
      lines.push(`  ${p.name}: ${p.type}${def}`);
    }
    if (ref.properties.length > 15) lines.push(`  ... +${ref.properties.length - 15} more`);
  }

  // Key methods (max 20)
  if (ref.methods.length > 0) {
    lines.push(`Methods:`);
    for (const m of ref.methods.slice(0, 20)) {
      const params = m.params.map((p) => `${p.name}: ${p.type}`).join(", ");
      lines.push(`  ${m.name}(${params}) -> ${m.return_type}`);
    }
    if (ref.methods.length > 20) lines.push(`  ... +${ref.methods.length - 20} more`);
  }

  // Signals
  if (ref.signals.length > 0) {
    lines.push(`Signals:`);
    for (const s of ref.signals) {
      const params = s.params.map((p) => `${p.name}: ${p.type}`).join(", ");
      lines.push(`  ${s.name}(${params})`);
    }
  }

  return lines.join("\n");
}

/**
 * Auto-detect Blender/bpy class names and inject docs.
 * Looks for bpy.types patterns (Object, Mesh, Material, etc.) and bpy.ops references.
 */
async function buildBlenderDocsSection(
  userMessage: string | undefined,
  maxChars: number
): Promise<string | null> {
  if (!userMessage) return null;

  // Only inject if message seems Blender-related
  const blenderKeywords = /\b(blender|bpy|mesh|material|armature|bone|sculpt|modifier|uv|unwrap|shader node|vertex|polygon|face|edge|weight paint|keyframe)\b/i;
  if (!blenderKeywords.test(userMessage)) return null;

  try {
    const db = await ensureBlenderDocs();

    // Extract bpy class names from message
    const bpyClasses = extractBpyClasses(userMessage);
    if (bpyClasses.length === 0) return null;

    const docs: string[] = [`<blender-docs hint="Auto-detected bpy API reference.">`];
    let totalChars = 0;

    for (const className of bpyClasses.slice(0, 4)) {
      const ref = getBlenderClassReference(db, className);
      if (!ref) continue;

      const compact = buildCompactBpyDoc(ref);
      if (totalChars + compact.length > maxChars - 100) break;

      docs.push(compact);
      totalChars += compact.length;
    }

    if (docs.length <= 1) return null;
    docs.push(`</blender-docs>`);
    return docs.join("\n");
  } catch {
    // Blender docs not indexed yet — silently skip
    return null;
  }
}

/**
 * Extract bpy type names from text.
 */
function extractBpyClasses(text: string): string[] {
  const matches = new Set<string>();

  // Match bpy.types.X patterns
  const typesPattern = /bpy\.types\.(\w+)/g;
  let m;
  while ((m = typesPattern.exec(text)) !== null) {
    matches.add(m[1]);
  }

  // Match known bpy class names mentioned directly
  const knownBpyClasses = [
    "Object", "Mesh", "MeshVertex", "MeshEdge", "MeshPolygon",
    "Material", "ShaderNode", "NodeTree", "Image",
    "Armature", "Bone", "EditBone", "PoseBone",
    "Action", "FCurve", "Keyframe",
    "Camera", "Light", "PointLight", "SunLight", "SpotLight", "AreaLight",
    "Collection", "Scene", "World",
    "Modifier", "MirrorModifier", "SubsurfModifier", "BooleanModifier",
    "Particle", "ParticleSystem",
    "Constraint", "CopyLocationConstraint",
    "Driver", "DriverVariable",
    "UVMap", "VertexGroup", "ShapeKey",
  ];

  const textLower = text.toLowerCase();
  for (const cls of knownBpyClasses) {
    if (textLower.includes(cls.toLowerCase())) {
      matches.add(cls);
    }
  }

  return Array.from(matches);
}

function buildCompactBpyDoc(ref: {
  name: string;
  inherits: string;
  description: string;
  properties: Array<{ name: string; type: string; description: string }>;
  methods: Array<{ name: string; signature: string; description: string }>;
}): string {
  const lines: string[] = [];

  lines.push(`## bpy.types.${ref.name} (extends ${ref.inherits})`);
  if (ref.description) lines.push(ref.description.slice(0, 200));

  if (ref.properties.length > 0) {
    lines.push(`Properties:`);
    for (const p of ref.properties.slice(0, 12)) {
      lines.push(`  ${p.name}: ${p.type || "?"} — ${p.description.slice(0, 80)}`);
    }
    if (ref.properties.length > 12) lines.push(`  ... +${ref.properties.length - 12} more`);
  }

  if (ref.methods.length > 0) {
    lines.push(`Methods:`);
    for (const m of ref.methods.slice(0, 12)) {
      lines.push(`  ${m.name}${m.signature || "()"} — ${m.description.slice(0, 80)}`);
    }
    if (ref.methods.length > 12) lines.push(`  ... +${ref.methods.length - 12} more`);
  }

  return lines.join("\n");
}

function buildSessionSection(projectRoot: string, maxChars: number): string | null {
  const log = getSessionLog(projectRoot);
  if (!log || log.trim().length < 20) return null;

  const truncated = log.length > maxChars ? log.slice(-maxChars) : log;
  return `<recent-session>\n${truncated}\n</recent-session>`;
}
