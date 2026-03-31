/**
 * Integration tests — verify decomposed MCP server modules wire together correctly.
 * Each suite is self-contained; no Godot or Blender process required.
 */
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

import { clearRegistry, getToolCount, getAllToolDefinitions } from "./tool-registry.js";
import { createServer } from "./server.js";
import { executeToolInner } from "./tool-handlers/dispatch.js";
import { GodotBridge } from "./bridge.js";
import { callClaudeApi, getToolDefinitions } from "./chat/api-client.js";
import { loadCopilotRules, resolveStudioContext, getBundledClaudeDir } from "./chat/studio.js";
import { BASE_SYSTEM_PROMPT, MAX_TOOL_LOOPS } from "./chat/types.js";
import { chatViaApi, compactSession } from "./chat/api-mode.js";
import { sendJson, writePortFile, removePortFile } from "./http/utils.js";
import { readBody, getContentType } from "./http/files.js";
import { getRepoRoot, readGodotPluginVersion, isNewer } from "./http/provision.js";

// Minimal bridge stub — Godot is not running during tests
const BRIDGE = new GodotBridge("/tmp");
const REPO_ROOT = "/home/goat/GodotForge";

// ---------------------------------------------------------------------------
// 1. Tool Registry Integration
// ---------------------------------------------------------------------------
describe("Tool Registry Integration", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers all 154 tools after createServer", () => {
    createServer("/tmp");
    expect(getToolCount()).toBe(154);
  });

  it("registers tools from every category", () => {
    createServer("/tmp");
    const names = getAllToolDefinitions().map((t) => t.name);

    // Editor
    expect(names).toContain("create_scene");
    expect(names).toContain("add_node");
    expect(names).toContain("run_scene");

    // Runtime
    expect(names).toContain("take_game_screenshot");
    expect(names).toContain("simulate_input");
    expect(names).toContain("get_runtime_state");

    // Local
    expect(names).toContain("get_project_context");
    expect(names).toContain("search_docs");
    expect(names).toContain("save_memory");

    // Asset
    expect(names).toContain("assets.search_polyhaven");
    expect(names).toContain("assets.download_sketchfab");

    // Blender
    expect(names).toContain("blender.create_mesh");
    expect(names).toContain("blender.export_gltf");

    // Pipeline
    expect(names).toContain("pipeline.blender_to_godot");
    expect(names).toContain("pipeline.batch_import");

    // AI providers
    expect(names).toContain("ai.meshy_balance");
    expect(names).toContain("ai.stability_balance");
    expect(names).toContain("ai.dalle_generate");
    expect(names).toContain("ai.elevenlabs_tts");
    expect(names).toContain("ai.suno_generate");
    expect(names).toContain("ai.rodin_generate");
    expect(names).toContain("ai.tripo_text_to_3d");
    expect(names).toContain("ai.blockade_generate_skybox");
    expect(names).toContain("ai.huggingface_text_to_image");
  });
});

// ---------------------------------------------------------------------------
// 2. Tool Dispatch Integration
// ---------------------------------------------------------------------------
describe("Tool Dispatch Integration", () => {
  it("returns isError for unknown tool names", async () => {
    const result = await executeToolInner("no.such.tool", {}, "/tmp", BRIDGE);
    expect(result.isError).toBe(true);
    const text = result.content[0].text as string;
    expect(text).toContain("Unknown tool: no.such.tool");
  });

  it("routes known editor tool — fails with descriptive error (no Godot running)", async () => {
    const result = await executeToolInner(
      "create_scene",
      { name: "Test", root_type: "Node2D" },
      "/tmp",
      BRIDGE
    );
    const text = result.content[0].text as string;
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
    // Should not fall through to "Unknown tool"
    expect(text).not.toContain("Unknown tool");
  });

  it("list_files returns files from a real tmp directory", async () => {
    const testDir = "/tmp/godotforge_int_list";
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "hello.txt"), "hello");
    writeFileSync(join(testDir, "world.gd"), "extends Node");

    const result = await executeToolInner(
      "list_files",
      { directory: "." },
      testDir,
      BRIDGE
    );
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text as string;
    expect(text).toContain("hello.txt");
    expect(text).toContain("world.gd");
  });

  it("read_file returns file content", async () => {
    const testDir = "/tmp/godotforge_int_read";
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "readme.txt"), "prototype content");

    const result = await executeToolInner(
      "read_file",
      { path: "readme.txt" },
      testDir,
      BRIDGE
    );
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("prototype content");
  });
});

