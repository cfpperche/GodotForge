/**
 * Generic polling helper for AI service task status checks.
 * Features: exponential backoff, jitter, progress callback, cancellation.
 */

export interface PollOptions<T> {
  /** Initial poll interval in ms (default: 2000). */
  intervalMs?: number;
  /** Maximum interval after backoff (default: 30000). */
  maxIntervalMs?: number;
  /** Total timeout in ms (default: 300000 = 5 min). */
  maxWaitMs?: number;
  /** Label for error messages. */
  label?: string;
  /** Called on each poll iteration with the latest result. */
  onProgress?: (result: T) => void;
  /** Return true to abort polling early (e.g., task cancelled). */
  isCancelled?: () => boolean;
}

export async function pollUntil<T>(
  fetchFn: () => Promise<T>,
  isDone: (result: T) => boolean,
  opts: PollOptions<T> = {}
): Promise<T> {
  const initialInterval = opts.intervalMs ?? 2000;
  const maxInterval = opts.maxIntervalMs ?? 30_000;
  const maxWait = opts.maxWaitMs ?? 300_000;
  const label = opts.label ?? "task";
  const deadline = Date.now() + maxWait;
  let currentInterval = initialInterval;

  while (Date.now() < deadline) {
    if (opts.isCancelled?.()) {
      throw new Error(`${label} cancelled`);
    }

    let result: T;
    try {
      result = await fetchFn();
    } catch (error) {
      throw new Error(`${label} poll failed: ${error instanceof Error ? error.message : error}`);
    }

    opts.onProgress?.(result);
    if (isDone(result)) return result;

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    // Exponential backoff with ±20% jitter
    const jitter = 0.8 + Math.random() * 0.4;
    const delay = Math.min(currentInterval * jitter, remaining);
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    currentInterval = Math.min(currentInterval * 2, maxInterval);
  }

  throw new Error(`${label} timed out after ${maxWait / 1000}s`);
}
