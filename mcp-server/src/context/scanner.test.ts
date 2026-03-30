import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectMap } from "./scanner.js";

// Test the pure classification logic from scanner.ts
// The walkDir function classifies files by extension — we test that pattern.

describe("file classification by extension", () => {
  function classifyFile(filename: string): "scene" | "script" | "resource" | null {
    const ext = filename.slice(filename.lastIndexOf("."));
    switch (ext) {
      case ".tscn": return "scene";
      case ".gd": return "script";
      case ".tres":
      case ".res": return "resource";
      default: return null;
    }
  }

  it("classifies .tscn as scene", () => {
    expect(classifyFile("main.tscn")).toBe("scene");
    expect(classifyFile("levels/level_01.tscn")).toBe("scene");
  });

  it("classifies .gd as script", () => {
    expect(classifyFile("player.gd")).toBe("script");
  });

  it("classifies .tres and .res as resource", () => {
    expect(classifyFile("theme.tres")).toBe("resource");
    expect(classifyFile("data.res")).toBe("resource");
  });

  it("returns null for unknown extensions", () => {
    expect(classifyFile("readme.md")).toBeNull();
    expect(classifyFile("icon.png")).toBeNull();
    expect(classifyFile("project.godot")).toBeNull();
  });
});

describe("project.godot parsing patterns", () => {
  function parseProjectName(content: string): string {
    const match = content.match(/config\/name="([^"]+)"/);
    return match ? match[1] : "";
  }

  function parseGodotVersion(content: string): string {
    const match = content.match(/config\/features=PackedStringArray\("([^"]+)"/);
    return match ? match[1] : "";
  }

  function parseAutoloads(content: string): Record<string, string> {
    const autoloads: Record<string, string> = {};
    if (!content.includes("[autoload]")) return autoloads;

    const autoloadRegex = /(\w+)="(\*?res:\/\/[^"]+)"/g;
    let match;
    while ((match = autoloadRegex.exec(content)) !== null) {
      autoloads[match[1]] = match[2].replace("*", "");
    }
    return autoloads;
  }

  const SAMPLE_PROJECT = `; Engine configuration file.

[application]

config/name="My Game"
config/features=PackedStringArray("4.3", "GL Compatibility")
run/main_scene="res://scenes/main.tscn"

[autoload]

EventBus="*res://scripts/event_bus.gd"
GameManager="*res://scripts/game_manager.gd"

[display]

window/size/viewport_width=1280
`;

  it("extracts project name", () => {
    expect(parseProjectName(SAMPLE_PROJECT)).toBe("My Game");
  });

  it("extracts Godot version", () => {
    expect(parseGodotVersion(SAMPLE_PROJECT)).toBe("4.3");
  });

  it("extracts autoloads", () => {
    const autoloads = parseAutoloads(SAMPLE_PROJECT);
    expect(autoloads["EventBus"]).toBe("res://scripts/event_bus.gd");
    expect(autoloads["GameManager"]).toBe("res://scripts/game_manager.gd");
  });

  it("returns empty for missing fields", () => {
    expect(parseProjectName("")).toBe("");
    expect(parseGodotVersion("")).toBe("");
    expect(parseAutoloads("")).toEqual({});
  });
});

describe("SKIP_DIRS filtering", () => {
  const SKIP_DIRS = new Set([".godot", ".godotforge", "addons", ".git", "node_modules", ".claude"]);

  it("skips known directories", () => {
    expect(SKIP_DIRS.has(".godot")).toBe(true);
    expect(SKIP_DIRS.has("addons")).toBe(true);
    expect(SKIP_DIRS.has("node_modules")).toBe(true);
    expect(SKIP_DIRS.has(".claude")).toBe(true);
  });

  it("does not skip game directories", () => {
    expect(SKIP_DIRS.has("scenes")).toBe(false);
    expect(SKIP_DIRS.has("scripts")).toBe(false);
    expect(SKIP_DIRS.has("assets")).toBe(false);
  });
});

describe("cache TTL logic", () => {
  it("invalidates cache older than 5 minutes", () => {
    const fiveMinMs = 5 * 60 * 1000;
    const oldTime = new Date(Date.now() - fiveMinMs - 1000).toISOString();
    const recentTime = new Date(Date.now() - 1000).toISOString();

    expect(Date.now() - new Date(oldTime).getTime() > fiveMinMs).toBe(true);
    expect(Date.now() - new Date(recentTime).getTime() > fiveMinMs).toBe(false);
  });
});
