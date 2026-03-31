/**
 * SQLite-based session persistence.
 * Stores chat message history per session, survives server restarts.
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Message } from "./types.js";

const MAX_AGE_DAYS = 7;
const MAX_SESSIONS = 50;

const dbCache = new Map<string, Database.Database>();

function getDb(projectRoot: string): Database.Database {
  const cached = dbCache.get(projectRoot);
  if (cached) return cached;

  const dir = join(projectRoot, ".godotforge");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const dbPath = join(dir, "sessions.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      messages TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  dbCache.set(projectRoot, db);
  return db;
}

export class SessionStore {
  private db: Database.Database;

  constructor(projectRoot: string) {
    this.db = getDb(projectRoot);
    this.cleanup();
  }

  load(sessionId: string): Message[] | null {
    const row = this.db.prepare("SELECT messages FROM sessions WHERE id = ?").get(sessionId) as
      | { messages: string }
      | undefined;
    if (!row) return null;
    try {
      const messages = JSON.parse(row.messages) as Message[];
      // Sanitize: if last message is a user tool_result, trim it to avoid API 400
      // (Anthropic rejects two consecutive user messages)
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        if (last.role === "user" && Array.isArray(last.content) &&
            (last.content as Array<Record<string, unknown>>).some((b) => b.type === "tool_result")) {
          messages.pop();
        }
      }
      return messages;
    } catch {
      return null;
    }
  }

  save(sessionId: string, messages: Message[]): void {
    const now = new Date().toISOString();
    const json = JSON.stringify(messages);
    this.db.prepare(`
      INSERT INTO sessions (id, messages, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET messages = excluded.messages, updated_at = excluded.updated_at
    `).run(sessionId, json, now, now);
  }

  delete(sessionId: string): void {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  list(): Array<{ id: string; messageCount: number; updatedAt: string }> {
    const rows = this.db.prepare(
      "SELECT id, messages, updated_at FROM sessions ORDER BY updated_at DESC"
    ).all() as Array<{ id: string; messages: string; updated_at: string }>;

    return rows.map((r) => {
      let count = 0;
      try { count = (JSON.parse(r.messages) as unknown[]).length; } catch { /* empty */ }
      return { id: r.id, messageCount: count, updatedAt: r.updated_at };
    });
  }

  cleanup(): void {
    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86_400_000).toISOString();
    this.db.prepare("DELETE FROM sessions WHERE updated_at < ?").run(cutoff);

    // Keep only MAX_SESSIONS most recent
    const count = (this.db.prepare("SELECT COUNT(*) as c FROM sessions").get() as { c: number }).c;
    if (count > MAX_SESSIONS) {
      this.db.prepare(`
        DELETE FROM sessions WHERE id NOT IN (
          SELECT id FROM sessions ORDER BY updated_at DESC, id ASC LIMIT ?
        )
      `).run(MAX_SESSIONS);
    }
  }
}
