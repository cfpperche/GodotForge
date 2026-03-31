/**
 * Asset service tool handlers — Poly Haven, Sketchfab, OpenGameArt, ambientCG,
 * Godot Asset Library, Freesound, jsfxr + local listing.
 */

import { searchPolyHaven, getPolyHavenInfo, getPolyHavenFiles, downloadPolyHavenFile } from "./polyhaven.js";
import { searchSketchfab, getSketchfabDownload, downloadSketchfabModel } from "./sketchfab.js";
import { searchOpenGameArt, getOGADownloadLinks } from "./opengameart.js";
import { searchAmbientCG, buildDownloadUrl, downloadZip as downloadAmbientCGZip } from "./ambientcg.js";
import { searchGodotLibrary, getAssetDetail, downloadAssetZip } from "./godot-library.js";
import { searchFreesound, downloadPreview } from "./freesound.js";
import { generateSfx } from "./sfxr.js";
import { ConfigManager } from "../config.js";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, basename, extname, resolve } from "path";
import { execSync } from "child_process";

/** Validate target dir is within project root (path traversal prevention). */
function validateTargetDir(projectRoot: string, targetDir: string): string {
  const full = resolve(projectRoot, targetDir);
  if (!full.startsWith(resolve(projectRoot))) {
    throw new Error(`Path traversal blocked: ${targetDir}`);
  }
  return full;
}

/** Sanitize string for safe use in shell commands (reject dangerous chars). */
function sanitizeForShell(input: string): string {
  if (/[;&|`$(){}[\]!#~]/.test(input)) {
    throw new Error(`Invalid characters in input: ${input}`);
  }
  return input;
}

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

// ==================== ambientCG ====================

export async function handleSearchAmbientCG(
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const result = await searchAmbientCG({
      q: args.q as string | undefined,
      type: args.type as "Material" | "HDRI" | "3DModel" | "Substance" | "Decal" | "Terrain" | undefined,
      sort: (args.sort as string | undefined) as "Popular" | "Latest" | "Alphabetically" | "Downloads" | undefined,
      limit: (args.limit as number | undefined) || 20,
      offset: args.offset as number | undefined,
      method: args.method as "PBRPhotogrammetry" | "PBRApproximated" | "PBRProcedural" | "PlainPhoto" | undefined,
    });

    if (result.assets.length === 0) {
      return { content: [{ type: "text" as const, text: `No results on ambientCG${args.q ? ` for "${args.q}"` : ""}.` }] };
    }

    const formatted = result.assets
      .map((a) => `[${a.dataType}] ${a.assetId} — "${a.displayName}" (${a.creationMethod}) downloads: ${a.downloadCount}${a.maps ? ` maps: ${a.maps.join(", ")}` : ""}`)
      .join("\n");

    return {
      content: [{ type: "text" as const, text: `ambientCG — ${result.total} total (showing ${result.assets.length}):\n\n${formatted}` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `Search failed: ${error instanceof Error ? error.message : error}` }], isError: true };
  }
}

export async function handleDownloadAmbientCG(
  args: Record<string, unknown>,
  projectRoot: string
): Promise<ToolResult> {
  const assetId = args.asset_id as string;
  const resolution = (args.resolution as string) || "1K";
  const format = (args.format as string) || "JPG";
  const targetDir = (args.target_dir as string) || "assets/textures/ambientcg";

  if (!assetId) return { content: [{ type: "text" as const, text: "asset_id is required" }], isError: true };

  try {
    const safeAssetId = sanitizeForShell(assetId);
    const fullTargetDir = validateTargetDir(projectRoot, targetDir);
    const url = buildDownloadUrl(safeAssetId, resolution, format);
    const zipPath = join(fullTargetDir, `${safeAssetId}_${resolution}-${format}.zip`);

    await downloadAmbientCGZip(url, zipPath);

    // Extract ZIP
    const extractDir = join(fullTargetDir, safeAssetId);
    mkdirSync(extractDir, { recursive: true });
    try {
      execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { encoding: "utf-8", timeout: 30000 });
      const { unlinkSync } = await import("fs");
      unlinkSync(zipPath);
    } catch {
      // unzip not available, keep zip
    }

    await triggerGodotRescan(projectRoot);

    return {
      content: [{ type: "text" as const, text: `Downloaded ambientCG '${safeAssetId}' (${resolution}-${format}) → res://${targetDir}/${safeAssetId}/` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `Download failed: ${error instanceof Error ? error.message : error}` }], isError: true };
  }
}

// ==================== Godot Asset Library ====================

export async function handleSearchGodotLibrary(
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const result = await searchGodotLibrary({
      filter: args.filter as string | undefined,
      type: args.type as "addon" | "project" | undefined,
      category: args.category as number | undefined,
      godot_version: args.godot_version as string | undefined,
      sort: args.sort as "updated" | "name" | "rating" | "cost" | undefined,
      page: args.page as number | undefined,
      page_length: (args.page_length as number | undefined) || 20,
      support: args.support as string | undefined,
      user: args.user as string | undefined,
    });

    if (result.assets.length === 0) {
      return { content: [{ type: "text" as const, text: `No results on Godot Asset Library${args.filter ? ` for "${args.filter}"` : ""}.` }] };
    }

    const formatted = result.assets
      .map((a) => `[${a.category}] ${a.title} (ID: ${a.asset_id})\n  by ${a.author} | ${a.cost} | Godot ${a.godot_version} | ${a.support_level} | v${a.version_string}`)
      .join("\n\n");

    return {
      content: [{ type: "text" as const, text: `Godot Asset Library — ${result.total} total (page ${result.page + 1}/${result.pages}, showing ${result.assets.length}):\n\n${formatted}` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `Search failed: ${error instanceof Error ? error.message : error}` }], isError: true };
  }
}

