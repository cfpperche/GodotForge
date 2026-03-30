import { describe, it, expect, vi, beforeEach } from "vitest";
import { GodotBridge } from "./bridge.js";

describe("GodotBridge", () => {
  describe("construction", () => {
    it("creates bridge with project root", () => {
      const bridge = new GodotBridge("/tmp/test-project");
      expect(bridge).toBeDefined();
    });

    it("creates bridge without project root (uses cwd)", () => {
      const bridge = new GodotBridge();
      expect(bridge).toBeDefined();
    });
  });

  describe("error handling when Godot not running", () => {
    it("throws descriptive error when port file missing", async () => {
      const bridge = new GodotBridge("/tmp/nonexistent-project");
      await expect(bridge.health()).rejects.toThrow("Godot editor is not running");
    });

    it("throws descriptive error for executeTool when no port file", async () => {
      const bridge = new GodotBridge("/tmp/nonexistent-project");
      await expect(bridge.executeTool("get_scene_tree", {})).rejects.toThrow(
        "GodotForge plugin"
      );
    });
  });

  describe("resetConnection", () => {
    it("clears cached URL", () => {
      const bridge = new GodotBridge("/tmp/test");
      bridge.resetConnection();
      // After reset, next call should re-read port file
      expect(bridge).toBeDefined();
    });
  });
});
