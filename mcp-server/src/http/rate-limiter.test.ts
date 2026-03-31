import { describe, it, expect, afterEach } from "vitest";
import { RateLimiter, getCategory } from "./rate-limiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  afterEach(() => { limiter?.destroy(); });

  it("allows requests under limit", () => {
    limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(limiter.check("config").allowed).toBe(true);
    }
    // 11th should be blocked (config limit = 10)
    expect(limiter.check("config").allowed).toBe(false);
  });

  it("returns retry-after when blocked", () => {
    limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) limiter.check("config");
    const result = limiter.check("config");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows default category up to 100", () => {
    limiter = new RateLimiter();
    for (let i = 0; i < 100; i++) {
      expect(limiter.check("default").allowed).toBe(true);
    }
    expect(limiter.check("default").allowed).toBe(false);
  });
});

describe("getCategory", () => {
  it("classifies chat endpoints", () => {
    expect(getCategory("/chat", "POST")).toBe("chat");
    expect(getCategory("/chat/stream", "POST")).toBe("chat");
    expect(getCategory("/chat/agent", "POST")).toBe("chat");
  });

  it("classifies config mutations", () => {
    expect(getCategory("/keys", "POST")).toBe("config");
    expect(getCategory("/config", "PUT")).toBe("config");
    expect(getCategory("/settings", "DELETE")).toBe("config");
  });

  it("classifies config reads as default", () => {
    expect(getCategory("/keys", "GET")).toBe("default");
  });

  it("classifies file endpoints", () => {
    expect(getCategory("/file/assets/test.png", "GET")).toBe("files");
  });

  it("defaults unknown paths", () => {
    expect(getCategory("/unknown", "GET")).toBe("default");
  });
});
