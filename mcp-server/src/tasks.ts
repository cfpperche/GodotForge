/**
 * In-memory task registry for async AI operations.
 * Allows long-running tools to return immediately with a task ID,
 * then be polled for status/result via HTTP endpoints.
 */

import { randomUUID } from "crypto";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface TaskEntry {
  id: string;
  tool: string;
  status: "working" | "completed" | "failed" | "cancelled";
  progress?: string;
  result?: ToolResult;
  createdAt: string;
  updatedAt: string;
}

const MAX_COMPLETED_AGE_MS = 30 * 60_000; // 30 minutes
const MAX_TASKS = 100;

export class TaskRegistry {
  private tasks = new Map<string, TaskEntry>();
  private cancelFlags = new Map<string, boolean>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60_000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /** Submit a task for background execution. Returns task ID immediately. */
  submit(tool: string, executeFn: () => Promise<ToolResult>): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const entry: TaskEntry = {
      id,
      tool,
      status: "working",
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, entry);
    this.cancelFlags.set(id, false);

    // Fire-and-forget background execution
    executeFn()
      .then((result) => {
        const task = this.tasks.get(id);
        if (task && task.status === "working") {
          task.status = result.isError ? "failed" : "completed";
          task.result = result;
          task.updatedAt = new Date().toISOString();
        }
      })
      .catch((error) => {
        const task = this.tasks.get(id);
        if (task && task.status === "working") {
          task.status = "failed";
          task.result = {
            content: [{ type: "text", text: `Task error: ${error instanceof Error ? error.message : error}` }],
            isError: true,
          };
          task.updatedAt = new Date().toISOString();
        }
      });

    return id;
  }

  /** Get task status and result. */
  get(taskId: string): TaskEntry | null {
    return this.tasks.get(taskId) ?? null;
  }

  /** Cancel a working task. Polling will check the flag. */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "working") return false;
    this.cancelFlags.set(taskId, true);
    task.status = "cancelled";
    task.updatedAt = new Date().toISOString();
    return true;
  }

  /** Check if a task has been cancelled (for polling loops). */
  isCancelled(taskId: string): boolean {
    return this.cancelFlags.get(taskId) ?? false;
  }

  /** Update progress message for a working task. */
  updateProgress(taskId: string, progress: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === "working") {
      task.progress = progress;
      task.updatedAt = new Date().toISOString();
    }
  }

  /** List all tasks (most recent first). */
  list(): TaskEntry[] {
    return [...this.tasks.values()].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  /** Remove old completed/failed tasks. */
  private cleanup(): void {
    const cutoff = Date.now() - MAX_COMPLETED_AGE_MS;
    for (const [id, task] of this.tasks) {
      if (task.status !== "working" && new Date(task.updatedAt).getTime() < cutoff) {
        this.tasks.delete(id);
        this.cancelFlags.delete(id);
      }
    }
    // Evict oldest if over limit
    if (this.tasks.size > MAX_TASKS) {
      const sorted = [...this.tasks.entries()].sort(
        (a, b) => a[1].updatedAt.localeCompare(b[1].updatedAt)
      );
      const toRemove = sorted.slice(0, this.tasks.size - MAX_TASKS);
      for (const [id] of toRemove) {
        this.tasks.delete(id);
        this.cancelFlags.delete(id);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
