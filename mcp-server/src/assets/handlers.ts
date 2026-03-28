/**
 * Asset service tool handlers — Poly Haven + Sketchfab + OpenGameArt + local.
 */

import { searchPolyHaven, getPolyHavenInfo, getPolyHavenFiles, downloadPolyHavenFile } from "./polyhaven.js";
import { searchSketchfab, getSketchfabDownload, downloadSketchfabModel } from "./sketchfab.js";
import { searchOpenGameArt, getOGADownloadLinks } from "./opengameart.js";
import { ConfigManager } from "../config.js";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, basename, extname } from "path";
import { execSync } from "child_process";

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ==================== Poly Haven ====================

export async function handleSearchPolyHaven(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const type = (args.type as string) || "all";
  const categories = args.categories as string | undefined;

  try {
    const assets = await searchPolyHaven(
      type as "hdris" | "textures" | "models" | "all",
      categories
    );

    // Limit to top 20 by download count
    const sorted = assets
      .sort((a, b) => b.download_count - a.download_count)
      .slice(0, 20);

    const formatted = sorted
      .map(
        (a) =>
          `[${a.type}] ${a.id} — "${a.name}" (${a.categories.join(", ")}) downloads: ${a.download_count}`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Poly Haven — ${assets.length} assets found (showing top 20):\n\n${formatted}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Search failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

export async function handleDownloadPolyHaven(
  args: Record<string, unknown>,
  projectRoot: string
): Promise<ToolResult> {
  const assetId = args.asset_id as string;
  const resolution = (args.resolution as string) || "1k";
  const format = (args.format as string) || "jpg";
  const targetDir = (args.target_dir as string) || "assets/textures";

  if (!assetId) {
    return { content: [{ type: "text" as const, text: "asset_id is required" }], isError: true };
  }

  try {
    // Get file tree
    const files = await getPolyHavenFiles(assetId);
    const fullTargetDir = join(projectRoot, targetDir);
    if (!existsSync(fullTargetDir)) {
      mkdirSync(fullTargetDir, { recursive: true });
    }

    // Navigate file tree to find the right resolution/format
    const downloaded: string[] = [];

    // For textures, files are organized by channel (diffuse, normal, etc.)
    // For HDRIs, files are organized by resolution
    // For models, files are organized by format (gltf, fbx, etc.)
    const fileEntries = flattenFileTree(files, resolution, format);

    for (const entry of fileEntries.slice(0, 10)) {
      const destPath = join(fullTargetDir, entry.filename);
      await downloadPolyHavenFile(entry.url, destPath);
      downloaded.push(`res://${targetDir}/${entry.filename}`);
    }

    // Trigger Godot rescan
    if (downloaded.length > 0) {
      await triggerGodotRescan(projectRoot);
    }

    if (downloaded.length === 0) {
      // Try to provide helpful info about what's available
      const info = await getPolyHavenInfo(assetId);
      return {
        content: [{
          type: "text" as const,
          text: `No files found for resolution '${resolution}' format '${format}'.\nAsset info: ${JSON.stringify(info, null, 2).slice(0, 500)}`,
        }],
        isError: true,
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: `Downloaded ${downloaded.length} files from Poly Haven '${assetId}':\n${downloaded.join("\n")}`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Download failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

// ==================== Sketchfab ====================

export async function handleSearchSketchfab(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const query = args.query as string;
  const downloadable = args.downloadable !== false;
  const animated = args.animated as boolean | undefined;
  const count = (args.count as number) || 10;

  if (!query) {
    return { content: [{ type: "text" as const, text: "query is required" }], isError: true };
  }

  try {
    const result = await searchSketchfab(query, { downloadable, animated, count });

    const formatted = result.models
      .map(
        (m) =>
          `${m.name} [${m.uid}]\n  ${m.license} | ${m.vertexCount} verts | downloadable: ${m.isDownloadable}\n  ${m.viewerUrl}`
      )
      .join("\n\n");

    return {
      content: [{
        type: "text" as const,
        text: `Sketchfab — ${result.total} results for "${query}" (showing ${result.models.length}):\n\n${formatted}`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Search failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

export async function handleDownloadSketchfab(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const uid = args.uid as string;
  const targetDir = (args.target_dir as string) || "assets/models";

  if (!uid) {
    return { content: [{ type: "text" as const, text: "uid is required" }], isError: true };
  }

  const apiToken = config.getKey("sketchfab");
  if (!apiToken) {
    return {
      content: [{
        type: "text" as const,
        text: "Sketchfab API token not configured. Set it via:\n" +
          "- Environment: SKETCHFAB_API_KEY=your-token\n" +
          "- Or POST /keys with {\"service\":\"sketchfab\",\"key\":\"your-token\"}\n" +
          "Get your token at: sketchfab.com/settings/password",
      }],
      isError: true,
    };
  }

  try {
    const download = await getSketchfabDownload(uid, apiToken);

    if (!download.gltfUrl) {
      return {
        content: [{ type: "text" as const, text: "No GLTF download available for this model." }],
        isError: true,
      };
    }

    const fullTargetDir = join(projectRoot, targetDir);
    if (!existsSync(fullTargetDir)) {
      mkdirSync(fullTargetDir, { recursive: true });
    }

    // Download GLTF zip
    const zipPath = join(fullTargetDir, `${uid}.zip`);
    await downloadSketchfabModel(download.gltfUrl, zipPath);

    // Extract zip
    try {
      execSync(`cd "${fullTargetDir}" && unzip -o "${uid}.zip" -d "${uid}"`, {
        encoding: "utf-8",
        timeout: 30000,
      });
      // Remove zip after extraction
      const { unlinkSync } = await import("fs");
      unlinkSync(zipPath);
    } catch {
      // unzip might not be available, keep the zip
    }

    await triggerGodotRescan(projectRoot);

    return {
      content: [{
        type: "text" as const,
        text: `Downloaded Sketchfab model ${uid} → res://${targetDir}/${uid}/`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Download failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

// ==================== OpenGameArt ====================

export async function handleSearchOpenGameArt(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const query = args.query as string;
  const type = args.type as "2d" | "3d" | "music" | "sound" | undefined;

  if (!query) {
    return { content: [{ type: "text" as const, text: "query is required" }], isError: true };
  }

  try {
    const results = await searchOpenGameArt(query, type);

    if (results.length === 0) {
      return {
        content: [{ type: "text" as const, text: `No results for "${query}" on OpenGameArt.` }],
      };
    }

    const formatted = results
      .map((r) => `${r.title}\n  ${r.url}`)
      .join("\n\n");

    return {
      content: [{
        type: "text" as const,
        text: `OpenGameArt — ${results.length} results for "${query}":\n\n${formatted}`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Search failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

// ==================== Generic download ====================

export async function handleDownloadAsset(
  args: Record<string, unknown>,
  projectRoot: string
): Promise<ToolResult> {
  const url = args.url as string;
  const targetDir = (args.target_dir as string) || "assets/downloads";
  const fileName = args.file_name as string | undefined;

  if (!url) {
    return { content: [{ type: "text" as const, text: "url is required" }], isError: true };
  }

  try {
    const fullTargetDir = join(projectRoot, targetDir);
    if (!existsSync(fullTargetDir)) {
      mkdirSync(fullTargetDir, { recursive: true });
    }

    // Determine filename
    const urlFilename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "download");
    const finalName = fileName || urlFilename;
    const destPath = join(fullTargetDir, finalName);

    // Download
    const response = await fetch(url, {
      headers: { "User-Agent": "GodotForge/0.2.0" },
    });
    if (!response.ok) {
      return {
        content: [{ type: "text" as const, text: `Download failed: HTTP ${response.status}` }],
        isError: true,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(destPath, buffer);

    // Trigger Godot rescan if it's running
    await triggerGodotRescan(projectRoot);

    return {
      content: [{
        type: "text" as const,
        text: `Downloaded ${finalName} (${(buffer.length / 1024).toFixed(1)}KB) → res://${targetDir}/${finalName}`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Download failed: ${error instanceof Error ? error.message : error}` }],
      isError: true,
    };
  }
}

// ==================== List local assets ====================

export function handleListLocalAssets(
  args: Record<string, unknown>,
  projectRoot: string
): ToolResult {
  const directory = (args.directory as string) || "assets";
  const filterType = args.type as string | undefined;

  const fullDir = join(projectRoot, directory);
  if (!existsSync(fullDir)) {
    return {
      content: [{ type: "text" as const, text: `Directory not found: ${directory}` }],
      isError: true,
    };
  }

  const assets: Array<{ path: string; type: string; size: number }> = [];
  walkDir(fullDir, projectRoot, assets);

  // Filter by type if specified
  let filtered = assets;
  if (filterType) {
    const typeExtMap: Record<string, string[]> = {
      texture: [".png", ".jpg", ".jpeg", ".webp", ".exr", ".hdr"],
      model: [".glb", ".gltf", ".fbx", ".obj", ".dae"],
      audio: [".wav", ".ogg", ".mp3"],
      scene: [".tscn", ".scn"],
      script: [".gd"],
      material: [".tres", ".material"],
    };
    const exts = typeExtMap[filterType] || [];
    if (exts.length > 0) {
      filtered = assets.filter((a) => exts.includes(extname(a.path).toLowerCase()));
    }
  }

  if (filtered.length === 0) {
    return {
      content: [{ type: "text" as const, text: `No assets found in ${directory}${filterType ? ` (type: ${filterType})` : ""}` }],
    };
  }

  const formatted = filtered
    .map((a) => `[${a.type}] res://${a.path} (${(a.size / 1024).toFixed(1)}KB)`)
    .join("\n");

  return {
    content: [{
      type: "text" as const,
      text: `${filtered.length} assets in ${directory}:\n\n${formatted}`,
    }],
  };
}

function walkDir(
  dir: string,
  projectRoot: string,
  results: Array<{ path: string; type: string; size: number }>
): void {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkDir(fullPath, projectRoot, results);
    } else {
      const relPath = fullPath.substring(projectRoot.length + 1);
      const ext = extname(entry).toLowerCase();
      const typeMap: Record<string, string> = {
        ".png": "texture", ".jpg": "texture", ".jpeg": "texture", ".webp": "texture",
        ".exr": "hdr", ".hdr": "hdr",
        ".glb": "model", ".gltf": "model", ".fbx": "model", ".obj": "model",
        ".wav": "audio", ".ogg": "audio", ".mp3": "audio",
        ".tscn": "scene", ".scn": "scene",
        ".gd": "script", ".tres": "resource",
      };
      results.push({
        path: relPath,
        type: typeMap[ext] || "other",
        size: stat.size,
      });
    }
  }
}

/**
 * Trigger Godot filesystem rescan if editor is running.
 */
async function triggerGodotRescan(projectRoot: string): Promise<void> {
  try {
    const portFile = join(projectRoot, ".godot", "godotforge.port");
    if (!existsSync(portFile)) return;

    const { readFileSync } = await import("fs");
    const port = parseInt(readFileSync(portFile, "utf-8").trim(), 10);
    if (isNaN(port)) return;

    await fetch(`http://127.0.0.1:${port}/tools/execute_editor_script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: 'EditorInterface.get_resource_filesystem().scan()\n_result = "Rescanned"',
      }),
    });
  } catch {
    // Godot not running — fine
  }
}

// ==================== Helpers ====================

interface FileEntry {
  url: string;
  filename: string;
}

/**
 * Flatten Poly Haven's nested file tree into downloadable entries.
 */
function flattenFileTree(
  tree: Record<string, unknown>,
  resolution: string,
  format: string
): FileEntry[] {
  const entries: FileEntry[] = [];

  function walk(obj: unknown, pathParts: string[]): void {
    if (!obj || typeof obj !== "object") return;
    const record = obj as Record<string, unknown>;

    // If this node has a 'url' field, it's a downloadable file
    if (typeof record.url === "string") {
      const url = record.url as string;
      const filename = pathParts.join("_").replace(/[^a-zA-Z0-9._-]/g, "_");
      entries.push({ url, filename: filename || basename(url) });
      return;
    }

    // Otherwise recurse, prioritizing matching resolution/format
    for (const [key, value] of Object.entries(record)) {
      // Skip non-matching resolutions if we find resolution keys
      if (key.match(/^\d+k$/) && key !== resolution) continue;
      // Skip non-matching formats if we find format keys
      if (key.match(/^(jpg|png|exr|hdr|gltf|fbx)$/) && key !== format) continue;

      walk(value, [...pathParts, key]);
    }
  }

  walk(tree, []);
  return entries;
}
