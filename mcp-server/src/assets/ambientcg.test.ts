import { describe, it, expect } from "vitest";
import { buildDownloadUrl } from "./ambientcg.js";

describe("ambientcg", () => {
  describe("buildDownloadUrl", () => {
    it("builds correct URL for 1K JPG", () => {
      const url = buildDownloadUrl("Metal063", "1K", "JPG");
      expect(url).toBe("https://ambientcg.com/get?file=Metal063_1K-JPG.zip");
    });

    it("builds correct URL for 4K PNG", () => {
      const url = buildDownloadUrl("WoodFloor051", "4K", "PNG");
      expect(url).toBe("https://ambientcg.com/get?file=WoodFloor051_4K-PNG.zip");
    });

    it("encodes special characters in asset ID", () => {
      const url = buildDownloadUrl("Test Asset+1", "2K", "JPG");
      expect(url).toContain("Test%20Asset%2B1");
    });
  });
});
