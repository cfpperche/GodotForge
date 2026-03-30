import { appendFileSync, statSync, renameSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface EventEntry {
  ts: string;
  type: "chat" | "tool_call" | "tool_result" | "guardrail" | "webhook" | "session" | "error";
  [key: string]: unknown;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROTATIONS = 3;

export class EventLog {
  private filePath: string;
  private dir: string;

  constructor(projectRoot: string) {
    this.dir = join(projectRoot, ".godotforge");
    this.filePath = join(this.dir, "events.jsonl");
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  emit(event: Omit<EventEntry, "ts">): void {
    const entry = { ts: new Date().toISOString(), ...event } as EventEntry;
    try {
      this.rotateIfNeeded();
      appendFileSync(this.filePath, JSON.stringify(entry) + "\n");
    } catch (err) {
      console.error("[EventLog] Write failed:", err);
    }
  }

  query(options: { limit?: number; type?: string; since?: string } = {}): EventEntry[] {
    const { limit = 100, type, since } = options;
    if (!existsSync(this.filePath)) return [];

    try {
      const lines = readFileSync(this.filePath, "utf-8").trim().split("\n").filter(Boolean);
      let entries = lines.map((line) => {
        try { return JSON.parse(line) as EventEntry; } catch { return null; }
      }).filter((e): e is EventEntry => e !== null);

      if (type) entries = entries.filter((e) => e.type === type);
      if (since) entries = entries.filter((e) => e.ts >= since);

      return entries.slice(-limit);
    } catch {
      return [];
    }
  }

  stats(): Record<string, unknown> {
    const entries = this.query({ limit: 10000 });
    const counts: Record<string, number> = {};
    let errors = 0;
    let totalDuration = 0;
    let toolCalls = 0;

    for (const e of entries) {
      counts[e.type] = (counts[e.type] || 0) + 1;
      if (e.type === "error") errors++;
      if (e.type === "tool_result") {
        toolCalls++;
        if (typeof e.duration_ms === "number") totalDuration += e.duration_ms;
      }
    }

    return {
      total_events: entries.length,
      by_type: counts,
      errors,
      tool_calls: toolCalls,
      avg_tool_duration_ms: toolCalls > 0 ? Math.round(totalDuration / toolCalls) : 0,
      oldest: entries[0]?.ts || null,
      newest: entries[entries.length - 1]?.ts || null,
    };
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const stat = statSync(this.filePath);
      if (stat.size < MAX_FILE_SIZE) return;

      // Rotate: events.2.jsonl → events.3.jsonl, events.1.jsonl → events.2.jsonl, etc.
      for (let i = MAX_ROTATIONS - 1; i >= 1; i--) {
        const src = join(this.dir, `events.${i}.jsonl`);
        const dst = join(this.dir, `events.${i + 1}.jsonl`);
        if (existsSync(src)) renameSync(src, dst);
      }
      renameSync(this.filePath, join(this.dir, "events.1.jsonl"));
    } catch { /* rotation failure is non-critical */ }
  }
}
