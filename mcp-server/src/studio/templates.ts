import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface TemplateInfo {
  name: string;
  content: string;
}

/**
 * Load all templates from .claude/templates/*.md
 */
export function loadTemplates(claudeDir: string): TemplateInfo[] {
  const templatesDir = join(claudeDir, "templates");
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
