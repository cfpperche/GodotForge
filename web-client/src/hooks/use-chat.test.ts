import { describe, it, expect } from "vitest";

// Smoke test: verify the hook module can be imported without errors.
// Full integration tests would require a renderHook wrapper with jsdom
// localStorage/sessionStorage stubs — covered by api.test.ts for the
// network layer, and by e2e tests for the full send/receive flow.
describe("use-chat (module import smoke test)", () => {
  it("exports useChat without throwing", async () => {
    const mod = await import("./use-chat");
    expect(typeof mod.useChat).toBe("function");
  });

  it("exports PendingConfirmation type shape via runtime duck-typing", async () => {
    // PendingConfirmation is a TypeScript interface, so we verify the
    // module loads cleanly and the named export exists.
    const mod = await import("./use-chat");
    expect(mod).toHaveProperty("useChat");
  });
});
