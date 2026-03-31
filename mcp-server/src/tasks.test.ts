import { describe, it, expect, afterEach } from "vitest";
import { TaskRegistry } from "./tasks.js";

describe("TaskRegistry", () => {
  let registry: TaskRegistry;

  afterEach(() => { registry?.destroy(); });

  it("submit returns task ID immediately", () => {
    registry = new TaskRegistry();
    const id = registry.submit("test_tool", () =>
      new Promise((r) => setTimeout(() => r({ content: [{ type: "text" as const, text: "done" }] }), 100))
    );
    expect(id).toHaveLength(36); // UUID
    const task = registry.get(id);
    expect(task?.status).toBe("working");
    expect(task?.tool).toBe("test_tool");
  });

  it("task completes after execution", async () => {
    registry = new TaskRegistry();
    const id = registry.submit("test_tool", async () => ({
      content: [{ type: "text" as const, text: "result" }],
    }));
    // Wait for background execution
    await new Promise((r) => setTimeout(r, 50));
    const task = registry.get(id);
    expect(task?.status).toBe("completed");
    expect(task?.result?.content[0].text).toBe("result");
  });

  it("task fails on error", async () => {
    registry = new TaskRegistry();
    const id = registry.submit("test_tool", async () => {
      throw new Error("boom");
    });
    await new Promise((r) => setTimeout(r, 50));
    const task = registry.get(id);
    expect(task?.status).toBe("failed");
    expect(task?.result?.isError).toBe(true);
  });

  it("cancel sets status to cancelled", async () => {
    registry = new TaskRegistry();
    const id = registry.submit("test_tool", () =>
      new Promise((r) => setTimeout(() => r({ content: [{ type: "text" as const, text: "done" }] }), 5000))
    );
    expect(registry.cancel(id)).toBe(true);
    expect(registry.get(id)?.status).toBe("cancelled");
    expect(registry.isCancelled(id)).toBe(true);
  });

  it("list returns tasks sorted by updatedAt desc", () => {
    registry = new TaskRegistry();
    registry.submit("a", async () => ({ content: [{ type: "text" as const, text: "" }] }));
    registry.submit("b", async () => ({ content: [{ type: "text" as const, text: "" }] }));
    const list = registry.list();
    expect(list).toHaveLength(2);
  });

  it("get returns null for unknown task", () => {
    registry = new TaskRegistry();
    expect(registry.get("nonexistent")).toBeNull();
  });

  it("updateProgress sets progress on working task", () => {
    registry = new TaskRegistry();
    const id = registry.submit("test_tool", () =>
      new Promise((r) => setTimeout(() => r({ content: [{ type: "text" as const, text: "" }] }), 5000))
    );
    registry.updateProgress(id, "50% complete");
    expect(registry.get(id)?.progress).toBe("50% complete");
  });
});
