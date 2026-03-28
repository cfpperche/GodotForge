/**
 * Poly Haven API client — free textures, models, HDRIs.
 * No API key required. Public API at api.polyhaven.com.
 */

const BASE_URL = "https://api.polyhaven.com";
const USER_AGENT = "GodotForge/0.2.0 (https://github.com/godotforge)";

export interface PolyHavenAsset {
  id: string;
  name: string;
  type: string;
  categories: string[];
  tags: string[];
  download_count: number;
}

export interface PolyHavenFileInfo {
  url: string;
  size: number;
  md5: string;
}

async function phFetch(path: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Poly Haven API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

/**
 * Search Poly Haven assets by type and optional query.
 */
export async function searchPolyHaven(
  type: "hdris" | "textures" | "models" | "all",
  categories?: string
): Promise<PolyHavenAsset[]> {
  let path = `/assets?t=${type}`;
  if (categories) path += `&c=${encodeURIComponent(categories)}`;

  const data = (await phFetch(path)) as Record<string, Record<string, unknown>>;

  return Object.entries(data).map(([id, info]) => ({
    id,
    name: (info.name as string) || id,
    type: (info.type as string) || type,
    categories: (info.categories as string[]) || [],
    tags: (info.tags as string[]) || [],
    download_count: (info.download_count as number) || 0,
  }));
}

/**
 * Get asset info including available files and resolutions.
 */
export async function getPolyHavenInfo(
  assetId: string
): Promise<Record<string, unknown>> {
  return (await phFetch(`/info/${assetId}`)) as Record<string, unknown>;
}

/**
 * Get download URLs for an asset.
 */
export async function getPolyHavenFiles(
  assetId: string
): Promise<Record<string, unknown>> {
  return (await phFetch(`/files/${assetId}`)) as Record<string, unknown>;
}

/**
 * Download a Poly Haven asset file to disk.
 */
export async function downloadPolyHavenFile(
  url: string,
  destPath: string
): Promise<void> {
  const { writeFileSync } = await import("fs");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destPath, buffer);
}
