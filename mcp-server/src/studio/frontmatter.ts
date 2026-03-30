/**
 * Shared frontmatter parser for skills, agents, and templates.
 */
export function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
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
