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
 * Export from Blender with animations → GLB → Godot project.
 */
export async function blenderToGodotAnimated(
  blenderBridge: BlenderBridge,
  godotBridge: GodotBridge,
  projectRoot: string,
  args: Record<string, unknown>
): Promise<PipelineResult> {
  const targetDir = (args.target_dir as string) || "assets/models";
  const fileName = (args.file_name as string) || "export.glb";

  try {
    const fullTargetDir = join(projectRoot, targetDir);
    if (!existsSync(fullTargetDir)) {
      mkdirSync(fullTargetDir, { recursive: true });
    }

    const tempFileName = `godotforge_${Date.now()}_${fileName}`;
    const winTempPath = getWindowsTempPath(tempFileName);
    const wslTempPath = join(WIN_TEMP_WSL, tempFileName);

    // Export with animations
    const exportResult = await blenderBridge.executeTool("export_with_animations", {
      filepath: winTempPath,
    });

    if (exportResult.is_error) {
      return {
        content: [{ type: "text" as const, text: `Export failed: ${exportResult.result}` }],
        isError: true,
      };
    }

    const finalPath = join(fullTargetDir, fileName);
    copyFileSync(wslTempPath, finalPath);
    try { unlinkSync(wslTempPath); } catch { /* ignore */ }

    // Trigger Godot rescan
    try {
      await godotBridge.executeTool("execute_editor_script", {
        code: 'EditorInterface.get_resource_filesystem().scan()\n_result = "Filesystem rescanned"',
      });
    } catch { /* Godot may not be running */ }

    return {
      content: [{
        type: "text" as const,
        text: `Pipeline complete (with animations): Blender → res://${targetDir}/${fileName}`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Pipeline failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

/**
 * Generate collision shapes in Blender (via naming hints) and export for Godot.
 * Godot auto-detects -col, -colonly, -trimesh suffixes on GLTF import.
 */
export async function syncCollision(
  blenderBridge: BlenderBridge,
  godotBridge: GodotBridge,
  projectRoot: string,
  args: Record<string, unknown>
): Promise<PipelineResult> {
  const objectName = args.object_name as string;
  const collisionType = (args.collision_type as string) || "convex";

  if (!objectName) {
    return {
      content: [{ type: "text" as const, text: "object_name is required" }],
      isError: true,
    };
  }

  try {
    // Create collision hint in Blender
    const hintResult = await blenderBridge.executeTool("generate_collision_hints", {
      name: objectName,
      type: collisionType,
    });

    if (hintResult.is_error) {
      return {
        content: [{ type: "text" as const, text: `Collision hint failed: ${hintResult.result}` }],
        isError: true,
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: `Collision hint created. ${hintResult.result}\nExport with pipeline.blender_to_godot to import with collision shapes.`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Collision sync failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

/**
 * Batch import multiple GLB files from a directory into the Godot project.
 */
export async function batchImport(
  godotBridge: GodotBridge,
  projectRoot: string,
  args: Record<string, unknown>
): Promise<PipelineResult> {
  const sourceDir = args.source_dir as string;
  const targetDir = (args.target_dir as string) || "assets/models";

  if (!sourceDir) {
    return {
      content: [{ type: "text" as const, text: "source_dir is required" }],
      isError: true,
    };
  }

  try {
    const fullSourceDir = join(projectRoot, sourceDir);
    const fullTargetDir = join(projectRoot, targetDir);

    if (!existsSync(fullSourceDir)) {
      return {
        content: [{ type: "text" as const, text: `Source directory not found: ${sourceDir}` }],
        isError: true,
      };
    }

    if (!existsSync(fullTargetDir)) {
      mkdirSync(fullTargetDir, { recursive: true });
    }

    const { readdirSync } = await import("fs");
    const files = readdirSync(fullSourceDir).filter(f =>
      f.endsWith(".glb") || f.endsWith(".gltf") || f.endsWith(".fbx") || f.endsWith(".obj")
    );

    let imported = 0;
    for (const file of files) {
      const src = join(fullSourceDir, file);
      const dst = join(fullTargetDir, file);
      copyFileSync(src, dst);
      imported++;
    }

    // Trigger Godot rescan
    try {
      await godotBridge.executeTool("execute_editor_script", {
        code: 'EditorInterface.get_resource_filesystem().scan()\n_result = "Filesystem rescanned"',
      });
    } catch { /* Godot may not be running */ }

    return {
      content: [{
        type: "text" as const,
        text: `Batch imported ${imported} files from ${sourceDir} → ${targetDir}`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Batch import failed: ${error instanceof Error ? error.message : error}` }],
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
