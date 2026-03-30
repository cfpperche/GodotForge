import { describe, it, expect } from "vitest";
import { checkGuardrails, type RiskLevel } from "./guardrails.js";

describe("checkGuardrails", () => {
  describe("risk classification", () => {
    it("classifies read-only tools as safe", () => {
      const safeTools = [
        "get_scene_tree", "get_node_properties", "read_file",
        "search_docs", "get_class_reference", "get_project_memory",
        "assets.search_polyhaven", "ai.meshy_check_task", "ai.stability_balance",
      ];
      for (const tool of safeTools) {
        const result = checkGuardrails(tool, {});
        expect(result.risk).toBe("safe");
        expect(result.allowed).toBe(true);
      }
    });

    it("classifies creation/modification tools as moderate", () => {
      const moderateTools = [
        "create_scene", "add_node", "edit_script", "save_scene",
        "ai.meshy_text_to_3d", "assets.download_polyhaven",
        "pipeline.blender_to_godot",
      ];
      for (const tool of moderateTools) {
        const result = checkGuardrails(tool, {});
        expect(result.risk).toBe("moderate");
      }
    });

    it("classifies deletion tools as destructive", () => {
      const destructiveTools = [
        "remove_node", "blender_delete_object", "blender_delete_material",
        "blender_boolean", "blender_join_objects",
      ];
      for (const tool of destructiveTools) {
        const result = checkGuardrails(tool, {});
        expect(result.risk).toBe("destructive");
      }
    });

    it("classifies code execution tools as critical", () => {
      expect(checkGuardrails("execute_editor_script", { code: "print('hi')" }).risk).toBe("critical");
      expect(checkGuardrails("blender_execute_python", { code: "print('hi')" }).risk).toBe("critical");
    });

    it("defaults unknown tools to moderate", () => {
      expect(checkGuardrails("some_unknown_tool", {}).risk).toBe("moderate");
    });
  });

  describe("GDScript content blocking", () => {
    it("blocks OS.execute in editor scripts", () => {
      const result = checkGuardrails("execute_editor_script", {
        code: 'OS.execute("rm", ["-rf", "/"])',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("dangerous pattern");
    });

    it("blocks DirAccess.remove", () => {
      const result = checkGuardrails("execute_editor_script", {
        code: 'DirAccess.remove_absolute("/some/path")',
      });
      expect(result.allowed).toBe(false);
    });

    it("blocks FileAccess WRITE", () => {
      const result = checkGuardrails("execute_editor_script", {
        code: 'var f = FileAccess.open("res://test", FileAccess.WRITE)',
      });
      expect(result.allowed).toBe(false);
    });

    it("blocks queue_free()", () => {
      const result = checkGuardrails("execute_editor_script", {
        code: "get_tree().root.queue_free()",
      });
      expect(result.allowed).toBe(false);
    });

    it("allows safe GDScript", () => {
      const result = checkGuardrails("execute_editor_script", {
        code: '_result = str(EditorInterface.get_edited_scene_root().name)',
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("Python content blocking", () => {
    it("blocks os.system in Blender scripts", () => {
      const result = checkGuardrails("blender_execute_python", {
        code: 'os.system("rm -rf /")',
      });
      expect(result.allowed).toBe(false);
    });

    it("blocks subprocess calls", () => {
      const result = checkGuardrails("blender_execute_python", {
        code: 'subprocess.call(["ls"])',
      });
      expect(result.allowed).toBe(false);
    });

    it("blocks eval/exec", () => {
      expect(checkGuardrails("blender_execute_python", { code: 'eval("1+1")' }).allowed).toBe(false);
      expect(checkGuardrails("blender_execute_python", { code: 'exec("print(1)")' }).allowed).toBe(false);
    });

    it("blocks shutil.rmtree", () => {
      const result = checkGuardrails("blender_execute_python", {
        code: 'import shutil; shutil.rmtree("/home")',
      });
      expect(result.allowed).toBe(false);
    });

    it("allows safe Python", () => {
      const result = checkGuardrails("blender_execute_python", {
        code: "import bpy; print(bpy.context.active_object.name)",
      });
      expect(result.allowed).toBe(true);
    });

    it("reads code from args.script fallback", () => {
      const result = checkGuardrails("blender_execute_python", {
        script: 'os.system("hack")',
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe("root node protection", () => {
    it("blocks removing root node '/'", () => {
      const result = checkGuardrails("remove_node", { node_path: "/" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("root node");
    });

    it("blocks removing root node '.'", () => {
      expect(checkGuardrails("remove_node", { node_path: "." }).allowed).toBe(false);
    });

    it("blocks removing top-level node without path separator", () => {
      expect(checkGuardrails("remove_node", { node_path: "Player" }).allowed).toBe(false);
    });

    it("allows removing nested nodes", () => {
      expect(checkGuardrails("remove_node", { node_path: "Player/Sprite2D" }).allowed).toBe(true);
    });
  });

  describe("empty/missing args handling", () => {
    it("handles missing code arg gracefully", () => {
      expect(checkGuardrails("execute_editor_script", {}).allowed).toBe(true);
      expect(checkGuardrails("blender_execute_python", {}).allowed).toBe(true);
    });

    it("handles missing node_path gracefully", () => {
      // empty string has no "/" so it should be blocked
      expect(checkGuardrails("remove_node", {}).allowed).toBe(false);
    });
  });
});
