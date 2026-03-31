import { describe, it, expect } from "vitest";

describe("freesound", () => {
  it("module exports expected functions", async () => {
    const mod = await import("./freesound.js");
    expect(typeof mod.searchFreesound).toBe("function");
    expect(typeof mod.downloadPreview).toBe("function");
  });
});