export async function handleDownloadGodotLibrary(
  args: Record<string, unknown>,
  projectRoot: string
): Promise<ToolResult> {
  const assetId = args.asset_id as string;
  const targetDir = (args.target_dir as string) || "addons";

  if (!assetId) return { content: [{ type: "text" as const, text: "asset_id is required" }], isError: true };

  try {
    const detail = await getAssetDetail(assetId);
    if (!detail.download_url) {
      return { content: [{ type: "text" as const, text: `No download URL for asset '${assetId}'.` }], isError: true };
    }

    const safeAssetId = sanitizeForShell(assetId);
    const fullTargetDir = validateTargetDir(projectRoot, targetDir);
    const zipPath = join(fullTargetDir, `godot_asset_${safeAssetId}.zip`);

    await downloadAssetZip(detail.download_url, zipPath);

    // Extract ZIP
    try {
      execSync(`unzip -o "${zipPath}" -d "${fullTargetDir}"`, { encoding: "utf-8", timeout: 30000 });
      const { unlinkSync } = await import("fs");
      unlinkSync(zipPath);
    } catch {
      // unzip not available, keep zip
    }

    await triggerGodotRescan(projectRoot);

    return {
      content: [{ type: "text" as const, text: `Downloaded Godot asset '${detail.title}' by ${detail.author} → res://${targetDir}/\nLicense: ${detail.cost} | Provider: ${detail.download_provider}` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `Download failed: ${error instanceof Error ? error.message : error}` }], isError: true };
  }
}

// ==================== Freesound ====================

const NO_FREESOUND_KEY =
  "Freesound API key not configured. Set FREESOUND_API_KEY or configure via web settings (API Keys tab).\nGet your key at: https://freesound.org/apiv2/apply";

export async function handleSearchFreesound(
  args: Record<string, unknown>,
  config: ConfigManager
): Promise<ToolResult> {
  const apiKey = config.getKey("freesound");
  if (!apiKey) return { content: [{ type: "text" as const, text: NO_FREESOUND_KEY }], isError: true };

  const query = args.query as string;
  if (!query) return { content: [{ type: "text" as const, text: "query is required" }], isError: true };

  try {
    const result = await searchFreesound(apiKey, {
      query,
      filter: args.filter as string | undefined,
      sort: args.sort as "score" | "duration_desc" | "duration_asc" | "created_desc" | "created_asc" | "downloads_desc" | "downloads_asc" | "rating_desc" | "rating_asc" | undefined,
      fields: args.fields as string | undefined,
      page: args.page as number | undefined,
      page_size: (args.page_size as number | undefined) || 20,
      group_by_pack: args.group_by_pack as boolean | undefined,
    });

    if (result.results.length === 0) {
      return { content: [{ type: "text" as const, text: `No sounds found for "${query}" on Freesound.` }] };
    }

    const formatted = result.results
      .map((s) => {
        const previewUrl = s.previews?.["preview-hq-mp3"] || "";
        return `[${s.type}] ${s.name} (ID: ${s.id})\n  ${s.duration.toFixed(1)}s | ${s.channels}ch | ${s.samplerate}Hz | ${(s.filesize / 1024).toFixed(0)}KB\n  by ${s.username} | ${s.license.split("/").slice(-2, -1)[0] || s.license}\n  tags: ${s.tags.slice(0, 8).join(", ")}\n  downloads: ${s.num_downloads} | rating: ${s.avg_rating.toFixed(1)}${previewUrl ? `\n  preview: ${previewUrl}` : ""}`;
      })
      .join("\n\n");

    return {
      content: [{ type: "text" as const, text: `Freesound — ${result.count} total (showing ${result.results.length}):\n\n${formatted}` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `Search failed: ${error instanceof Error ? error.message : error}` }], isError: true };
  }
}

