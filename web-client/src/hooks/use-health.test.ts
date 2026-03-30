import { describe, it, expect } from "vitest";

describe("use-health (module import smoke test)", () => {
  it("exports useHealth without throwing", async () => {
    const mod = await import("./use-health");
    expect(typeof mod.useHealth).toBe("function");
  });
});
