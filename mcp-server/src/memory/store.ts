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