// ---------------------------------------------------------------------------
// 3. Dynamic AI Module Imports
// ---------------------------------------------------------------------------
describe("Dynamic AI Module Imports", () => {
  // One probe per dynamic import branch in dispatch.ts
  const aiProbes: [string, Record<string, unknown>][] = [
    ["ai.meshy_balance", {}],
    ["ai.blockade_list_styles", {}],
    ["ai.elevenlabs_list_models", {}],
    ["ai.rodin_check_task", { task_uuid: "test" }],
    ["ai.tripo_balance", {}],
    ["ai.dalle_generate", { prompt: "test" }],
    ["ai.suno_credits", {}],
    ["ai.huggingface_text_to_image", { prompt: "test", model: "test/model" }],
    ["ai.stability_balance", {}],
  ];

  for (const [toolName, args] of aiProbes) {
    it(`${toolName} — module resolves (no "Cannot find module" error)`, async () => {
      let result;
      try {
        result = await executeToolInner(toolName, args, "/tmp", BRIDGE);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // A missing-module crash is the failure we're guarding against
        expect(msg).not.toContain("Cannot find module");
        return;
      }
      // Module resolved — result should be an API-key error, not a broken import
      const text = result.content[0].text as string;
      expect(typeof text).toBe("string");
      expect(text).not.toContain("Cannot find module");
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Chat Module Imports
// ---------------------------------------------------------------------------
describe("Chat Module Imports", () => {
  it("callClaudeApi is a function", () => {
    expect(typeof callClaudeApi).toBe("function");
  });

  it("getToolDefinitions is a function that returns an array", () => {
    expect(typeof getToolDefinitions).toBe("function");
    expect(Array.isArray(getToolDefinitions())).toBe(true);
  });

  it("loadCopilotRules, resolveStudioContext, getBundledClaudeDir are functions", () => {
    expect(typeof loadCopilotRules).toBe("function");
    expect(typeof resolveStudioContext).toBe("function");
    expect(typeof getBundledClaudeDir).toBe("function");
  });

  it("BASE_SYSTEM_PROMPT is a non-empty string", () => {
    expect(typeof BASE_SYSTEM_PROMPT).toBe("string");
    expect(BASE_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("MAX_TOOL_LOOPS is a positive number", () => {
    expect(typeof MAX_TOOL_LOOPS).toBe("number");
    expect(MAX_TOOL_LOOPS).toBeGreaterThan(0);
  });

  it("chatViaApi and compactSession are functions", () => {
    expect(typeof chatViaApi).toBe("function");
    expect(typeof compactSession).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// 5. HTTP Module Imports
// ---------------------------------------------------------------------------
describe("HTTP Module Imports", () => {
  it("sendJson, writePortFile, removePortFile are functions", () => {
    expect(typeof sendJson).toBe("function");
    expect(typeof writePortFile).toBe("function");
    expect(typeof removePortFile).toBe("function");
  });

  it("readBody and getContentType are functions", () => {
    expect(typeof readBody).toBe("function");
    expect(typeof getContentType).toBe("function");
  });

  it("getRepoRoot, readGodotPluginVersion, isNewer are functions", () => {
    expect(typeof getRepoRoot).toBe("function");
    expect(typeof readGodotPluginVersion).toBe("function");
    expect(typeof isNewer).toBe("function");
  });

  it("isNewer: 1.2.0 > 1.1.0 → true", () => {
    expect(isNewer("1.2.0", "1.1.0")).toBe(true);
  });

  it("isNewer: 1.0.0 vs 1.0.0 → false", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
  });

  it("isNewer: 2.0.0 > 1.9.9 → true", () => {
    expect(isNewer("2.0.0", "1.9.9")).toBe(true);
  });

  it("isNewer: 1.0.0 < 1.0.1 → false", () => {
    expect(isNewer("1.0.0", "1.0.1")).toBe(false);
  });

  it("getContentType returns correct MIME types", () => {
    expect(getContentType(".png")).toBe("image/png");
    expect(getContentType(".mp3")).toBe("audio/mpeg");
    expect(getContentType(".glb")).toBe("model/gltf-binary");
    expect(getContentType(".gd")).toContain("text/plain");
    expect(getContentType(".json")).toBe("application/json");
    expect(getContentType(".xyz")).toBe("application/octet-stream");
  });
});

// ---------------------------------------------------------------------------
// 6. Studio Integration (loadCopilotRules)
// ---------------------------------------------------------------------------
describe("Studio Integration — loadCopilotRules", () => {
  it("same project → includes user rules (no internal filtering when root === repoRoot)", () => {
    const rules = loadCopilotRules(REPO_ROOT, REPO_ROOT);
    // When root === repoRoot, bundled pass is skipped, user rules are read directly
    expect(rules).not.toBeNull();
    expect(rules).toMatch(/gameplay|scene-architecture/i);
  });

  it("external project → includes game-dev rules, excludes audience:internal rules", () => {
    // External project has no .claude/rules of its own → only bundled rules loaded
    const externalRoot = "/tmp/godotforge_studio_empty";
    mkdirSync(externalRoot, { recursive: true });

    const rules = loadCopilotRules(externalRoot, REPO_ROOT);
    expect(rules).not.toBeNull();

    // Game-dev rules (no audience: internal) must be present
    expect(rules).toMatch(/gameplay|scene-architecture/i);

    // Internal rules must be excluded — their distinctive headings must not appear
    expect(rules).not.toMatch(/^# SOLID/m);
    expect(rules).not.toMatch(/^# TDD/m);
    expect(rules).not.toMatch(/^# KISS/m);
    expect(rules).not.toMatch(/^# DRY/m);
  });

  it("empty directories → returns null", () => {
    const rules = loadCopilotRules("/tmp/no_such_xyzzy_a", "/tmp/no_such_xyzzy_b");
    expect(rules).toBeNull();
  });
});
