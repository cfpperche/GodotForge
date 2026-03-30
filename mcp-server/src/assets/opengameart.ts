/**
 * OpenGameArt.org scraper — free sprites, sounds, music, 3D models.
 * No official API — uses the advanced search page (Drupal views).
 */

const BASE_URL = "https://opengameart.org";

export interface OGAResult {
  title: string;
  url: string;
  type: string;
  license: string;
  author: string;
}

// Drupal taxonomy IDs for art types
const TYPE_IDS: Record<string, string> = {
  "2d": "9",
  "3d": "10",
  "music": "12",
  "sound": "13",
};

/**
 * Search OpenGameArt using their advanced search page.
 */
export async function searchOpenGameArt(
  query: string,
  type?: "2d" | "3d" | "music" | "sound"
): Promise<OGAResult[]> {
  const params = new URLSearchParams({ keys: query });
  if (type && TYPE_IDS[type]) {
    params.append("field_art_type_tid[]", TYPE_IDS[type]);
  }

  const url = `${BASE_URL}/art-search-advanced?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "GodotForge/0.2.0",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`OpenGameArt search failed: ${response.status}`);
  }

  const html = await response.text();
  return parseSearchResults(html);
}

/**
 * Parse search results from OGA advanced search HTML.
 * Results are in: <span class="art-preview-title"><a href="/content/...">Title</a></span>
 */
function parseSearchResults(html: string): OGAResult[] {
  const results: OGAResult[] = [];
  const seen = new Set<string>();

  const pattern = /art-preview-title"><a href="(\/content\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const path = match[1];
    const title = decodeHtmlEntities(match[2].trim());
    if (title.length < 2 || seen.has(path)) continue;
    seen.add(path);

    results.push({
      title,
      url: `${BASE_URL}${path}`,
      type: "unknown",
      license: "varies",
      author: "",
    });
  }

  return results.slice(0, 20);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

/**
 * Get download links from an OpenGameArt content page.
 */
export async function getOGADownloadLinks(
  contentUrl: string
): Promise<Array<{ filename: string; url: string }>> {
  const response = await fetch(contentUrl, {
    headers: { "User-Agent": "GodotForge/0.2.0" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OGA page: ${response.status}`);
  }

  const html = await response.text();
  const links: Array<{ filename: string; url: string }> = [];

  // Match file download links
  const filePattern = /href="(https:\/\/opengameart\.org\/sites\/default\/files\/[^"]+)"/g;
  let match;

  while ((match = filePattern.exec(html)) !== null) {
    const url = match[1];
    const filename = decodeURIComponent(url.split("/").pop() || "file");
    if (!links.some((l) => l.url === url)) {
      links.push({ filename, url });
    }
  }

  return links;
}
