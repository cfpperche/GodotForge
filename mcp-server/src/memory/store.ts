import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join } from "path";

const GODOTFORGE_DIR = ".godotforge";
const MEMORY_FILE = "memory.md";
const SESSIONS_DIR = "sessions";

const MEMORY_TEMPLATE = `# GodotForge Project Memory

## Conventions


## Patterns


## Decisions


## Architecture

`;

export function ensureGodotForgeDir(projectRoot: string): string {
  const dir = join(projectRoot, GODOTFORGE_DIR);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, SESSIONS_DIR), { recursive: true });

  const memoryPath = join(dir, MEMORY_FILE);
  if (!existsSync(memoryPath)) {
    writeFileSync(memoryPath, MEMORY_TEMPLATE, "utf-8");
  }

  return dir;
}

export function getMemoryPath(projectRoot: string): string {
  return join(projectRoot, GODOTFORGE_DIR, MEMORY_FILE);
}

export function readMemory(projectRoot: string): string {
  const path = getMemoryPath(projectRoot);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf-8");
}

export function appendMemory(
  projectRoot: string,
  category: string,
  content: string
): void {
  ensureGodotForgeDir(projectRoot);
  const path = getMemoryPath(projectRoot);
  const existing = readFileSync(path, "utf-8");
  const timestamp = new Date().toISOString();
  const entry = `- [${timestamp}] ${content}`;

  // Find the category section and append
  const sectionHeader = `## ${category}`;
  const sectionIndex = existing.indexOf(sectionHeader);

  if (sectionIndex === -1) {
    // Category doesn't exist — append new section at the end
    appendFileSync(path, `\n${sectionHeader}\n\n${entry}\n`, "utf-8");
  } else {
    // Find the next section header or end of file
    const afterHeader = sectionIndex + sectionHeader.length;
    const nextSection = existing.indexOf("\n## ", afterHeader);
    const insertAt = nextSection === -1 ? existing.length : nextSection;

    // Insert entry before next section
    const before = existing.slice(0, insertAt).trimEnd();
    const after = existing.slice(insertAt);
    writeFileSync(path, `${before}\n${entry}\n${after}`, "utf-8");
  }

  // Enforce 50KB cap
  enforceMemoryCap(projectRoot);
}

export function appendSessionLog(
  projectRoot: string,
  role: string,
  content: string
): void {
  ensureGodotForgeDir(projectRoot);
  const today = new Date().toISOString().split("T")[0];
  const logPath = join(
    projectRoot,
    GODOTFORGE_DIR,
    SESSIONS_DIR,
    `${today}.md`
  );

  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const entry = `**[${timestamp}] ${role}:** ${content.slice(0, 500)}\n\n`;

  if (!existsSync(logPath)) {
    writeFileSync(
      logPath,
      `# Session Log — ${today}\n\n${entry}`,
      "utf-8"
    );
  } else {
    appendFileSync(logPath, entry, "utf-8");
  }
}

export function getSessionLog(projectRoot: string, date?: string): string {
  const day = date || new Date().toISOString().split("T")[0];
  const logPath = join(
    projectRoot,
    GODOTFORGE_DIR,
    SESSIONS_DIR,
    `${day}.md`
  );
  if (!existsSync(logPath)) return "";
  return readFileSync(logPath, "utf-8");
}

export function getMemorySize(projectRoot: string): number {
  const path = getMemoryPath(projectRoot);
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf-8").length;
}

const MEMORY_CAP_BYTES = 50 * 1024; // 50KB

/**
 * Check if memory exceeds 50KB cap. If so, archive old content.
 * Keeps the most recent entries in each category.
 */
export function enforceMemoryCap(projectRoot: string): boolean {
  const path = getMemoryPath(projectRoot);
  if (!existsSync(path)) return false;

  const content = readFileSync(path, "utf-8");
  if (content.length <= MEMORY_CAP_BYTES) return false;

  // Archive the full file
  const dir = join(projectRoot, GODOTFORGE_DIR);
  const archiveDir = join(dir, "archive");
  mkdirSync(archiveDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = join(archiveDir, `memory-${timestamp}.md`);
  writeFileSync(archivePath, content, "utf-8");

  // Keep only the last N entries per category (trim to ~25KB)
  const trimmed = trimMemory(content, MEMORY_CAP_BYTES / 2);
  writeFileSync(path, trimmed, "utf-8");

  return true;
}

/**
 * Trim memory content by keeping only recent entries per section.
 */
export function trimMemory(content: string, targetSize: number): string {
  const sections = content.split(/(?=^## )/m);
  const header = sections[0] || "";
  const categorySections = sections.slice(1);

  const trimmedSections: string[] = [header.trim()];

  for (const section of categorySections) {
    const lines = section.split("\n");
    const sectionHeader = lines[0];
    const entries = lines.slice(1).filter((l) => l.startsWith("- ["));

    // Keep the last half of entries
    const keepCount = Math.max(Math.ceil(entries.length / 2), 5);
    const keptEntries = entries.slice(-keepCount);

    trimmedSections.push(`${sectionHeader}\n\n${keptEntries.join("\n")}\n`);
  }

  let result = trimmedSections.join("\n");

  // If still too large, hard truncate
  if (result.length > targetSize) {
    result = result.slice(-targetSize);
    result = "# GodotForge Project Memory\n\n[Archived — older entries moved to .godotforge/archive/]\n\n" + result;
  }

  return result;
}
