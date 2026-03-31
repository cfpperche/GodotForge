/**
 * ambientCG API client — free PBR materials, HDRIs, 3D models (CC0).
 * No API key required. Public API at ambientcg.com.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

const BASE_URL = "https://ambientcg.com/api/v2/full_json";
const USER_AGENT = "GodotForge/0.2.0 (https://github.com/godotforge)";

// --- Types ---

export type AmbientCGType = "Material" | "HDRI" | "3DModel" | "Substance" | "Decal" | "Terrain";
export type AmbientCGSort = "Popular" | "Latest" | "Alphabetically" | "Downloads";
export type AmbientCGMethod = "PBRPhotogrammetry" | "PBRApproximated" | "PBRProcedural" | "PlainPhoto" | "UnknownOrOther";

export interface AmbientCGAsset {
  assetId: string;
  displayName: string;
  dataType: string;
  creationMethod: string;
  tags: string[];
  downloadCount: number;
  shortLink: string;
  maps?: string[];
}

export interface AmbientCGDownload {
  fullDownloadPath: string;
  fileName: string;
  size: number;
  attribute: string; // e.g. "1K-JPG", "2K-PNG"
}

export interface AmbientCGSearchResult {
  total: number;
  assets: AmbientCGAsset[];
}

export interface SearchParams {
  q?: string;
  type?: AmbientCGType;
  sort?: AmbientCGSort;
  limit?: number;
  offset?: number;
  method?: AmbientCGMethod;
}

// --- API Functions ---

export async function searchAmbientCG(params: SearchParams): Promise<AmbientCGSearchResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.type) qs.set("type", params.type);
  if (params.sort) qs.set("sort", params.sort);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.method) qs.set("method", params.method);
  qs.set("include", "downloadData,tagData");

  const res = await fetch(`${BASE_URL}?${qs.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`ambientCG API ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    numberOfResults: number;
    foundAssets: Array<{
      assetId: string;
      displayName: string;
      dataType: string;
      creationMethod: string;
      tags?: string[];
      downloadCount?: number;
      shortLink?: string;
      maps?: string[];
    }>;
  };

  return {
    total: data.numberOfResults,
    assets: (data.foundAssets || []).map((a) => ({
      assetId: a.assetId,
      displayName: a.displayName,
      dataType: a.dataType,
      creationMethod: a.creationMethod,
      tags: a.tags || [],
      downloadCount: a.downloadCount || 0,
      shortLink: a.shortLink || "",
      maps: a.maps,
    })),
  };
}

export function buildDownloadUrl(assetId: string, resolution: string, format: string): string {
  return `https://ambientcg.com/get?file=${encodeURIComponent(assetId)}_${resolution}-${format}.zip`;
}

export async function downloadZip(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
