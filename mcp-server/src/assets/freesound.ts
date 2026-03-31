/**
 * Freesound API client — collaborative sound database (500K+ sounds).
 * Requires API key for search/preview. OAuth2 for original downloads.
 * Register at: https://freesound.org/apiv2/apply
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const BASE_URL = "https://freesound.org/apiv2";
const USER_AGENT = "GodotForge/0.2.0 (https://github.com/godotforge)";

// --- Types ---

export type FreesoundSort =
  | "score" | "duration_desc" | "duration_asc"
  | "created_desc" | "created_asc"
  | "downloads_desc" | "downloads_asc"
  | "rating_desc" | "rating_asc";

export interface FreesoundSound {
  id: number;
  name: string;
  tags: string[];
  description: string;
  username: string;
  license: string;
  duration: number;
  type: string;
  channels: number;
  samplerate: number;
  filesize: number;
  num_downloads: number;
  avg_rating: number;
  previews?: {
    "preview-hq-mp3"?: string;
    "preview-hq-ogg"?: string;
    "preview-lq-mp3"?: string;
    "preview-lq-ogg"?: string;
  };
}

export interface FreesoundSearchResult {
  count: number;
  results: FreesoundSound[];
  next: string | null;
  previous: string | null;
}

export interface SearchParams {
  query: string;
  filter?: string;
  sort?: FreesoundSort;
  fields?: string;
  page?: number;
  page_size?: number;
  group_by_pack?: boolean;
}

// --- API Functions ---

export async function searchFreesound(apiKey: string, params: SearchParams): Promise<FreesoundSearchResult> {
  const qs = new URLSearchParams();
  qs.set("query", params.query);
  qs.set("fields", params.fields || "id,name,tags,description,username,license,duration,type,channels,samplerate,filesize,num_downloads,avg_rating,previews");
  if (params.filter) qs.set("filter", params.filter);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  if (params.group_by_pack) qs.set("group_by_pack", "1");

  const res = await fetch(`${BASE_URL}/search/text/?${qs.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Authorization: `Token ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Freesound API ${res.status}: ${await res.text()}`);

  return res.json() as Promise<FreesoundSearchResult>;
}

export async function downloadPreview(previewUrl: string, destPath: string): Promise<void> {
  const res = await fetch(previewUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Preview download failed: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