export async function handlePreviewFreesound(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const apiKey = config.getKey("freesound");
  if (!apiKey) return { content: [{ type: "text" as const, text: NO_FREESOUND_KEY }], isError: true };

  const soundId = Number(args.sound_id);
  if (!soundId || isNaN(soundId)) return { content: [{ type: "text" as const, text: "sound_id is required (integer)" }], isError: true };

  const targetDir = (args.target_dir as string) || "assets/audio/freesound";
  const format = (args.format as string) || "mp3";

  try {
    const fullTargetDir = validateTargetDir(projectRoot, targetDir);
    // Fetch sound detail to get preview URL
    const res = await fetch(`https://freesound.org/apiv2/sounds/${soundId}/?fields=id,name,previews`, {
      headers: { "User-Agent": "GodotForge/0.2.0", Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Freesound API ${res.status}: ${await res.text()}`);

    const sound = await res.json() as { id: number; name: string; previews: Record<string, string> };

    const previewKey = format === "ogg" ? "preview-hq-ogg" : "preview-hq-mp3";
    const previewUrl = sound.previews?.[previewKey];
    if (!previewUrl) {
      return { content: [{ type: "text" as const, text: `No ${format} preview available for sound ${soundId}.` }], isError: true };
    }

    const ext = format === "ogg" ? ".ogg" : ".mp3";
    const filename = `${soundId}_${sound.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}${ext}`;
    const destPath = join(fullTargetDir, filename);

    await downloadPreview(previewUrl, destPath);
    await triggerGodotRescan(projectRoot);

    return {
      content: [{ type: "text" as const, text: `Downloaded Freesound preview '${sound.name}' → res://${targetDir}/${filename}` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `Preview download failed: ${error instanceof Error ? error.message : error}` }], isError: true };
  }
}

export async function handleDownloadFreesound(
  args: Record<string, unknown>,
  projectRoot: string,
  config: ConfigManager
): Promise<ToolResult> {
  const apiKey = config.getKey("freesound");
  if (!apiKey) return { content: [{ type: "text" as const, text: NO_FREESOUND_KEY }], isError: true };

  const soundId = Number(args.sound_id);
  if (!soundId || isNaN(soundId)) return { content: [{ type: "text" as const, text: "sound_id is required (integer)" }], isError: true };

  const oauthToken = args.oauth_token as string | undefined;
  if (!oauthToken) {
    return {
      content: [{
        type: "text" as const,
        text: "Downloading original files requires an OAuth2 access token.\n" +
          "To get one, authenticate at: https://freesound.org/apiv2/oauth2/authorize/?client_id=YOUR_CLIENT_ID&response_type=code\n" +
          "Alternatively, use assets.preview_freesound to download HQ preview MP3/OGG (no OAuth needed).",
      }],
      isError: true,
    };
  }

  const targetDir = (args.target_dir as string) || "assets/audio/freesound";

  try {
    const fullTargetDir = validateTargetDir(projectRoot, targetDir);
    // Fetch sound info
    const infoRes = await fetch(`https://freesound.org/apiv2/sounds/${soundId}/?fields=id,name,type`, {
      headers: { "User-Agent": "GodotForge/0.2.0", Authorization: `Token ${apiKey}` },
    });
    if (!infoRes.ok) throw new Error(`Freesound API ${infoRes.status}`);
    const info = await infoRes.json() as { id: number; name: string; type: string };

    // Download with OAuth2
    const dlRes = await fetch(`https://freesound.org/apiv2/sounds/${soundId}/download/`, {
      headers: {
        Authorization: `Bearer ${oauthToken}`,
        "User-Agent": "GodotForge/0.2.0",
      },
    });
    if (!dlRes.ok) throw new Error(`Download failed: HTTP ${dlRes.status}. OAuth token may be expired.`);

    const buffer = Buffer.from(await dlRes.arrayBuffer());
    const ext = info.type ? `.${info.type}` : ".wav";
    const filename = `${soundId}_${info.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}${ext}`;
    const destPath = join(fullTargetDir, filename);
    mkdirSync(fullTargetDir, { recursive: true });
    writeFileSync(destPath, buffer);

    await triggerGodotRescan(projectRoot);

    return {
      content: [{ type: "text" as const, text: `Downloaded Freesound '${info.name}' (${(buffer.length / 1024).toFixed(1)}KB) → res://${targetDir}/${filename}` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `Download failed: ${error instanceof Error ? error.message : error}` }], isError: true };
  }
}

// ==================== jsfxr ====================

export async function handleGenerateSfx(
  args: Record<string, unknown>,
  projectRoot: string
): Promise<ToolResult> {
  const preset = args.preset as string;
  if (!preset) return { content: [{ type: "text" as const, text: "preset is required. Options: pickupCoin, laserShoot, explosion, powerUp, hitHurt, jump, blipSelect, synth, tone, click, random" }], isError: true };

  const targetDir = (args.target_dir as string) || "assets/audio/sfx";
  const filename = (args.filename as string) || `${preset}_${Date.now()}.wav`;

  try {
    const fullTargetDir = validateTargetDir(projectRoot, targetDir);
    const destPath = join(fullTargetDir, filename);
    const { size } = await generateSfx({
      preset: preset as "pickupCoin" | "laserShoot" | "explosion" | "powerUp" | "hitHurt" | "jump" | "blipSelect" | "synth" | "tone" | "click" | "random",
      wave_type: args.wave_type as number | undefined,
      p_env_attack: args.p_env_attack as number | undefined,
      p_env_sustain: args.p_env_sustain as number | undefined,
      p_env_punch: args.p_env_punch as number | undefined,
      p_env_decay: args.p_env_decay as number | undefined,
      p_base_freq: args.p_base_freq as number | undefined,
      p_freq_limit: args.p_freq_limit as number | undefined,
      p_freq_ramp: args.p_freq_ramp as number | undefined,
      p_freq_dramp: args.p_freq_dramp as number | undefined,
      p_vib_strength: args.p_vib_strength as number | undefined,
      p_vib_speed: args.p_vib_speed as number | undefined,
      p_arp_mod: args.p_arp_mod as number | undefined,
      p_arp_speed: args.p_arp_speed as number | undefined,
      p_duty: args.p_duty as number | undefined,
      p_duty_ramp: args.p_duty_ramp as number | undefined,
      p_repeat_speed: args.p_repeat_speed as number | undefined,
      p_pha_offset: args.p_pha_offset as number | undefined,
      p_pha_ramp: args.p_pha_ramp as number | undefined,
      p_lpf_freq: args.p_lpf_freq as number | undefined,
      p_lpf_ramp: args.p_lpf_ramp as number | undefined,
      p_lpf_resonance: args.p_lpf_resonance as number | undefined,
      p_hpf_freq: args.p_hpf_freq as number | undefined,
      p_hpf_ramp: args.p_hpf_ramp as number | undefined,
      sound_vol: args.sound_vol as number | undefined,
      sample_rate: args.sample_rate as number | undefined,
      sample_size: args.sample_size as number | undefined,
    }, destPath);

    await triggerGodotRescan(projectRoot);

    return {
      content: [{ type: "text" as const, text: `Generated SFX '${preset}' (${(size / 1024).toFixed(1)}KB) → res://${targetDir}/${filename}` }],
    };
  } catch (error) {
    return { content: [{ type: "text" as const, text: `SFX generation failed: ${error instanceof Error ? error.message : error}` }], isError: true };
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
      // Derive filename from URL (preserves extension) or from path parts
      const urlFilename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "");
      const filename = urlFilename || (pathParts.join("_").replace(/[^a-zA-Z0-9._-]/g, "_"));
      entries.push({ url, filename });
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
