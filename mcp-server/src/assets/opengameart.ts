/**
 * OpenGameArt.org scraper — free sprites, sounds, music, 3D models.
 * No official API — uses the RSS/search endpoint.
 */

const BASE_URL = "https://opengameart.org";

export interface OGAResult {
  title: string;
  url: string;
  type: string;
  license: string;
  author: string;
}

/**
 * Search OpenGameArt using their search page (returns HTML, we parse basics).
 * Uses the JSON API endpoint if available, falls back to scraping.
 */
export async function searchOpenGameArt(
  query: string,
  type?: "2d" | "3d" | "music" | "sound"
): Promise<OGAResult[]> {
  // OGA has a basic search API via their Drupal JSON endpoint
  const typeMap: Record<string, string> = {
    "2d": "art2d",
    "3d": "art3d",
    "music": "music",
    "sound": "sfx",
  };

  const params = new URLSearchParams({
    keys: query,
  });
  if (type && typeMap[type]) {
    params.set("type", typeMap[type]);
  }

  const url = `${BASE_URL}/search/node?${params.toString()}`;

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
 * Parse search results from OpenGameArt HTML.
 */
function parseSearchResults(html: string): OGAResult[] {
  const results: OGAResult[] = [];

  // Match search result entries — OGA uses <h3 class="title"> or <li class="search-result"> patterns
  // Look for content links within search result context
  const resultPattern = /class="search-result[^"]*"[\s\S]*?<a href="(\/content\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;

  while ((match = resultPattern.exec(html)) !== null) {
    const path = match[1];
    const title = match[2].trim();
    if (title.length < 2) continue;
    if (results.some((r) => r.url === `${BASE_URL}${path}`)) continue;

    results.push({
      title: decodeHtmlEntities(title),
      url: `${BASE_URL}${path}`,
      type: "unknown",
      license: "varies",
      author: "",
    });
  }

  // Fallback: grab all /content/ links if structured parsing finds nothing
  if (results.length === 0) {
    const fallbackPattern = /<a href="(\/content\/[^"]+)"[^>]*>([^<]{3,80})<\/a>/g;
    const skipTitles = new Set(["FAQ", "Forums", "Collections", "Art Search", "Submit Art"]);

    while ((match = fallbackPattern.exec(html)) !== null) {
      const path = match[1];
      const title = match[2].trim();
      if (skipTitles.has(title)) continue;
      if (title.length < 3) continue;
      if (results.some((r) => r.url === `${BASE_URL}${path}`)) continue;

      results.push({
        title: decodeHtmlEntities(title),
        url: `${BASE_URL}${path}`,
        type: "unknown",
        license: "varies",
        author: "",
      });
    }
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
