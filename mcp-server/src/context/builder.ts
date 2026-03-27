import { readMemory, getSessionLog } from "../memory/store.js";
import { getRecentMemory, ensureMemoryDb } from "../memory/search.js";
import { scanProject } from "./scanner.js";
import type { GodotBridge } from "../bridge.js";

const TOKEN_BUDGET = 8000;
const CHARS_PER_TOKEN = 4; // rough estimate
const MAX_CHARS = TOKEN_BUDGET * CHARS_PER_TOKEN;

interface ContextBudget {
  memory: number;
  structure: number;
  scene: number;
  session: number;
}

const DEFAULT_BUDGET: ContextBudget = {
  memory: 3000 * CHARS_PER_TOKEN,   // 3000 tokens
  structure: 2000 * CHARS_PER_TOKEN, // 2000 tokens
  scene: 1500 * CHARS_PER_TOKEN,     // 1500 tokens
  session: 1500 * CHARS_PER_TOKEN,   // 1500 tokens
};

export async function buildContext(
  projectRoot: string,
  bridge?: GodotBridge
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

  // 4. Recent session log
  const sessionSection = buildSessionSection(projectRoot, DEFAULT_BUDGET.session);
  if (sessionSection) sections.push(sessionSection);

  const context = sections.join("\n\n");

  // Enforce total budget
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

function buildSessionSection(projectRoot: string, maxChars: number): string | null {
  const log = getSessionLog(projectRoot);
  if (!log || log.trim().length < 20) return null;

  // Take the tail of the log (most recent entries)
  const truncated = log.length > maxChars ? log.slice(-maxChars) : log;
  return `<recent-session>\n${truncated}\n</recent-session>`;
}
