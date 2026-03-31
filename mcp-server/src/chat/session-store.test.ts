import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionStore } from "./session-store.js";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

const TMP_BASE = "/tmp/godotforge-session-test";
let TMP_ROOT: string;

describe("SessionStore", () => {
  beforeEach(() => {
    TMP_ROOT = `${TMP_BASE}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP_ROOT)) rmSync(TMP_ROOT, { recursive: true });
  });

  it("save and load roundtrip", () => {
    const store = new SessionStore(TMP_ROOT);
    const messages = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ];
    store.save("test-1", messages);
    const loaded = store.load("test-1");
    expect(loaded).toEqual(messages);
  });

  it("returns null for unknown session", () => {
    const store = new SessionStore(TMP_ROOT);
    expect(store.load("nonexistent")).toBeNull();
  });

  it("delete removes session", () => {
    const store = new SessionStore(TMP_ROOT);
    store.save("to-delete", [{ role: "user", content: "bye" }]);
    expect(store.load("to-delete")).not.toBeNull();
    store.delete("to-delete");
    expect(store.load("to-delete")).toBeNull();
  });

  it("list returns all sessions with message counts", () => {
    const store = new SessionStore(TMP_ROOT);
    store.save("a", [{ role: "user", content: "1" }]);
    store.save("b", [{ role: "user", content: "2" }, { role: "assistant", content: "3" }]);
    const list = store.list();
    expect(list).toHaveLength(2);
    const a = list.find((s) => s.id === "a")!;
    const b = list.find((s) => s.id === "b")!;
    expect(a.messageCount).toBe(1);
    expect(b.messageCount).toBe(2);
  });

  it("upsert overwrites existing session", () => {
    const store = new SessionStore(TMP_ROOT);
    store.save("s1", [{ role: "user", content: "v1" }]);
    store.save("s1", [{ role: "user", content: "v2" }, { role: "assistant", content: "v3" }]);
    const loaded = store.load("s1");
    expect(loaded).toHaveLength(2);
    expect((loaded![0].content as string)).toBe("v2");
  });

  it("creates .godotforge directory if missing", () => {
    const fresh = join(TMP_ROOT, "subdir");
    mkdirSync(fresh, { recursive: true });
    const store = new SessionStore(fresh);
    store.save("x", [{ role: "user", content: "test" }]);
    expect(existsSync(join(fresh, ".godotforge", "sessions.db"))).toBe(true);
  });
});
