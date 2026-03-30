import { describe, it, expect, beforeEach } from "vitest";
import { registerTool, getAllToolDefinitions, getToolCount, clearRegistry } from "./tool-registry.js";
import { z } from "zod";

describe("tool-registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers and retrieves tools", () => {
    registerTool("test.tool", "A test tool", {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results"),
    });

    expect(getToolCount()).toBe(1);

    const defs = getAllToolDefinitions();
    const testTool = defs.find((d) => d.name === "test.tool");
    expect(testTool).toBeDefined();
    expect(testTool!.description).toBe("A test tool");
    expect(testTool!.input_schema).toHaveProperty("type", "object");

    const props = testTool!.input_schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("query");
    expect(props).toHaveProperty("limit");
  });

  it("converts zod schemas to JSON Schema with required fields", () => {
    registerTool("test.required", "Test required fields", {
      name: z.string().describe("Required name"),
      optional_field: z.string().optional().describe("Optional"),
    });

    const tool = getAllToolDefinitions().find((d) => d.name === "test.required");
    expect(tool).toBeDefined();

    const required = tool!.input_schema.required as string[];
    expect(required).toContain("name");
    expect(required).not.toContain("optional_field");
  });

  it("deduplicates by name", () => {
    registerTool("dup", "First", { a: z.string() });
    registerTool("dup", "Second", { b: z.string() });

    expect(getToolCount()).toBe(1);
    expect(getAllToolDefinitions()[0].description).toBe("First");
  });

  it("handles empty schema", () => {
    registerTool("empty", "No params", {});
    const tool = getAllToolDefinitions().find((d) => d.name === "empty");
    expect(tool).toBeDefined();
    expect(tool!.input_schema).toHaveProperty("type", "object");
  });

  it("clearRegistry resets state", () => {
    registerTool("a", "A", {});
    expect(getToolCount()).toBe(1);
    clearRegistry();
    expect(getToolCount()).toBe(0);
  });
});
