import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchDocs, getClassReference } from "./search.js";

// Mock better-sqlite3 — we test the logic, not the database
function createMockDb(rows: unknown[] = []) {
  const stmt = {
    all: vi.fn((..._args: unknown[]) => rows),
    get: vi.fn((..._args: unknown[]) => rows[0] ?? undefined),
  };
  return {
    prepare: vi.fn(() => stmt),
    _stmt: stmt,
  };
}

describe("searchDocs", () => {
  it("builds FTS query and returns results", () => {
    const mockResults = [
      { symbol_name: "Node2D", class_name: "Node2D", kind: "class", description: "2D node" },
    ];
    const db = createMockDb(mockResults);

    const results = searchDocs(db as any, "Node2D");

    expect(db.prepare).toHaveBeenCalledOnce();
    expect(results).toEqual(mockResults);
  });

  it("passes kind filter when provided", () => {
    const db = createMockDb([]);

    searchDocs(db as any, "position", "property", 5);

    // The SQL should have AND kind = ? clause
    const sql = db.prepare.mock.calls[0][0] as string;
    expect(sql).toContain("AND kind = ?");
  });

  it("skips kind filter for 'all'", () => {
    const db = createMockDb([]);

    searchDocs(db as any, "position", "all", 5);

    const sql = db.prepare.mock.calls[0][0] as string;
    expect(sql).not.toContain("AND kind = ?");
  });

  it("defaults limit to 10", () => {
    const db = createMockDb([]);

    searchDocs(db as any, "test");

    // Last param to .all() should be 10 (limit)
    const allArgs = db._stmt.all.mock.calls[0];
    expect(allArgs[allArgs.length - 1]).toBe(10);
  });
});

describe("getClassReference", () => {
  it("returns null when class not found", () => {
    const db = createMockDb([]);

    const result = getClassReference(db as any, "NonExistent");

    expect(result).toBeNull();
  });

  it("returns full class reference with methods, properties, signals, constants", () => {
    const classRow = {
      id: 1,
      name: "Sprite2D",
      inherits: "Node2D",
      brief_description: "A 2D sprite",
      description: "Full description",
    };

    // We need separate stmts for each prepare call
    const stmts = [
      { all: vi.fn(), get: vi.fn(() => classRow) },           // classes query
      { all: vi.fn(() => [{ name: "set_texture", return_type: "void", qualifiers: "", description: "Set texture", params_json: "[]" }]), get: vi.fn() }, // methods
      { all: vi.fn(() => [{ name: "texture", type: "Texture2D", default_value: "", description: "The texture" }]), get: vi.fn() }, // properties
      { all: vi.fn(() => []), get: vi.fn() }, // signals
      { all: vi.fn(() => []), get: vi.fn() }, // constants
    ];
    let callIndex = 0;
    const db = { prepare: vi.fn(() => stmts[callIndex++]) };

    const result = getClassReference(db as any, "Sprite2D");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Sprite2D");
    expect(result!.inherits).toBe("Node2D");
    expect(result!.methods).toHaveLength(1);
    expect(result!.methods[0].name).toBe("set_texture");
    expect(result!.methods[0].params).toEqual([]);
    expect(result!.properties).toHaveLength(1);
    expect(result!.properties[0].name).toBe("texture");
  });

  it("parses params_json safely", () => {
    const classRow = { id: 1, name: "Test", inherits: "", brief_description: "", description: "" };
    const stmts = [
      { all: vi.fn(), get: vi.fn(() => classRow) },
      { all: vi.fn(() => [{ name: "m", return_type: "void", qualifiers: "", description: "", params_json: "INVALID JSON" }]), get: vi.fn() },
      { all: vi.fn(() => []), get: vi.fn() },
      { all: vi.fn(() => [{ name: "s", description: "", params_json: null }]), get: vi.fn() },
      { all: vi.fn(() => []), get: vi.fn() },
    ];
    let i = 0;
    const db = { prepare: vi.fn(() => stmts[i++]) };

    const result = getClassReference(db as any, "Test");

    expect(result!.methods[0].params).toEqual([]); // invalid JSON → empty
    expect(result!.signals[0].params).toEqual([]); // null → empty
  });
});
