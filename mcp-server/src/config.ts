/**
 * Centralized API key / config manager.
 * Priority: env vars → .godotforge/config.json → empty.
 * Never logs or exposes keys in responses.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync as execSyncFn } from "child_process";

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

/** System-level paths and settings. */
export interface SystemPaths {
  godot_executable: string;
  blender_executable: string;
  windows_temp: string;
}

export class ConfigManager {
  private projectRoot: string;
  private configPath: string;
  private cache: Partial<ServiceKeys> | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configPath = join(projectRoot, CONFIG_DIR, CONFIG_FILE);
  }

  /**
   * Get a system path. Priority: config.json → env var → auto-detect.
   */
  getPath(key: keyof SystemPaths): string {
    const config = this.readConfig();
    const val = config.paths?.[key];
    if (val) return val;

    // Env var fallbacks
    const envMap: Record<keyof SystemPaths, string> = {
      godot_executable: "GODOT_EXECUTABLE",
      blender_executable: "BLENDER_EXECUTABLE",
      windows_temp: "GODOTFORGE_TEMP",
    };
    const envVal = process.env[envMap[key]];
    if (envVal) return envVal;

    // Auto-detect
    return this.autoDetectPath(key);
  }

  /**
   * Set a system path in config.
   */
  setPath(key: keyof SystemPaths, value: string): void {
    const config = this.readConfig();
    if (!config.paths) config.paths = {};
    config.paths[key] = value;
    this.writeConfig(config);
    this.cache = null;
  }

  /**
   * Get all paths with their sources.
   */
  getPathsStatus(): Record<string, { value: string; source: "config" | "env" | "auto" }> {
    const result: Record<string, { value: string; source: "config" | "env" | "auto" }> = {};
    const config = this.readConfig();
    const envMap: Record<string, string> = {
      godot_executable: "GODOT_EXECUTABLE",
      blender_executable: "BLENDER_EXECUTABLE",
      windows_temp: "GODOTFORGE_TEMP",
    };

    for (const key of ["godot_executable", "blender_executable", "windows_temp"] as const) {
      if (config.paths?.[key]) {
        result[key] = { value: config.paths[key], source: "config" };
      } else if (process.env[envMap[key]]) {
        result[key] = { value: process.env[envMap[key]]!, source: "env" };
      } else {
        result[key] = { value: this.autoDetectPath(key), source: "auto" };
      }
    }
    return result;
  }

  autoDetectPath(key: keyof SystemPaths): string {
    switch (key) {
      case "windows_temp": {
        // Try to detect Windows temp via cmd.exe
        try {
          const winTemp = execSyncFn("cmd.exe /C echo %TEMP% 2>/dev/null", { encoding: "utf-8" }).trim();
          if (winTemp && !winTemp.includes("%TEMP%")) return winTemp;
        } catch { /* not on Windows/WSL */ }
        // Fallback: derive from HOME
        const home = process.env.HOME || "/tmp";
        const wslUser = home.split("/").pop() || "";
        const candidate = `/mnt/c/Users/${wslUser}/AppData/Local/Temp`;
        if (existsSync(candidate)) {
          const drive = "C";
          return `${drive}:\\Users\\${wslUser}\\AppData\\Local\\Temp`;
        }
        return "C:\\Windows\\Temp";
      }
      case "godot_executable":
        return "";
      case "blender_executable":
        return "";
    }
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

  private readConfig(): { keys?: Partial<ServiceKeys>; paths?: Partial<SystemPaths>; [k: string]: unknown } {
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
