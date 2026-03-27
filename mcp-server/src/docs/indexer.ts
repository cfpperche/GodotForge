import Database from "better-sqlite3";
import { readdirSync } from "fs";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { openDatabase, createSchema, insertClass, dbExists } from "./db.js";
import { parseClassXml } from "./parser.js";
import { downloadDocs } from "./downloader.js";

const dbCache = new Map<string, Database.Database>();

export async function ensureDocsReady(
  version: string
): Promise<Database.Database> {
  // Return cached connection
  if (dbCache.has(version)) {
    return dbCache.get(version)!;
  }

  // Return existing DB
  if (dbExists(version)) {
    const db = openDatabase(version);
    dbCache.set(version, db);
    return db;
  }

  // Download and index
  console.error(`[GodotForge Docs] Indexing docs for Godot ${version}...`);
  const xmlDir = await downloadDocs(version);
  const db = openDatabase(version);
  createSchema(db);

  const xmlFiles = readdirSync(xmlDir).filter((f) => f.endsWith(".xml"));
  console.error(
    `[GodotForge Docs] Parsing ${xmlFiles.length} class files...`
  );

  const insertAll = db.transaction(() => {
    for (const file of xmlFiles) {
      try {
        const cls = parseClassXml(join(xmlDir, file));
        insertClass(db, cls);
      } catch (err) {
        console.error(
          `[GodotForge Docs] Warning: failed to parse ${file}: ${err}`
        );
      }
    }
  });

  insertAll();

  const classCount = (
    db.prepare("SELECT COUNT(*) as count FROM classes").get() as {
      count: number;
    }
  ).count;
  console.error(`[GodotForge Docs] Indexed ${classCount} classes.`);

  dbCache.set(version, db);
  return db;
}

export function detectGodotVersion(projectRoot: string): string | null {
  const projectFile = join(resolve(projectRoot), "project.godot");
  if (!existsSync(projectFile)) return null;

  const content = readFileSync(projectFile, "utf-8");
  const match = content.match(
    /config\/features\s*=\s*PackedStringArray\("([^"]+)"/
  );
  if (match) {
    return match[1]; // e.g., "4.6"
  }

  return null;
}
