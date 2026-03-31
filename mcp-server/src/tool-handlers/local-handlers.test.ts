import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { handleReadFile, handleListFiles } from "./local-handlers.js";

const TMP = "/tmp/local-handlers-test";

function mkdir(p: string) { mkdirSync(p, { recursive: true }); }
function write(p: string, content: string) { writeFileSync(p, content, "utf-8"); }

beforeEach(() => { mkdir(TMP); });
afterEach(() => { rmSync(TMP, { recursive: true, force: true }); });

// ── handleReadFile ──────────────────────────────────────────────────────────

describe("handleReadFile", () => {
  it("reads an existing file within the root", () => {
    write(join(TMP, "hello.txt"), "hello world");
    const result = handleReadFile(TMP, "hello.txt");
    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: "text", text: "hello world" });
  });

  it("blocks path traversal outside root", () => {
    const result = handleReadFile(TMP, "../../etc/passwd");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("within project root");
  });

  it("returns error for nonexistent file", () => {
    const result = handleReadFile(TMP, "does-not-exist.txt");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
  });
});

// ── handleListFiles ─────────────────────────────────────────────────────────

describe("handleListFiles", () => {
  it("lists entries in a directory", () => {
    write(join(TMP, "alpha.txt"), "a");
    write(join(TMP, "beta.txt"), "b");
    mkdir(join(TMP, "subdir"));

    const result = handleListFiles(TMP);
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text as string;
    expect(text).toContain("alpha.txt");
    expect(text).toContain("beta.txt");
    expect(text).toContain("subdir/");
  });

  it("returns empty directory message for an empty dir", () => {
    const empty = join(TMP, "empty");
    mkdir(empty);
    const result = handleListFiles(TMP, "empty");
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe("(empty directory)");
  });

  it("filters files by glob pattern", () => {
    write(join(TMP, "scene.tscn"), "");
    write(join(TMP, "script.gd"), "");
    write(join(TMP, "readme.md"), "");

    const result = handleListFiles(TMP, undefined, "*.gd");
    const text = result.content[0].text as string;
    expect(text).toContain("script.gd");
    expect(text).not.toContain("scene.tscn");
    expect(text).not.toContain("readme.md");
  });

  it("blocks directory traversal outside root", () => {
    const result = handleListFiles(TMP, "../../etc");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("within project root");
  });

  it("returns error for nonexistent subdirectory", () => {
    const result = handleListFiles(TMP, "ghost-dir");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
  });
});
