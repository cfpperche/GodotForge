/**
 * Godot Asset Library API client — official addon/project repository.
 * No API key required. Public API at godotengine.org.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const BASE_URL = "https://godotengine.org/asset-library/api";
const USER_AGENT = "GodotForge/0.2.0 (https://github.com/godotforge)";

// --- Types ---

export type GodotLibraryType = "addon" | "project";
export type GodotLibrarySort = "updated" | "name" | "rating" | "cost";

export interface GodotLibraryAsset {
  asset_id: string;
  title: string;
  author: string;
  category: string;
  category_id: string;
  godot_version: string;
  cost: string; // license name
  support_level: string;
  icon_url: string;
  version_string: string;
  modify_date: string;
}

export interface GodotLibraryDetail extends GodotLibraryAsset {
  type: string;
  description: string;
  download_url: string;
  browse_url: string;
  download_provider: string;
  previews: Array<{ type: string; link: string; thumbnail: string }>;
}

export interface GodotLibrarySearchResult {
  total: number;
  page: number;
  pages: number;
  assets: GodotLibraryAsset[];
}

export interface SearchParams {
  filter?: string;
  type?: GodotLibraryType;
  category?: number;
  godot_version?: string;
  sort?: GodotLibrarySort;
  page?: number;
  page_length?: number;
  support?: string;
  user?: string;
}

// --- API Functions ---

export async function searchGodotLibrary(params: SearchParams): Promise<GodotLibrarySearchResult> {
  const qs = new URLSearchParams();
  if (params.filter) qs.set("filter", params.filter);
  if (params.type) qs.set("type", params.type);
  if (params.category !== undefined) qs.set("category", String(params.category));
  if (params.godot_version) qs.set("godot_version", params.godot_version);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page !== undefined) qs.set("page", String(params.page));
  // page is 0-based in Godot Asset Library API
  if (params.page_length) qs.set("page_length", String(params.page_length));
  if (params.support) qs.set("support", params.support);
  if (params.user) qs.set("user", params.user);

  const res = await fetch(`${BASE_URL}/asset?${qs.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Godot Asset Library ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    result: GodotLibraryAsset[];
    page: number;
    pages: number;
    total_items: number;
  };

  return {
    total: data.total_items,
    page: data.page,
    pages: data.pages,
    assets: data.result || [],
  };
}

export async function getAssetDetail(assetId: string): Promise<GodotLibraryDetail> {
  const res = await fetch(`${BASE_URL}/asset/${encodeURIComponent(assetId)}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Godot Asset Library ${res.status}: ${await res.text()}`);
  return res.json() as Promise<GodotLibraryDetail>;
}

export async function downloadAssetZip(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
