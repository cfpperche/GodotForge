/**
 * Sliding window rate limiter per endpoint category.
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

const WINDOW_MS = 60_000; // 1 minute

const CATEGORY_LIMITS: Record<string, number> = {
  chat: 20,
  config: 10,
  files: 200,
  default: 100,
};

export function getCategory(path: string, method: string): string {
  if (path === "/chat" || path === "/chat/stream" || path === "/chat/agent") return "chat";
  if (path === "/keys" || path === "/config" || path === "/settings" || path === "/paths") {
    if (method === "POST" || method === "PUT" || method === "DELETE") return "config";
  }
  if (path.startsWith("/file")) return "files";
  return "default";
}

export class RateLimiter {
  private buckets = new Map<string, number[]>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60_000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  check(category: string): RateLimitResult {
    const now = Date.now();
    const limit = CATEGORY_LIMITS[category] || CATEGORY_LIMITS.default;

    let timestamps = this.buckets.get(category);
    if (!timestamps) {
      timestamps = [];
      this.buckets.set(category, timestamps);
    }

    // Prune old entries
    const cutoff = now - WINDOW_MS;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= limit) {
      const retryAfterMs = timestamps[0] + WINDOW_MS - now;
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
    }

    timestamps.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }

  private cleanup(): void {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, timestamps] of this.buckets) {
      while (timestamps.length > 0 && timestamps[0] < cutoff) timestamps.shift();
      if (timestamps.length === 0) this.buckets.delete(key);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
