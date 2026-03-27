import { readdirSync, statSync, readFileSync, existsSync, writeFileSync } from "fs";
import { join, relative, extname } from "path";

export interface ProjectMap {
  project_name: string;
  godot_version: string;
  scenes: string[];
  scripts: string[];
  resources: string[];
  autoloads: Record<string, string>;
  scan_time: string;
}

const CACHE_FILE = ".godotforge/project-map.json";
const SKIP_DIRS = new Set([".godot", ".godotforge", "addons", ".git", "node_modules", ".claude"]);

export function scanProject(projectRoot: string): ProjectMap {
  const cached = readCachedMap(projectRoot);
  if (cached) return cached;

  const map: ProjectMap = {
    project_name: "",
    godot_version: "",
    scenes: [],
    scripts: [],
    resources: [],
    autoloads: {},
    scan_time: new Date().toISOString(),
  };

  // Parse project.godot
  const projectFile = join(projectRoot, "project.godot");
  if (existsSync(projectFile)) {
    const content = readFileSync(projectFile, "utf-8");

    const nameMatch = content.match(/config\/name="([^"]+)"/);
    if (nameMatch) map.project_name = nameMatch[1];

    const versionMatch = content.match(/config\/features=PackedStringArray\("([^"]+)"/);
    if (versionMatch) map.godot_version = versionMatch[1];

    // Parse autoloads
    const autoloadRegex = /(\w+)="(\*?res:\/\/[^"]+)"/g;
    let match;
    while ((match = autoloadRegex.exec(content)) !== null) {
      if (content.indexOf("[autoload]") !== -1) {
        map.autoloads[match[1]] = match[2].replace("*", "");
      }
    }
  }

  // Walk project tree
  walkDir(projectRoot, projectRoot, map);

  // Cache result
  const cachePath = join(projectRoot, CACHE_FILE);
  try {
    writeFileSync(cachePath, JSON.stringify(map, null, 2), "utf-8");
  } catch {
    // Cache write failure is non-critical
  }

  return map;
}

function walkDir(dir: string, root: string, map: ProjectMap): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (name.startsWith(".") && dir === root) continue;
    if (SKIP_DIRS.has(name)) continue;

    const fullPath = join(dir, name);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkDir(fullPath, root, map);
    } else {
      const relPath = relative(root, fullPath);
      const ext = extname(name);
      switch (ext) {
        case ".tscn":
          map.scenes.push(relPath);
          break;
        case ".gd":
          map.scripts.push(relPath);
          break;
        case ".tres":
        case ".res":
          map.resources.push(relPath);
          break;
      }
    }
  }
}

function readCachedMap(projectRoot: string): ProjectMap | null {
  const cachePath = join(projectRoot, CACHE_FILE);
  if (!existsSync(cachePath)) return null;

  try {
    const content = readFileSync(cachePath, "utf-8");
    const map = JSON.parse(content) as ProjectMap;

    // Cache valid for 5 minutes
    const scanTime = new Date(map.scan_time).getTime();
    if (Date.now() - scanTime > 5 * 60 * 1000) return null;

    return map;
  } catch {
    return null;
  }
}

export function invalidateCache(projectRoot: string): void {
  const cachePath = join(projectRoot, CACHE_FILE);
  try {
    if (existsSync(cachePath)) {
      const { unlinkSync } = require("fs");
      unlinkSync(cachePath);
    }
  } catch {
    // Non-critical
  }
}
