import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import {
  readGodotPluginVersion,
  readBlenderAddonVersion,
  isNewer,
  getRepoRoot,
} from "./provision.js";

const TMP = "/tmp/provision-test";

function mkdir(p: string) { mkdirSync(p, { recursive: true }); }
function write(p: string, content: string) { writeFileSync(p, content, "utf-8"); }

beforeEach(() => { mkdir(TMP); });
afterEach(() => { rmSync(TMP, { recursive: true, force: true }); });

// ── readGodotPluginVersion ──────────────────────────────────────────────────

describe("readGodotPluginVersion", () => {
  it("parses version from valid plugin.cfg", () => {
    const dir = join(TMP, "plugin");
    mkdir(dir);
    write(join(dir, "plugin.cfg"), '[plugin]\nname="GodotForge"\nversion="1.2.3"\n');
    expect(readGodotPluginVersion(dir)).toBe("1.2.3");
  });

  it("returns 0.0.0 when plugin.cfg is missing", () => {
    const dir = join(TMP, "no-plugin");
    mkdir(dir);
    expect(readGodotPluginVersion(dir)).toBe("0.0.0");
  });

  it("returns 0.0.0 for malformed plugin.cfg (no version field)", () => {
    const dir = join(TMP, "bad-plugin");
    mkdir(dir);
    write(join(dir, "plugin.cfg"), '[plugin]\nname="GodotForge"\n');
    expect(readGodotPluginVersion(dir)).toBe("0.0.0");
  });
});

// ── readBlenderAddonVersion ─────────────────────────────────────────────────

describe("readBlenderAddonVersion", () => {
  it("parses version from valid __init__.py", () => {
    const dir = join(TMP, "addon");
    mkdir(dir);
    write(join(dir, "__init__.py"), [
      'bl_info = {',
      '    "name": "GodotForge",',
      '    "version": (1, 2, 3),',
      '}',
    ].join("\n"));
    expect(readBlenderAddonVersion(dir)).toBe("1.2.3");
  });

  it("returns 0.0.0 when __init__.py is missing", () => {
    const dir = join(TMP, "no-addon");
    mkdir(dir);
    expect(readBlenderAddonVersion(dir)).toBe("0.0.0");
  });

  it("returns 0.0.0 when version tuple is absent", () => {
    const dir = join(TMP, "bad-addon");
    mkdir(dir);
    write(join(dir, "__init__.py"), 'bl_info = { "name": "GodotForge" }');
    expect(readBlenderAddonVersion(dir)).toBe("0.0.0");
  });
});

// ── isNewer ─────────────────────────────────────────────────────────────────

describe("isNewer", () => {
  it("returns true when a has higher minor version", () => {
    expect(isNewer("1.2.0", "1.1.0")).toBe(true);
  });

  it("returns false when versions are equal", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns true when a has higher major version", () => {
    expect(isNewer("2.0.0", "1.9.9")).toBe(true);
  });

  it("returns true when a has higher patch version", () => {
    expect(isNewer("1.0.1", "1.0.0")).toBe(true);
  });

  it("returns false for 0.0.0 vs 0.0.0", () => {
    expect(isNewer("0.0.0", "0.0.0")).toBe(false);
  });

  it("returns false when b is higher", () => {
    expect(isNewer("1.0.0", "1.0.1")).toBe(false);
  });
});

// ── getRepoRoot ─────────────────────────────────────────────────────────────

describe("getRepoRoot", () => {
  it("returns a string containing GodotForge", () => {
    const root = getRepoRoot();
    expect(typeof root).toBe("string");
    expect(root).toContain("GodotForge");
  });
});
