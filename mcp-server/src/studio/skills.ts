import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface SkillInfo {
  name: string;
  description: string;
  content: string;
}

/** Load all skills from .claude/skills/{name}/SKILL.md, with optional bundled defaults */
export function loadSkills(claudeDir: string, defaultsClaudeDir?: string): SkillInfo[] {
  const map = new Map<string, SkillInfo>();

  // Load bundled defaults first (skip audience: internal)
  if (defaultsClaudeDir) {
    for (const s of loadSkillsFromDir(join(defaultsClaudeDir, "skills"), true)) {
      map.set(s.name, s);
    }
  }

  // User overrides
  for (const s of loadSkillsFromDir(join(claudeDir, "skills"), false)) {
    map.set(s.name, s);
  }

  return Array.from(map.values());
}

function loadSkillsFromDir(skillsDir: string, filterInternal: boolean): SkillInfo[] {
  if (!existsSync(skillsDir)) return [];

  try {
    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    const skills: SkillInfo[] = [];
    for (const dir of dirs) {
      const skillFile = join(skillsDir, dir.name, "SKILL.md");
      if (!existsSync(skillFile)) continue;

      const raw = readFileSync(skillFile, "utf-8");
      const parsed = parseFrontmatter(raw);
      if (!parsed.frontmatter.user_invocable) continue;
      if (filterInternal && parsed.frontmatter.audience === "internal") continue;

      skills.push({
        name: (parsed.frontmatter.name as string) || dir.name,
        description: (parsed.frontmatter.description as string) || "",
        content: parsed.body,
      });
    }

    return skills;
  } catch {
    return [];
  }
}

/**
 * Find a skill by name.
 */
export function resolveSkill(skills: SkillInfo[], name: string): SkillInfo | null {
  return skills.find((s) => s.name === name) || null;
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };

  const frontmatter: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value: unknown = line.slice(idx + 1).trim();
    if (value === "true") value = true;
    else if (value === "false") value = false;
    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2].trim() };
}
