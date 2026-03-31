import { readFileSync, existsSync, mkdirSync, cpSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync, execFile } from "child_process";
import { promisify } from "util";
import { type ConfigManager } from "../config.js";

const execFileAsync = promisify(execFile);

export function getRepoRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  return join(dirname(__filename), "..", "..", "..");
}

/** Read version from plugin.cfg: version="X.Y.Z" */
export function readGodotPluginVersion(pluginDir: string): string {
  try {
    const cfg = readFileSync(join(pluginDir, "plugin.cfg"), "utf-8");
    const match = cfg.match(/version="([^"]+)"/);
    return match?.[1] || "0.0.0";
  } catch { return "0.0.0"; }
}

/** Read version from __init__.py: "version": (X, Y, Z) */
export function readBlenderAddonVersion(addonDir: string): string {
  try {
    const init = readFileSync(join(addonDir, "__init__.py"), "utf-8");
    const match = init.match(/"version":\s*\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : "0.0.0";
  } catch { return "0.0.0"; }
}

/** Compare semver strings: returns true if a > b */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

export function getWindowsUser(
  config: ConfigManager,
  cachedWinUser: { value: string | null | undefined }
): string | null {
  if (cachedWinUser.value !== undefined) return cachedWinUser.value;
  const paths = [config.getPath("blender_executable"), config.getPath("windows_temp")];
  for (const p of paths) {
    const m = p.match(/\/mnt\/c\/(?:Users|users)\/([^/]+)/);
    if (m) { cachedWinUser.value = m[1]; return cachedWinUser.value; }
  }
  try {
    cachedWinUser.value = execSync("cmd.exe /C echo %USERNAME%", { stdio: "pipe" }).toString().trim();
  } catch {
    cachedWinUser.value = null;
  }
  return cachedWinUser.value;
}

export function getBlenderAddonDir(
  config: ConfigManager,
  cachedWinUser: { value: string | null | undefined }
): string | null {
  const blenderPath = config.getPath("blender_executable");
  if (!blenderPath) return null;

  const vMatch = blenderPath.match(/Blender\s+(\d+\.\d+)/i);
  if (!vMatch) return null;

  const winUser = getWindowsUser(config, cachedWinUser);
  if (!winUser) return null;

  return `/mnt/c/Users/${winUser}/AppData/Roaming/Blender Foundation/Blender/${vMatch[1]}/scripts/addons/godotforge`;
}

/** Get bundled versions + installed versions for status */
export function getVersionStatus(
  projectRoot: string,
  config: ConfigManager,
  cachedWinUser: { value: string | null | undefined }
): {
  bundled: { godot_plugin: string; blender_addon: string };
  installed: { godot_plugin: string; blender_addon: string };
  outdated: { godot_plugin: boolean; blender_addon: boolean };
} {
  const repoRoot = getRepoRoot();
  const bundledGodot = readGodotPluginVersion(join(repoRoot, "addons", "godotforge"));
  const bundledBlender = readBlenderAddonVersion(join(repoRoot, "blender-addon", "godotforge"));

  const installedGodot = readGodotPluginVersion(join(projectRoot, "addons", "godotforge"));

  const blenderAddonDir = getBlenderAddonDir(config, cachedWinUser);
  let installedBlender = "0.0.0";
  if (blenderAddonDir) {
    installedBlender = readBlenderAddonVersion(blenderAddonDir);
  }

  return {
    bundled: { godot_plugin: bundledGodot, blender_addon: bundledBlender },
    installed: { godot_plugin: installedGodot, blender_addon: installedBlender },
    outdated: {
      godot_plugin: isNewer(bundledGodot, installedGodot),
      blender_addon: isNewer(bundledBlender, installedBlender),
    },
  };
}

export async function provisionBlenderAddon(
  config: ConfigManager,
  cachedWinUser: { value: string | null | undefined },
  force: boolean = false
): Promise<void> {
  const destDir = getBlenderAddonDir(config, cachedWinUser);
  if (!destDir) {
    console.error("[GodotForge] Cannot determine Blender addon directory, skipping provision");
    return;
  }

  const blenderPath = config.getPath("blender_executable");

  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = join(dirname(__filename), "..", "..", "..");
  const srcAddon = join(repoRoot, "blender-addon", "godotforge");

  if (!existsSync(join(srcAddon, "__init__.py"))) {
    console.error(`[GodotForge] Source Blender addon not found at ${srcAddon}`);
    return;
  }

  const srcVersion = readBlenderAddonVersion(srcAddon);
  const destVersion = readBlenderAddonVersion(destDir);

  if (!force && existsSync(join(destDir, "__init__.py")) && !isNewer(srcVersion, destVersion)) {
    console.error(`[GodotForge] Blender addon up to date (v${destVersion})`);
    return;
  }

  const isUpdate = existsSync(join(destDir, "__init__.py"));
  try {
    mkdirSync(dirname(destDir), { recursive: true });
    cpSync(srcAddon, destDir, { recursive: true });
    console.error(`[GodotForge] ${isUpdate ? "Updated" : "Installed"} Blender addon (v${srcVersion}) to ${destDir}`);

    const enableScript = join(destDir, "_enable.py");
    writeFileSync(enableScript, [
      "import bpy",
      'bpy.ops.preferences.addon_enable(module="godotforge")',
      "bpy.ops.wm.save_userpref()",
      'print("[GodotForge] Addon enabled")',
    ].join("\n"));

    try {
      await execFileAsync(blenderPath, ["--background", "--python", enableScript], { timeout: 30000 });
      console.error("[GodotForge] Blender addon enabled via preferences");
    } catch {
      console.error("[GodotForge] Could not auto-enable addon (Blender may not be available). User can enable manually.");
    }

    try { unlinkSync(enableScript); } catch { /* ignore */ }
  } catch (error) {
    console.error(`[GodotForge] Failed to install Blender addon: ${error}`);
  }
}

export function provisionGodotPlugin(projectRoot: string, force: boolean = false): void {
  const destPlugin = join(projectRoot, "addons", "godotforge");
  const repoRoot = getRepoRoot();
  const srcPlugin = join(repoRoot, "addons", "godotforge");

  if (!existsSync(join(srcPlugin, "plugin.cfg"))) {
    console.error(`[GodotForge] Source addon not found at ${srcPlugin}, skipping provision`);
    return;
  }

  const srcVersion = readGodotPluginVersion(srcPlugin);
  const destVersion = readGodotPluginVersion(destPlugin);

  if (!force && existsSync(join(destPlugin, "plugin.cfg")) && !isNewer(srcVersion, destVersion)) {
    console.error(`[GodotForge] Godot plugin up to date (v${destVersion})`);
    return;
  }

  const isUpdate = existsSync(join(destPlugin, "plugin.cfg"));
  try {
    mkdirSync(join(projectRoot, "addons"), { recursive: true });
    cpSync(srcPlugin, destPlugin, { recursive: true });
    console.error(`[GodotForge] ${isUpdate ? "Updated" : "Provisioned"} Godot plugin (v${srcVersion}) into ${destPlugin}`);

    const godotFile = join(projectRoot, "project.godot");
    if (existsSync(godotFile)) {
      const content = readFileSync(godotFile, "utf-8");
      if (!content.includes("editor_plugins")) {
        writeFileSync(godotFile, content + '\n[editor_plugins]\n\nenabled=PackedStringArray("res://addons/godotforge/plugin.cfg")\n');
        console.error("[GodotForge] Enabled plugin in project.godot");
      }
    }
  } catch (error) {
    console.error(`[GodotForge] Failed to provision plugin: ${error}`);
  }
}
