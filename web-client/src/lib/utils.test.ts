import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false && "bar", undefined, null as unknown as string, "baz")).toBe("foo baz");
  });

  it("handles conditional object syntax", () => {
    expect(cn({ "font-bold": true, "text-red-500": false })).toBe("font-bold");
  });

  it("returns empty string when no args", () => {
    expect(cn()).toBe("");
  });

  it("merges conflicting background colors — last wins", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });
});
