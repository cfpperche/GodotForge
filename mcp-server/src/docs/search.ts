import type Database from "better-sqlite3";
import type { SearchResult, ClassReference, ParsedParam } from "./types.js";

export function searchDocs(
  db: Database.Database,
  query: string,
  kind?: string,
  limit: number = 10
): SearchResult[] {
  // Escape FTS5 special chars and add prefix matching
  const ftsQuery = sanitizeFtsQuery(query);

  let sql = `
    SELECT symbol_name, class_name, kind,
           snippet(docs_fts, 3, '>>>', '<<<', '...', 50) as description
    FROM docs_fts
    WHERE docs_fts MATCH ?
  `;

  const params: unknown[] = [ftsQuery];

  if (kind && kind !== "all") {
    sql += ` AND kind = ?`;
    params.push(kind);
  }

  sql += ` ORDER BY rank LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params) as SearchResult[];
}

export function getClassReference(
  db: Database.Database,
  className: string
): ClassReference | null {
  const cls = db
    .prepare("SELECT * FROM classes WHERE name = ? COLLATE NOCASE")
    .get(className) as
    | { id: number; name: string; inherits: string; brief_description: string; description: string }
    | undefined;

  if (!cls) return null;

  const methods = db
    .prepare(
      "SELECT name, return_type, qualifiers, description, params_json FROM methods WHERE class_id = ? ORDER BY name"
    )
    .all(cls.id) as Array<{
    name: string;
    return_type: string;
    qualifiers: string;
    description: string;
    params_json: string;
  }>;

  const properties = db
    .prepare(
      "SELECT name, type, default_value, description FROM properties WHERE class_id = ? ORDER BY name"
    )
    .all(cls.id) as Array<{
    name: string;
    type: string;
    default_value: string;
    description: string;
  }>;

  const signals = db
    .prepare(
      "SELECT name, description, params_json FROM signals WHERE class_id = ? ORDER BY name"
    )
    .all(cls.id) as Array<{
    name: string;
    description: string;
    params_json: string;
  }>;

  const constants = db
    .prepare(
      "SELECT name, value, enum_name, description FROM constants WHERE class_id = ? ORDER BY enum_name, name"
    )
    .all(cls.id) as Array<{
    name: string;
    value: string;
    enum_name: string;
    description: string;
  }>;

  return {
    name: cls.name,
    inherits: cls.inherits,
    brief_description: cls.brief_description,
    description: cls.description,
    methods: methods.map((m) => ({
      ...m,
      params: safeParseJson(m.params_json),
    })),
    properties,
    signals: signals.map((s) => ({
      ...s,
      params: safeParseJson(s.params_json),
    })),
    constants,
  };
}

function sanitizeFtsQuery(query: string): string {
  // Remove FTS5 special characters, add prefix matching for partial terms
  const cleaned = query.replace(/['"(){}[\]*:^~!@#$%&]/g, "").trim();
  if (!cleaned) return '""';

  // If it looks like a class name (PascalCase) or exact term, quote it
  if (/^[A-Z][a-zA-Z0-9]+$/.test(cleaned)) {
    return `"${cleaned}"`;
  }

  // Otherwise add prefix matching for each word
  return cleaned
    .split(/\s+/)
    .map((word) => `"${word}"*`)
    .join(" ");
}

function safeParseJson(json: string | null): ParsedParam[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
