/**
 * Blender bpy API docs — index and search.
 * Extracts API from running Blender via addon, indexes into SQLite FTS5.
 */

import Database from "better-sqlite3";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { BlenderBridge } from "../blender-bridge.js";

const BLENDER_DB_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "/tmp",
  ".godotforge"
);

export interface BlenderClassInfo {
  name: string;
  inherits: string;
  description: string;
  properties: Array<{ name: string; type: string; description: string }>;
  methods: Array<{ name: string; signature: string; description: string }>;
}

export interface BlenderSearchResult {
  class_name: string;
  symbol_name: string;
  kind: string;
  description: string;
}

let dbCache: Database.Database | null = null;

/**
 * Ensure Blender docs are indexed. If not, extract from running Blender.
 */
export async function ensureBlenderDocs(
  blenderBridge?: BlenderBridge
): Promise<Database.Database> {
  if (dbCache) return dbCache;

  mkdirSync(BLENDER_DB_DIR, { recursive: true });
  const dbPath = join(BLENDER_DB_DIR, "blender-docs.db");
  const jsonPath = join(BLENDER_DB_DIR, "blender-api.json");

  // Check if DB already exists and has data
  if (existsSync(dbPath)) {
    const db = new Database(dbPath);
    const count = (db.prepare("SELECT COUNT(*) as c FROM blender_classes").get() as { c: number }).c;
    if (count > 0) {
      dbCache = db;
      return db;
    }
    db.close();
  }

  // Need to extract API from Blender
  if (!existsSync(jsonPath)) {
    if (!blenderBridge) {
      throw new Error("Blender docs not indexed and no Blender connection available. Start Blender with GodotForge addon.");
    }

    // Extract via addon
    const winJsonPath = `C:\\Users\\cfpp\\AppData\\Local\\Temp\\godotforge_blender_api.json`;
    const result = await blenderBridge.executeTool("extract_api", {
      filepath: winJsonPath,
    });

    if (result.is_error) {
      throw new Error(`Failed to extract Blender API: ${result.result}`);
    }

    // Copy from Windows temp to WSL
    const wslTempPath = "/mnt/c/Users/cfpp/AppData/Local/Temp/godotforge_blender_api.json";
    if (existsSync(wslTempPath)) {
      const { copyFileSync } = await import("fs");
      copyFileSync(wslTempPath, jsonPath);
    }
  }

  // Index JSON into SQLite
  const db = indexBlenderApi(dbPath, jsonPath);
  dbCache = db;
  return db;
}

/**
 * Index the extracted Blender API JSON into SQLite FTS5.
 */
function indexBlenderApi(dbPath: string, jsonPath: string): Database.Database {
  if (!existsSync(jsonPath)) {
    throw new Error(`Blender API JSON not found: ${jsonPath}`);
  }

  const raw = readFileSync(jsonPath, "utf-8");
  const api = JSON.parse(raw);

  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blender_classes (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      inherits TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS blender_members (
      id INTEGER PRIMARY KEY,
      class_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      signature TEXT,
      type TEXT,
      description TEXT,
      FOREIGN KEY (class_id) REFERENCES blender_classes(id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS blender_fts USING fts5(
      class_name, symbol_name, kind, description,
      tokenize='porter unicode61'
    );
  `);

  const insertClass = db.prepare(
    "INSERT INTO blender_classes (name, inherits, description) VALUES (?, ?, ?)"
  );
  const insertMember = db.prepare(
    "INSERT INTO blender_members (class_id, name, kind, signature, type, description) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertFts = db.prepare(
    "INSERT INTO blender_fts (class_name, symbol_name, kind, description) VALUES (?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    const classes = api.classes || {};
    for (const [className, classData] of Object.entries(classes)) {
      const cd = classData as BlenderClassInfo;
      const result = insertClass.run(cd.name, cd.inherits || "", cd.description || "");
      const classId = result.lastInsertRowid as number;

      // Index class itself
      insertFts.run(cd.name, cd.name, "class", cd.description || "");

      // Properties
      for (const prop of cd.properties || []) {
        insertMember.run(classId, prop.name, "property", "", prop.type || "", prop.description || "");
        insertFts.run(cd.name, prop.name, "property", prop.description || "");
      }

      // Methods
      for (const method of cd.methods || []) {
        insertMember.run(classId, method.name, "method", method.signature || "", "", method.description || "");
        insertFts.run(cd.name, method.name, "method", method.description || "");
      }
    }

    // Operators
    const operators = api.operators || {};
    for (const [opName, opData] of Object.entries(operators)) {
      const od = opData as { name: string; description: string };
      insertFts.run("bpy.ops", od.name, "operator", od.description || "");
    }
  });

  transaction();

  const classCount = (db.prepare("SELECT COUNT(*) as c FROM blender_classes").get() as { c: number }).c;
  const memberCount = (db.prepare("SELECT COUNT(*) as c FROM blender_members").get() as { c: number }).c;
  console.error(`[GodotForge] Indexed Blender API: ${classCount} classes, ${memberCount} members`);

  return db;
}

/**
 * Search Blender docs via FTS5.
 */
export function searchBlenderDocs(
  db: Database.Database,
  query: string,
  limit: number = 10
): BlenderSearchResult[] {
  const ftsQuery = query.replace(/['"(){}[\]*:^~!@#$%&]/g, "").trim();
  if (!ftsQuery) return [];

  const sanitized = /^[A-Z][a-zA-Z0-9]+$/.test(ftsQuery)
    ? `"${ftsQuery}"`
    : ftsQuery.split(/\s+/).map((w) => `"${w}"*`).join(" ");

  return db.prepare(`
    SELECT class_name, symbol_name, kind,
           snippet(blender_fts, 3, '>>>', '<<<', '...', 50) as description
    FROM blender_fts
    WHERE blender_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(sanitized, limit) as BlenderSearchResult[];
}

/**
 * Get a Blender class reference (for context injection).
 */
export function getBlenderClassReference(
  db: Database.Database,
  className: string
): BlenderClassInfo | null {
  const cls = db.prepare(
    "SELECT * FROM blender_classes WHERE name = ? COLLATE NOCASE"
  ).get(className) as { id: number; name: string; inherits: string; description: string } | undefined;

  if (!cls) return null;

  const properties = db.prepare(
    "SELECT name, type, description FROM blender_members WHERE class_id = ? AND kind = 'property' ORDER BY name"
  ).all(cls.id) as Array<{ name: string; type: string; description: string }>;

  const methods = db.prepare(
    "SELECT name, signature, description FROM blender_members WHERE class_id = ? AND kind = 'method' ORDER BY name"
  ).all(cls.id) as Array<{ name: string; signature: string; description: string }>;

  return {
    name: cls.name,
    inherits: cls.inherits,
    description: cls.description,
    properties,
    methods,
  };
}
