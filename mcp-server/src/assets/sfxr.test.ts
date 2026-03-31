import { describe, it, expect } from "vitest";
import { generateSfx } from "./sfxr.js";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

const TMP_DIR = "/tmp/godotforge-sfxr-test";

describe("sfxr", () => {
  it("generates WAV file from preset", async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const dest = join(TMP_DIR, "test_explosion.wav");

    const result = await generateSfx({ preset: "explosion" }, dest);

    expect(result.size).toBeGreaterThan(0);
    expect(existsSync(dest)).toBe(true);

    // Clean up
    unlinkSync(dest);
  });

  it("applies parameter overrides", async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const dest = join(TMP_DIR, "test_custom.wav");

    const result = await generateSfx({
      preset: "laserShoot",
      wave_type: 1,
      p_base_freq: 0.8,
      sound_vol: 0.3,
    }, dest);

    expect(result.size).toBeGreaterThan(0);
    expect(existsSync(dest)).toBe(true);

    unlinkSync(dest);
  });

  it("rejects unknown preset", async () => {
    const dest = join(TMP_DIR, "bad.wav");
    await expect(
      generateSfx({ preset: "nonexistent" as "explosion" }, dest)
    ).rejects.toThrow();
  });
});
