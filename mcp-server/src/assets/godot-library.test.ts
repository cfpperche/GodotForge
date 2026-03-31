import { describe, it, expect } from "vitest";

describe("godot-library", () => {
  it("module exports expected functions", async () => {
    const mod = await import("./godot-library.js");
    expect(typeof mod.searchGodotLibrary).toBe("function");
    expect(typeof mod.getAssetDetail).toBe("function");
    expect(typeof mod.downloadAssetZip).toBe("function");
  });
});
