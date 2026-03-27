import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import type { ParsedClass } from "./types.js";

const GODOTFORGE_DIR = join(homedir(), ".godotforge");

export function getDbPath(version: string): string {
  return join(GODOTFORGE_DIR, `docs-${version}.db`);
}

export function dbExists(version: string): boolean {
  return existsSync(getDbPath(version));
}

export function openDatabase(version: string): Database.Database {
  mkdirSync(GODOTFORGE_DIR, { recursive: true });
  const dbPath = getDbPath(version);
  return new Database(dbPath);
}

export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      inherits TEXT,
      brief_description TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS methods (
      id INTEGER PRIMARY KEY,
      class_id INTEGER REFERENCES classes(id),
      name TEXT NOT NULL,
      return_type TEXT,
      qualifiers TEXT,
      description TEXT,
      params_json TEXT
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY,
      class_id INTEGER REFERENCES classes(id),
      name TEXT NOT NULL,
      type TEXT,
      default_value TEXT,
      setter TEXT,
      getter TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY,
      class_id INTEGER REFERENCES classes(id),
      name TEXT NOT NULL,
      description TEXT,
      params_json TEXT
    );

    CREATE TABLE IF NOT EXISTS constants (
      id INTEGER PRIMARY KEY,
      class_id INTEGER REFERENCES classes(id),
      name TEXT NOT NULL,
      value TEXT,
      enum_name TEXT,
      description TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(
      symbol_name,
      class_name,
      kind,
      description,
      source_id UNINDEXED,
      tokenize='porter unicode61'
    );

    CREATE INDEX IF NOT EXISTS idx_methods_class ON methods(class_id);
    CREATE INDEX IF NOT EXISTS idx_properties_class ON properties(class_id);
    CREATE INDEX IF NOT EXISTS idx_signals_class ON signals(class_id);
    CREATE INDEX IF NOT EXISTS idx_constants_class ON constants(class_id);
    CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);
  `);
}

export function insertClass(db: Database.Database, cls: ParsedClass): void {
  const insertClassStmt = db.prepare(
    `INSERT OR IGNORE INTO classes (name, inherits, brief_description, description)
     VALUES (?, ?, ?, ?)`
  );

  const insertMethodStmt = db.prepare(
    `INSERT INTO methods (class_id, name, return_type, qualifiers, description, params_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertPropertyStmt = db.prepare(
    `INSERT INTO properties (class_id, name, type, default_value, setter, getter, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertSignalStmt = db.prepare(
    `INSERT INTO signals (class_id, name, description, params_json)
     VALUES (?, ?, ?, ?)`
  );

  const insertConstantStmt = db.prepare(
    `INSERT INTO constants (class_id, name, value, enum_name, description)
     VALUES (?, ?, ?, ?, ?)`
  );

  const insertFts = db.prepare(
    `INSERT INTO docs_fts (symbol_name, class_name, kind, description, source_id)
     VALUES (?, ?, ?, ?, ?)`
  );

  const result = insertClassStmt.run(
    cls.name,
    cls.inherits,
    cls.brief_description,
    cls.description
  );

  const classId = result.lastInsertRowid as number;
  if (classId === 0) return; // class already existed

  // Index the class itself
  insertFts.run(cls.name, cls.name, "class", stripBBCode(cls.brief_description + " " + cls.description), classId);

  for (const method of cls.methods) {
    const r = insertMethodStmt.run(
      classId, method.name, method.return_type, method.qualifiers,
      method.description, JSON.stringify(method.params)
    );
    insertFts.run(method.name, cls.name, "method", stripBBCode(method.description), r.lastInsertRowid);
  }

  for (const prop of cls.properties) {
    const r = insertPropertyStmt.run(
      classId, prop.name, prop.type, prop.default_value,
      prop.setter, prop.getter, prop.description
    );
    insertFts.run(prop.name, cls.name, "property", stripBBCode(prop.description), r.lastInsertRowid);
  }

  for (const sig of cls.signals) {
    const r = insertSignalStmt.run(
      classId, sig.name, sig.description, JSON.stringify(sig.params)
    );
    insertFts.run(sig.name, cls.name, "signal", stripBBCode(sig.description), r.lastInsertRowid);
  }

  for (const constant of cls.constants) {
    const r = insertConstantStmt.run(
      classId, constant.name, constant.value, constant.enum_name, constant.description
    );
    insertFts.run(constant.name, cls.name, "constant", stripBBCode(constant.description), r.lastInsertRowid);
  }
}

function stripBBCode(text: string): string {
  return text
    .replace(/\[\/?\w+[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
