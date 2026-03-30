import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./api";

// Helper to create a minimal fetch mock that returns a JSON response
function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    body: null,
  });
}

describe("api", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("URL construction", () => {
    it("calls /health at the correct base URL", async () => {
      const fetchMock = mockFetch({ status: "ok", service: "godotforge", version: "1.0.0", port: 6980 });
      globalThis.fetch = fetchMock;

      await api.health();

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:6980/health");
    });

    it("calls /chat with POST and correct body", async () => {
      const fetchMock = mockFetch({ response: "Hello", tool_calls: [] });
      globalThis.fetch = fetchMock;

      await api.chat("Hello there", "session-abc");

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:6980/chat");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual({
        message: "Hello there",
        session_id: "session-abc",
      });
    });

    it("calls /settings with GET for getSettings", async () => {
      const fetchMock = mockFetch({ auth_mode: "api_key", model: "claude-opus-4-5" });
      globalThis.fetch = fetchMock;

      await api.getSettings();

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:6980/settings");
      expect(options.method).toBeUndefined(); // defaults to GET
    });

    it("calls /keys with POST for setKey, including service and key in body", async () => {
      const fetchMock = mockFetch({ result: "ok" });
      globalThis.fetch = fetchMock;

      await api.setKey("openai", "sk-test-key");

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:6980/keys");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual({
        service: "openai",
        key: "sk-test-key",
      });
    });

    it("calls /keys with DELETE for removeKey", async () => {
      const fetchMock = mockFetch({ result: "ok" });
      globalThis.fetch = fetchMock;

      await api.removeKey("openai");

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:6980/keys");
      expect(options.method).toBe("DELETE");
      expect(JSON.parse(options.body as string)).toEqual({ service: "openai" });
    });

    it("getFileUrl returns correct URL with encoded path", () => {
      const url = api.getFileUrl("assets/my file.png");
      expect(url).toBe("http://localhost:6980/file/assets%2Fmy%20file.png");
    });
  });

  describe("error handling", () => {
    it("throws an Error with the server error message on non-ok response", async () => {
      const fetchMock = mockFetch({ error: "Not found" }, 404);
      globalThis.fetch = fetchMock;

      await expect(api.health()).rejects.toThrow("Not found");
    });

    it("falls back to HTTP status text when response body has no error field", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      });

      await expect(api.health()).rejects.toThrow("Internal Server Error");
    });

    it("includes Content-Type: application/json header on all requests", async () => {
      const fetchMock = mockFetch({ status: "ok", service: "s", version: "1", port: 6980 });
      globalThis.fetch = fetchMock;

      await api.health();

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });
  });

  describe("listFiles", () => {
    it("encodes the path query parameter", async () => {
      const fetchMock = mockFetch([]);
      globalThis.fetch = fetchMock;

      await api.listFiles("my folder/sub");

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("http://localhost:6980/files?path=my%20folder%2Fsub");
    });

    it("returns empty array on non-ok response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve([]) });
      const result = await api.listFiles();
      expect(result).toEqual([]);
    });

    it("uses empty string path by default", async () => {
      const fetchMock = mockFetch([]);
      globalThis.fetch = fetchMock;

      await api.listFiles();

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("http://localhost:6980/files?path=");
    });
  });
});
