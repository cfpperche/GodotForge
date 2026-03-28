/**
 * Sketchfab API client — 3D model search and download.
 * Requires API token for downloads: Authorization: Token {key}
 */

const BASE_URL = "https://api.sketchfab.com/v3";

export interface SketchfabModel {
  uid: string;
  name: string;
  description: string;
  vertexCount: number;
  faceCount: number;
  isDownloadable: boolean;
  license: string;
  thumbnailUrl: string;
  viewerUrl: string;
}

export interface SketchfabSearchResult {
  models: SketchfabModel[];
  total: number;
  next: string | null;
}

/**
 * Search Sketchfab models. No auth needed for search.
 */
export async function searchSketchfab(
  query: string,
  options?: {
    downloadable?: boolean;
    animated?: boolean;
    count?: number;
  }
): Promise<SketchfabSearchResult> {
  const params = new URLSearchParams({
    type: "models",
    q: query,
  });

  if (options?.downloadable !== false) {
    params.set("downloadable", "true");
  }
  if (options?.animated) {
    params.set("animated", "true");
  }
  params.set("count", String(options?.count || 10));

  const response = await fetch(`${BASE_URL}/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Sketchfab search failed: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const results = (data.results as Array<Record<string, unknown>>) || [];

  return {
    models: results.map((r) => ({
      uid: r.uid as string,
      name: r.name as string,
      description: ((r.description as string) || "").slice(0, 200),
      vertexCount: r.vertexCount as number,
      faceCount: r.faceCount as number,
      isDownloadable: r.isDownloadable as boolean,
      license: ((r.license as Record<string, unknown>)?.label as string) || "unknown",
      thumbnailUrl: getThumbnailUrl(r.thumbnails as Record<string, unknown>),
      viewerUrl: r.viewerUrl as string,
    })),
    total: (data.totalCount as number) || results.length,
    next: (data.next as string) || null,
  };
}

/**
 * Get download URL for a model. Requires API token.
 */
export async function getSketchfabDownload(
  uid: string,
  apiToken: string
): Promise<{ gltfUrl: string; usdzUrl?: string }> {
  const response = await fetch(`${BASE_URL}/models/${uid}/download`, {
    headers: {
      Authorization: `Token ${apiToken}`,
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    throw new Error("Sketchfab: Invalid API token. Get yours at sketchfab.com/settings/password");
  }
  if (response.status === 403) {
    throw new Error("Sketchfab: Model is not downloadable or you don't have permission.");
  }
  if (!response.ok) {
    throw new Error(`Sketchfab download failed: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, Record<string, unknown>>;

  return {
    gltfUrl: data.gltf?.url as string,
    usdzUrl: data.usdz?.url as string | undefined,
  };
}

/**
 * Download a Sketchfab model file (GLTF ZIP) to disk.
 */
export async function downloadSketchfabModel(
  url: string,
  destPath: string
): Promise<void> {
  const { writeFileSync } = await import("fs");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destPath, buffer);
}

function getThumbnailUrl(thumbs: Record<string, unknown> | undefined): string {
  if (!thumbs) return "";
  const images = thumbs.images as Array<Record<string, unknown>> | undefined;
  if (!images || images.length === 0) return "";
  // Pick medium size
  const medium = images.find((i) => i.width === 200) || images[0];
  return (medium?.url as string) || "";
}
