import { existsSync, readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { loadSkills, resolveSkill } from "../studio/skills.js";
import { loadAgents, resolveAgent } from "../studio/agents.js";
import { loadTemplates, resolveTemplate } from "../studio/templates.js";

/** Extract audience field from rule frontmatter. */
function parseAudience(raw: string): string | null {
  const match = raw.match(/^---\r?\n[\s\S]*?audience:\s*(\S+)[\s\S]*?\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Load rules from bundled game-dev kit + user's project .claude/rules/.
 * Bundled rules with audience: internal are excluded.
 * User rules always included (override bundled by filename).
 */
export function loadCopilotRules(root: string, repoRoot: string): string | null {
  const bundledDir = join(repoRoot, ".claude", "rules");
  const userDir = join(root, ".claude", "rules");
  const isSameProject = resolve(bundledDir) === resolve(userDir);

  const ruleMap = new Map<string, string>();

  try {
    if (!isSameProject && existsSync(bundledDir)) {
      for (const file of readdirSync(bundledDir).filter((f) => f.endsWith(".md"))) {
        const raw = readFileSync(join(bundledDir, file), "utf-8").trim();
        if (!raw) continue;
        if (parseAudience(raw) === "internal") continue;
        ruleMap.set(file, raw);
      }
    }

    if (existsSync(userDir)) {
      for (const file of readdirSync(userDir).filter((f) => f.endsWith(".md"))) {
        const raw = readFileSync(join(userDir, file), "utf-8").trim();
        if (raw) ruleMap.set(file, raw);
      }
    }
  } catch {
    return null;
  }

  if (ruleMap.size === 0) return null;
  return Array.from(ruleMap.values()).join("\n\n---\n\n");
}

/** Get bundled .claude dir from GodotForge install (undefined if same as project). */
export function getBundledClaudeDir(root: string, repoRoot: string): string | undefined {
  const bundled = join(repoRoot, ".claude");
  return bundled !== join(root, ".claude") ? bundled : undefined;
}

/**
 * Resolve skill, agent, and template context for a message.
 * Detects /skill-name commands, matches agents by task, and injects templates.
 */
export function resolveStudioContext(message: string, root: string, repoRoot: string): string {
  const claudeDir = join(root, ".claude");
  const bundledDir = resolve(claudeDir) !== resolve(join(repoRoot, ".claude")) ? join(repoRoot, ".claude") : undefined;
  const parts: string[] = [];

  const skillMatch = message.match(/^\/([a-z][\w-]*)/);
  if (skillMatch) {
    const skills = loadSkills(claudeDir, bundledDir);
    const skill = resolveSkill(skills, skillMatch[1]);
    if (skill) {
      parts.push(`<active-skill name="${skill.name}">\n${skill.content}\n</active-skill>`);

      const agentRefs = skill.content.match(/@([a-z][\w-]+)/g);
      if (agentRefs) {
        const agents = loadAgents(claudeDir, bundledDir);
        const injected = new Set<string>();
        for (const ref of agentRefs) {
          const agentName = ref.slice(1);
          const agent = resolveAgent(agents, agentName);
          if (agent && !injected.has(agent.name)) {
            injected.add(agent.name);
            parts.push(`<agent-profile name="${agent.name}">\n${agent.content}\n</agent-profile>`);
          }
        }
      }

      const templateRefs = skill.content.match(/`([a-z][\w-]+\.md)`/g);
      if (templateRefs) {
        const templates = loadTemplates(claudeDir, bundledDir);
        for (const ref of templateRefs) {
          const tplName = ref.replace(/`/g, "").replace(".md", "");
          const tpl = resolveTemplate(templates, tplName);
          if (tpl) {
            parts.push(`<template name="${tpl.name}">\n${tpl.content}\n</template>`);
          }
        }
      }
    }
  }

  if (!skillMatch) {
    const skills = loadSkills(claudeDir, bundledDir);
    if (skills.length > 0) {
      const list = skills.map((s) => `- /${s.name}: ${s.description}`).join("\n");
      parts.push(`<available-skills>\nUsers can invoke these skills by typing the command:\n${list}\n</available-skills>`);
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : "";
}
