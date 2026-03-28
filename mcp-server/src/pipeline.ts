/**
 * Pipeline module — orchestrates asset flow between Blender and Godot.
 * Phase A: blender_to_godot (export GLB from Blender, import into Godot project).
 */

import { BlenderBridge } from "./blender-bridge.js";
import { GodotBridge } from "./bridge.js";
import { existsSync, mkdirSync, copyFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export interface PipelineResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/** Windows temp directory accessible from both WSL and Blender. */
const WIN_TEMP_WSL = "/mnt/c/Users/cfpp/AppData/Local/Temp";

/**
 * Export from Blender as GLB → copy into Godot project → trigger reimport.
 */
export async function blenderToGodot(
  blenderBridge: BlenderBridge,
  godotBridge: GodotBridge,
  projectRoot: string,
  args: Record<string, unknown>
): Promise<PipelineResult> {
  const targetDir = (args.target_dir as string) || "assets/models";
  const fileName = (args.file_name as string) || "export.glb";

  try {
    // 1. Ensure target directory exists in Godot project
    const fullTargetDir = join(projectRoot, targetDir);
    if (!existsSync(fullTargetDir)) {
      mkdirSync(fullTargetDir, { recursive: true });
    }

    // 2. Export to Windows temp (Blender can't write to WSL paths directly)
    const tempFileName = `godotforge_${Date.now()}_${fileName}`;
    const winTempPath = getWindowsTempPath(tempFileName);
    const wslTempPath = join(WIN_TEMP_WSL, tempFileName);

    const exportResult = await blenderBridge.executeTool("export_for_godot", {
      filepath: winTempPath,
    });

    if (exportResult.is_error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Blender export failed: ${exportResult.result}`,
          },
        ],
        isError: true,
      };
    }

    // 3. Copy from Windows temp to project directory
    const finalPath = join(fullTargetDir, fileName);
    copyFileSync(wslTempPath, finalPath);

    // Clean up temp file
    try { unlinkSync(wslTempPath); } catch { /* ignore */ }

    // 4. Trigger Godot filesystem rescan
    try {
      await godotBridge.executeTool("execute_editor_script", {
        code: 'EditorInterface.get_resource_filesystem().scan()\n_result = "Filesystem rescanned"',
      });
    } catch {
      // Godot might not be running — that's ok, file is still in place
    }

    const godotPath = `res://${targetDir}/${fileName}`;
    return {
      content: [
        {
          type: "text" as const,
          text: `Pipeline complete: Blender → ${godotPath}\n${exportResult.result}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Pipeline failed: ${error instanceof Error ? error.message : error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get a Windows-native temp path for Blender to write to.
 * Detects the Windows temp directory dynamically.
 */
function getWindowsTempPath(filename: string): string {
  try {
    const winTemp = execSync("cmd.exe /C echo %TEMP%", { encoding: "utf-8" }).trim();
    return `${winTemp}\\${filename}`;
  } catch {
    return `C:\\Users\\cfpp\\AppData\\Local\\Temp\\${filename}`;
  }
}
