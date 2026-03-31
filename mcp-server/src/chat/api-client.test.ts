import { describe, it, expect, beforeEach } from "vitest";
import { clearRegistry, registerTool } from "../tool-registry.js";
import { getToolDefinitions } from "./api-client.js";
import { z } from "zod";

beforeEach(() => {
  clearRegistry();
});

describe("getToolDefinitions", () => {
  it("returns tool definitions from the registry when populated", () => {
    registerTool("my_tool", "Does something useful", {
      query: z.string().describe("The search query"),
    });
    registerTool("other_tool", "Another tool", {
      count: z.number().optional().describe("How many"),
    });

    const defs = getToolDefinitions();
    expect(defs.length).toBe(2);

    const names = defs.map((d) => d["name"]);
    expect(names).toContain("my_tool");
    expect(names).toContain("other_tool");

    const myTool = defs.find((d) => d["name"] === "my_tool");
    expect(myTool?.["description"]).toBe("Does something useful");
    expect(myTool?.["input_schema"]).toBeDefined();
  });

  it("returns fallback minimal set when registry is empty", () => {
    // Registry was cleared in beforeEach
    const defs = getToolDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(2);

    const names = defs.map((d) => d["name"] as string);
    expect(names).toContain("get_project_context");
    expect(names).toContain("search_docs");
  });
});
