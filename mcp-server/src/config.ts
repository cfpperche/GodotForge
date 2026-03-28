/**
 * Centralized API key / config manager.
 * Priority: env vars → .godotforge/config.json → empty.
 * Never logs or exposes keys in responses.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const CONFIG_DIR = ".godotforge";
const CONFIG_FILE = "config.json";

/** All supported service keys. */
export interface ServiceKeys {
  anthropic: string;
  sketchfab: string;
  polyhaven: string; // public API, but store preferences
  rodin: string;
  meshy: string;
  tripo: string;
  stability: string; // Stable Diffusion
  openai: string; // DALL-E
  elevenlabs: string;
  suno: string;
  blockade_labs: string; // Skybox
  huggingface: string;
}

/** Env var names mapped to service keys. */
const ENV_MAP: Record<keyof ServiceKeys, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  sketchfab: "SKETCHFAB_API_KEY",
  polyhaven: "POLYHAVEN_API_KEY",
  rodin: "RODIN_API_KEY",
  meshy: "MESHY_API_KEY",
  tripo: "TRIPO_API_KEY",
  stability: "STABILITY_API_KEY",
  openai: "OPENAI_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
  suno: "SUNO_API_KEY",
  blockade_labs: "BLOCKADE_LABS_API_KEY",
  huggingface: "HUGGINGFACE_API_KEY",
};

export class ConfigManager {
  private projectRoot: string;
  private configPath: string;
  private cache: Partial<ServiceKeys> | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configPath = join(projectRoot, CONFIG_DIR, CONFIG_FILE);
  }

  /**
   * Get a service API key. Priority: env var → config file → empty string.
   */
  getKey(service: keyof ServiceKeys): string {
    // 1. Check env var
    const envName = ENV_MAP[service];
    const envVal = process.env[envName];
    if (envVal) return envVal;

    // 2. Check config file
    const config = this.readConfig();
    const fileVal = config.keys?.[service];
    if (fileVal) return fileVal;

    return "";
  }

  /**
   * Check if a service has a key configured.
   */
  hasKey(service: keyof ServiceKeys): boolean {
    return this.getKey(service) !== "";
  }

  /**
   * Set a key in the local config file.
   */
  setKey(service: keyof ServiceKeys, value: string): void {
    const config = this.readConfig();
    if (!config.keys) config.keys = {};
    config.keys[service] = value;
    this.writeConfig(config);
    this.cache = null; // invalidate cache
  }

  /**
   * Remove a key from the local config file.
   */
  removeKey(service: keyof ServiceKeys): void {
    const config = this.readConfig();
    if (config.keys) {
      delete config.keys[service];
      this.writeConfig(config);
      this.cache = null;
    }
  }

  /**
   * Get status of all services (configured or not, source).
   * Never returns actual key values.
   */
  getStatus(): Record<string, { configured: boolean; source: "env" | "config" | "none" }> {
    const status: Record<string, { configured: boolean; source: "env" | "config" | "none" }> = {};
    const config = this.readConfig();

    for (const service of Object.keys(ENV_MAP) as Array<keyof ServiceKeys>) {
      const envName = ENV_MAP[service];
      if (process.env[envName]) {
        status[service] = { configured: true, source: "env" };
      } else if (config.keys?.[service]) {
        status[service] = { configured: true, source: "config" };
      } else {
        status[service] = { configured: false, source: "none" };
      }
    }

    return status;
  }

  /**
   * Get all configured keys as a flat object (for internal use only).
   */
  getAllKeys(): Partial<ServiceKeys> {
    const keys: Partial<ServiceKeys> = {};
    for (const service of Object.keys(ENV_MAP) as Array<keyof ServiceKeys>) {
      const val = this.getKey(service);
      if (val) keys[service] = val;
    }
    return keys;
  }

  private readConfig(): { keys?: Partial<ServiceKeys>; [k: string]: unknown } {
    if (this.cache !== null) {
      return { keys: this.cache };
    }

    if (!existsSync(this.configPath)) {
      return {};
    }

    try {
      const raw = readFileSync(this.configPath, "utf-8");
      const parsed = JSON.parse(raw);
      this.cache = parsed.keys || null;
      return parsed;
    } catch {
      return {};
    }
  }

  private writeConfig(config: Record<string, unknown>): void {
    const dir = join(this.projectRoot, CONFIG_DIR);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }
}
