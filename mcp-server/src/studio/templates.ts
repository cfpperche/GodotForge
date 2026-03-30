import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface TemplateInfo {
  name: string;
  content: string;
}

/**
 * Load all templates from .claude/templates/*.md, with optional bundled defaults.
 */
export function loadTemplates(claudeDir: string, defaultsClaudeDir?: string): TemplateInfo[] {
  const map = new Map<string, TemplateInfo>();

  // Load bundled defaults first
  if (defaultsClaudeDir) {
    for (const t of loadTemplatesFromDir(join(defaultsClaudeDir, "templates"))) {
      map.set(t.name, t);
    }
  }

  // User overrides
  for (const t of loadTemplatesFromDir(join(claudeDir, "templates"))) {
    map.set(t.name, t);
  }

  return Array.from(map.values());
}

function loadTemplatesFromDir(templatesDir: string): TemplateInfo[] {
  if (!existsSync(templatesDir)) return [];

  try {
    const files = readdirSync(templatesDir).filter((f) => f.endsWith(".md"));
    return files.map((file) => ({
      name: file.replace(".md", ""),
      content: readFileSync(join(templatesDir, file), "utf-8").trim(),
    }));
  } catch {
    return [];
  }
}

/**
 * Find a template by name (exact or partial match).
 */
export function resolveTemplate(templates: TemplateInfo[], name: string): TemplateInfo | null {
  return templates.find((t) => t.name === name) || templates.find((t) => t.name.includes(name)) || null;
}
