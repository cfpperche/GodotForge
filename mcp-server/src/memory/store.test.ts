import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trimMemory } from "./store.js";

describe("trimMemory", () => {
  it("keeps header and trims entries per section", () => {
    const content = `# GodotForge Project Memory

## Conventions

- [2024-01-01] old entry 1
- [2024-01-02] old entry 2
- [2024-06-01] new entry 1
- [2024-06-02] new entry 2

## Patterns

- [2024-01-01] pattern 1
- [2024-06-01] pattern 2
`;

    const result = trimMemory(content, 10000);

    expect(result).toContain("# GodotForge Project Memory");
    expect(result).toContain("## Conventions");
    expect(result).toContain("## Patterns");
    // Should keep at least half (min 5, but only 4 entries → keeps all since ceil(4/2)=2, max(2,5)=5 > 4)
    expect(result).toContain("new entry 2");
  });

  it("keeps minimum 5 entries per section when available", () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      `- [2024-01-${String(i + 1).padStart(2, "0")}] entry ${i + 1}`
    ).join("\n");

    const content = `# Memory\n\n## Section\n\n${entries}\n`;
    const result = trimMemory(content, 10000);

    // ceil(20/2) = 10, max(10, 5) = 10 → keeps last 10
    expect(result).toContain("entry 20");
    expect(result).toContain("entry 11");
    expect(result).not.toContain("entry 10");
  });

  it("hard truncates when still over target size", () => {
    const bigEntry = "- [2024-01-01] " + "x".repeat(1000);
    const content = `# Memory\n\n## Section\n\n${bigEntry}\n${bigEntry}\n${bigEntry}\n`;

    const result = trimMemory(content, 500);

    expect(result).toContain("[Archived");
    expect(result.length).toBeLessThanOrEqual(500 + 100); // header overhead
  });

  it("handles empty content", () => {
    const result = trimMemory("", 10000);
    expect(result).toBe("");
  });

  it("handles content with no sections", () => {
    const result = trimMemory("# Just a header\n\nSome text", 10000);
    expect(result).toContain("# Just a header");
  });
});

describe("memory section insertion logic", () => {
  // Test the append logic pattern used in appendMemory
  function insertEntry(existing: string, category: string, entry: string): string {
    const sectionHeader = `## ${category}`;
    const sectionIndex = existing.indexOf(sectionHeader);

    if (sectionIndex === -1) {
      return existing + `\n${sectionHeader}\n\n${entry}\n`;
    }

    const afterHeader = sectionIndex + sectionHeader.length;
    const nextSection = existing.indexOf("\n## ", afterHeader);
    const insertAt = nextSection === -1 ? existing.length : nextSection;

    const before = existing.slice(0, insertAt).trimEnd();
    const after = existing.slice(insertAt);
    return `${before}\n${entry}\n${after}`;
  }

  it("appends to existing section", () => {
    const existing = `# Memory\n\n## Conventions\n\n- old entry\n\n## Patterns\n\n`;
    const result = insertEntry(existing, "Conventions", "- new entry");

    expect(result).toContain("- old entry\n- new entry");
    expect(result).toContain("## Patterns");
  });

  it("creates new section when category missing", () => {
    const existing = `# Memory\n\n## Conventions\n\n`;
    const result = insertEntry(existing, "NewCategory", "- entry");

    expect(result).toContain("## NewCategory");
    expect(result).toContain("- entry");
  });

  it("inserts before next section", () => {
    const existing = `# Memory\n\n## A\n\n- a1\n\n## B\n\n- b1\n`;
    const result = insertEntry(existing, "A", "- a2");

    const aIndex = result.indexOf("## A");
    const bIndex = result.indexOf("## B");
    const newEntryIndex = result.indexOf("- a2");

    expect(newEntryIndex).toBeGreaterThan(aIndex);
    expect(newEntryIndex).toBeLessThan(bIndex);
  });
});
