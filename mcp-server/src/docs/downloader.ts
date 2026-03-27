import { mkdirSync, existsSync, readdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

const GODOTFORGE_DIR = join(homedir(), ".godotforge");
const XML_CACHE_DIR = join(GODOTFORGE_DIR, "xml-cache");
const GITHUB_TAGS_URL =
  "https://api.github.com/repos/godotengine/godot/tags?per_page=100";

export async function downloadDocs(version: string): Promise<string> {
  const cacheDir = join(XML_CACHE_DIR, version);

  // Check cache — if we already have XML files, return
  if (existsSync(cacheDir)) {
    const xmlFiles = readdirSync(cacheDir).filter((f) => f.endsWith(".xml"));
    if (xmlFiles.length > 10) {
      console.error(`[GodotForge Docs] Using cached XMLs for ${version} (${xmlFiles.length} files)`);
      return cacheDir;
    }
  }

  mkdirSync(cacheDir, { recursive: true });

  const tag = await resolveTag(version);
  console.error(`[GodotForge Docs] Resolved version ${version} → tag ${tag}`);

  const tarballUrl = `https://github.com/godotengine/godot/archive/refs/tags/${tag}.tar.gz`;
  const tarPath = join(GODOTFORGE_DIR, `godot-${version}.tar.gz`);

  console.error(`[GodotForge Docs] Downloading ${tarballUrl}...`);
  const response = await fetch(tarballUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Godot docs: HTTP ${response.status} for tag ${tag}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(tarPath, buffer);

  // Extract doc/classes/*.xml using the exact path prefix from the tag
  // Tarball structure: godot-{tag}/doc/classes/*.xml — strip 3 components for flat XMLs
  const tarPrefix = `godot-${tag}/doc/classes/`;
  console.error(`[GodotForge Docs] Extracting XML docs...`);
  execSync(
    `tar xzf "${tarPath}" -C "${cacheDir}" --strip-components=3 "${tarPrefix}"`,
    { stdio: "pipe" }
  );

  unlinkSync(tarPath);

  const xmlCount = readdirSync(cacheDir).filter((f) => f.endsWith(".xml")).length;
  console.error(`[GodotForge Docs] Extracted ${xmlCount} class XMLs.`);

  if (xmlCount === 0) {
    throw new Error(`No XML files extracted for Godot ${version}. The tar structure may have changed.`);
  }

  return cacheDir;
}

async function resolveTag(version: string): Promise<string> {
  try {
    const response = await fetch(GITHUB_TAGS_URL, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (response.ok) {
      const tags = (await response.json()) as Array<{ name: string }>;
      const stableTags = tags
        .map((t) => t.name)
        .filter((name) => name.startsWith(version) && name.endsWith("-stable"))
        .sort()
        .reverse();

      if (stableTags.length > 0) {
        return stableTags[0];
      }
    }
  } catch {
    // Fallback below
  }

  return `${version}-stable`;
}
