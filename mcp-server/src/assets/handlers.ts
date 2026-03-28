/**
 * Asset service tool handlers — Poly Haven + Sketchfab.
 */

import { searchPolyHaven, getPolyHavenInfo, getPolyHavenFiles, downloadPolyHavenFile } from "./polyhaven.js";
import { searchSketchfab, getSketchfabDownload, downloadSketchfabModel } from "./sketchfab.js";
import { ConfigManager } from "../config.js";
import { existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
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
