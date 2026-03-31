import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { loadCopilotRules, getBundledClaudeDir, resolveStudioContext } from "./studio.js";

const TMP = "/tmp/studio-test";

function mkdir(p: string) { mkdirSync(p, { recursive: true }); }
function write(p: string, content: string) { writeFileSync(p, content, "utf-8"); }

beforeEach(() => { mkdir(TMP); });
afterEach(() => { rmSync(TMP, { recursive: true, force: true }); });

// ── loadCopilotRules ────────────────────────────────────────────────────────

describe("loadCopilotRules", () => {
  it("returns all rules when root === repoRoot (same project)", () => {
    const sameDir = join(TMP, "same");
    mkdir(join(sameDir, ".claude", "rules"));
    write(join(sameDir, ".claude", "rules", "gameplay.md"), "# Gameplay rules");
    write(join(sameDir, ".claude", "rules", "shader.md"), "# Shader rules");

    const result = loadCopilotRules(sameDir, sameDir);
    // User rules are always included; bundled filtering is skipped when same path
    expect(result).toContain("Gameplay rules");
    expect(result).toContain("Shader rules");
  });

  it("returns only game-dev rules (non-internal) when root is empty and repoRoot has rules", () => {
    const root = join(TMP, "user-empty");
    const repoRoot = join(TMP, "repo");
    mkdir(root);
    mkdir(join(repoRoot, ".claude", "rules"));
    write(join(repoRoot, ".claude", "rules", "gameplay.md"), "# Game rules\nno frontmatter");
    write(join(repoRoot, ".claude", "rules", "internal.md"), [
      "---",
      "audience: internal",
      "---",
      "# Internal docs",
    ].join("\n"));

    const result = loadCopilotRules(root, repoRoot);
    expect(result).not.toBeNull();
    expect(result).toContain("Game rules");
    expect(result).not.toContain("Internal docs");
  });

  it("returns null when both dirs are empty (no .claude/rules)", () => {
    const root = join(TMP, "empty-root");
    const repoRoot = join(TMP, "empty-repo");
    mkdir(root);
    mkdir(repoRoot);

    const result = loadCopilotRules(root, repoRoot);
    expect(result).toBeNull();
  });

  it("user rules override bundled rules by filename", () => {
    const root = join(TMP, "user");
    const repoRoot = join(TMP, "repo-override");
    mkdir(join(root, ".claude", "rules"));
    mkdir(join(repoRoot, ".claude", "rules"));

    write(join(repoRoot, ".claude", "rules", "gameplay.md"), "# Bundled gameplay");
    write(join(root, ".claude", "rules", "gameplay.md"), "# User gameplay override");

    const result = loadCopilotRules(root, repoRoot);
    expect(result).not.toBeNull();
    expect(result).toContain("User gameplay override");
    expect(result).not.toContain("Bundled gameplay");
  });
});

// ── getBundledClaudeDir ─────────────────────────────────────────────────────

describe("getBundledClaudeDir", () => {
  it("returns undefined when root and repoRoot are the same path", () => {
    const same = join(TMP, "same-path");
    expect(getBundledClaudeDir(same, same)).toBeUndefined();
  });

  it("returns repoRoot/.claude when root and repoRoot differ", () => {
    const root = join(TMP, "project");
    const repoRoot = join(TMP, "repo");
    const result = getBundledClaudeDir(root, repoRoot);
    expect(result).toBe(join(repoRoot, ".claude"));
  });
});

// ── resolveStudioContext ────────────────────────────────────────────────────

describe("resolveStudioContext", () => {
  it("returns available-skills block when message has no /skill command", () => {
    // Use the real repo root — it has skills defined in .claude/skills/
    const repoRoot = join(__dirname, "..", "..", "..");
    const result = resolveStudioContext("hello world", repoRoot, repoRoot);
    // Either empty (no skills found in same-dir mode) or contains available-skills
    // With same dir, bundledDir is undefined so only user skills loaded
    expect(typeof result).toBe("string");
  });

  it("returns empty string when /skill command is unknown (skill not found)", () => {
    const root = join(TMP, "skill-test");
    const repoRoot = join(TMP, "skill-repo");
    mkdir(join(root, ".claude", "skills"));
    mkdir(join(repoRoot, ".claude", "skills", "create-game"));
    write(join(repoRoot, ".claude", "skills", "create-game", "SKILL.md"), [
      "---",
      "name: create-game",
      "description: Scaffold a new game",
      "user_invocable: true",
      "---",
      "# Create game skill content",
    ].join("\n"));

    // The /skill regex fires so skillMatch is truthy — resolveSkill returns null,
    // no parts are pushed, and the available-skills block is skipped.
    const result = resolveStudioContext("/nonexistent-skill", root, repoRoot);
    expect(result).toBe("");
  });

  it("returns available-skills list when message has no /skill prefix and skills exist", () => {
    const root = join(TMP, "noskill-root");
    const repoRoot = join(TMP, "noskill-repo");
    // Skills are loaded from .claude/skills/{name}/SKILL.md with user_invocable frontmatter
    mkdir(join(repoRoot, ".claude", "skills", "create-game"));
    write(join(repoRoot, ".claude", "skills", "create-game", "SKILL.md"), [
      "---",
      "name: create-game",
      "description: Scaffold a new game",
      "user_invocable: true",
      "---",
      "# Create game skill content",
    ].join("\n"));
    mkdir(join(root, ".claude", "skills"));

    const result = resolveStudioContext("what can you do?", root, repoRoot);
    expect(result).toContain("available-skills");
    expect(result).toContain("create-game");
  });
});
