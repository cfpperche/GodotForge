import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync } from "fs";

const GODOTFORGE_DIR = ".godotforge";
const MEMORY_DB = "memory.db";

const dbCache = new Map<string, Database.Database>();

export interface MemorySearchResult {
  id: number;
  category: string;
  content: string;
}

export interface MemoryStats {
  total_entries: number;
  categories: string[];
  oldest: string | null;
  newest: string | null;
}

export function ensureMemoryDb(projectRoot: string): Database.Database {
  const cacheKey = projectRoot;
  if (dbCache.has(cacheKey)) return dbCache.get(cacheKey)!;

  const dir = join(projectRoot, GODOTFORGE_DIR);
  mkdirSync(dir, { recursive: true });

  const dbPath = join(dir, MEMORY_DB);
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_entries (
      id INTEGER PRIMARY KEY,
      timestamp TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
      category, content,
      tokenize='porter unicode61'
    );

    CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory_entries(timestamp);
    CREATE INDEX IF NOT EXISTS idx_memory_category ON memory_entries(category);
  `);

  dbCache.set(cacheKey, db);
  return db;
}

export function indexMemoryEntry(
  db: Database.Database,
  timestamp: string,
  category: string,
  content: string
): number {
  const result = db
    .prepare(
      "INSERT INTO memory_entries (timestamp, category, content) VALUES (?, ?, ?)"
    )
    .run(timestamp, category, content);

  const rowId = result.lastInsertRowid as number;

  db.prepare("INSERT INTO memory_fts (rowid, category, content) VALUES (?, ?, ?)").run(
    rowId,
    category,
    content
  );

  return rowId;
}

export function searchMemory(
  db: Database.Database,
  query: string,
  limit: number = 10
): MemorySearchResult[] {
  const ftsQuery = sanitizeQuery(query);

  const results = db
    .prepare(
      `SELECT me.id, me.category,
              snippet(memory_fts, 1, '>>>', '<<<', '...', 60) as content
       FROM memory_fts mf
       JOIN memory_entries me ON me.id = mf.rowid
       WHERE memory_fts MATCH ?
       ORDER BY rank
       LIMIT ?`
    )
    .all(ftsQuery, limit) as MemorySearchResult[];

  return results;
}

export function getRecentMemory(
  db: Database.Database,
  limit: number = 20
): Array<{ timestamp: string; category: string; content: string }> {
  return db
    .prepare(
      "SELECT timestamp, category, content FROM memory_entries ORDER BY timestamp DESC LIMIT ?"
    )
    .all(limit) as Array<{ timestamp: string; category: string; content: string }>;
}

export function getMemoryStats(db: Database.Database): MemoryStats {
  const count = db
    .prepare("SELECT COUNT(*) as count FROM memory_entries")
    .get() as { count: number };

  const categories = db
    .prepare("SELECT DISTINCT category FROM memory_entries ORDER BY category")
    .all() as Array<{ category: string }>;

  const oldest = db
    .prepare(
      "SELECT timestamp FROM memory_entries ORDER BY timestamp ASC LIMIT 1"
    )
    .get() as { timestamp: string } | undefined;

  const newest = db
    .prepare(
      "SELECT timestamp FROM memory_entries ORDER BY timestamp DESC LIMIT 1"
    )
    .get() as { timestamp: string } | undefined;

  return {
    total_entries: count.count,
    categories: categories.map((c) => c.category),
    oldest: oldest?.timestamp || null,
    newest: newest?.timestamp || null,
  };
}

function sanitizeQuery(query: string): string {
  const cleaned = query.replace(/['"(){}[\]*:^~!@#$%&]/g, "").trim();
  if (!cleaned) return '""';
  return cleaned
    .split(/\s+/)
    .map((word) => `"${word}"*`)
    .join(" ");
}
