import { describe, it, expect, vi } from "vitest";
import { pollUntil } from "./poll.js";

describe("pollUntil", () => {
  it("returns immediately when isDone is true on first call", async () => {
    const fetch = vi.fn().mockResolvedValue({ status: "done" });
    const result = await pollUntil(fetch, (r) => r.status === "done", { label: "test" });
    expect(result).toEqual({ status: "done" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("polls until isDone returns true", async () => {
    let callCount = 0;
    const fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return { status: callCount >= 3 ? "done" : "pending" };
    });
    const result = await pollUntil(fetch, (r) => r.status === "done", {
      intervalMs: 10,
      maxWaitMs: 5000,
      label: "test",
    });
    expect(result.status).toBe("done");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("throws on timeout", async () => {
    const fetch = vi.fn().mockResolvedValue({ status: "pending" });
    await expect(
      pollUntil(fetch, (r) => r.status === "done", {
        intervalMs: 10,
        maxWaitMs: 50,
        label: "my-task",
      })
    ).rejects.toThrow("my-task timed out");
  });

  it("uses default options", async () => {
    const fetch = vi.fn().mockResolvedValue({ status: "done" });
    const result = await pollUntil(fetch, (r) => r.status === "done", {});
    expect(result.status).toBe("done");
  });
});
