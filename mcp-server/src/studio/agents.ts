import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "./frontmatter.js";

export interface AgentInfo {
  name: string;
  description: string;
  content: string;
}

/**
 * Load all agents from .claude/agents/*.md, with optional bundled defaults.
 */
export function loadAgents(claudeDir: string, defaultsClaudeDir?: string): AgentInfo[] {
  const map = new Map<string, AgentInfo>();

  // Load bundled defaults first
  if (defaultsClaudeDir) {
    for (const a of loadAgentsFromDir(join(defaultsClaudeDir, "agents"))) {
      map.set(a.name, a);
    }
  }

  // User overrides
  for (const a of loadAgentsFromDir(join(claudeDir, "agents"))) {
    map.set(a.name, a);
  }

  return Array.from(map.values());
}

function loadAgentsFromDir(agentsDir: string): AgentInfo[] {
  if (!existsSync(agentsDir)) return [];

  try {
    const files = readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    const agents: AgentInfo[] = [];

    for (const file of files) {
      const raw = readFileSync(join(agentsDir, file), "utf-8");
      const parsed = parseFrontmatter(raw);

      agents.push({
        name: (parsed.frontmatter.name as string) || file.replace(".md", ""),
        description: (parsed.frontmatter.description as string) || "",
        content: parsed.body,
      });
    }

    return agents;
  } catch {
    return [];
  }
}

/**
 * Find an agent by name (exact match or partial).
 */
export function resolveAgent(agents: AgentInfo[], name: string): AgentInfo | null {
  return agents.find((a) => a.name === name) || agents.find((a) => a.name.includes(name)) || null;
}

