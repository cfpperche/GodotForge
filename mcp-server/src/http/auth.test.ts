import { describe, it, expect } from "vitest";
import { getOrCreateToken, validateRequest, isExempt } from "./auth.js";
import type { IncomingMessage } from "http";

describe("auth", () => {
  it("generates a 64-char hex token", () => {
    const token = getOrCreateToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("returns same token on repeated calls", () => {
    const t1 = getOrCreateToken();
    const t2 = getOrCreateToken();
    expect(t1).toBe(t2);
  });

  it("validates correct bearer token", () => {
    const token = getOrCreateToken();
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as IncomingMessage;
    expect(validateRequest(req, token)).toBe(true);
  });

  it("rejects missing auth header", () => {
    const req = { headers: {} } as unknown as IncomingMessage;
    expect(validateRequest(req, "sometoken")).toBe(false);
  });

  it("rejects wrong token", () => {
    const req = { headers: { authorization: "Bearer wrong" } } as unknown as IncomingMessage;
    expect(validateRequest(req, "correct")).toBe(false);
  });

  it("rejects non-Bearer scheme", () => {
    const req = { headers: { authorization: "Basic abc123" } } as unknown as IncomingMessage;
    expect(validateRequest(req, "abc123")).toBe(false);
  });
});

describe("isExempt", () => {
  it("exempts OPTIONS preflight", () => {
    expect(isExempt("OPTIONS", "/chat")).toBe(true);
  });

  it("exempts /health", () => {
    expect(isExempt("GET", "/health")).toBe(true);
  });

  it("does not exempt other paths", () => {
    expect(isExempt("POST", "/chat")).toBe(false);
    expect(isExempt("GET", "/keys")).toBe(false);
  });
});
