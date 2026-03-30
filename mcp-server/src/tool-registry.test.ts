import { describe, it, expect, beforeEach } from "vitest";

// We test the registry logic by importing and using it directly.
// Note: the registry is a singleton module, so we test in isolation.

describe("tool-registry", () => {
  it("registers and retrieves tools", async () => {
    // Dynamic import to get fresh module (registry is module-level state)
    const { registerTool, getAllToolDefinitions, getToolCount } = await import("./tool-registry.js");

    const countBefore = getToolCount();

    const { z } = await import("zod");
    registerTool("test.tool", "A test tool", {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results"),
    });

    expect(getToolCount()).toBe(countBefore + 1);

    const defs = getAllToolDefinitions();
    const testTool = defs.find((d) => d.name === "test.tool");
    expect(testTool).toBeDefined();
    expect(testTool!.description).toBe("A test tool");
    expect(testTool!.input_schema).toHaveProperty("type", "object");
    expect(testTool!.input_schema).toHaveProperty("properties");

    const props = testTool!.input_schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("query");
    expect(props).toHaveProperty("limit");
  });

  it("converts zod schemas to JSON Schema with required fields", async () => {
    const { registerTool, getAllToolDefinitions } = await import("./tool-registry.js");
    const { z } = await import("zod");

    registerTool("test.required", "Test required fields", {
      name: z.string().describe("Required name"),
      optional_field: z.string().optional().describe("Optional"),
    });

    const defs = getAllToolDefinitions();
    const tool = defs.find((d) => d.name === "test.required");
    expect(tool).toBeDefined();

    const required = tool!.input_schema.required as string[];
    expect(required).toContain("name");
    expect(required).not.toContain("optional_field");
  });
});
