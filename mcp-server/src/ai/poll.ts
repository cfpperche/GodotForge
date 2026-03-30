/**
 * Generic polling helper for AI service task status checks.
 * Replaces 5 identical polling implementations across AI modules.
 */
export async function pollUntil<T>(
  fetchFn: () => Promise<T>,
  isDone: (result: T) => boolean,
  opts: { intervalMs?: number; maxWaitMs?: number; label?: string }
): Promise<T> {
  const interval = opts.intervalMs ?? 5000;
  const maxWait = opts.maxWaitMs ?? 300_000;
  const label = opts.label ?? "task";
  const deadline = Date.now() + maxWait;

  while (Date.now() < deadline) {
    let result: T;
    try {
      result = await fetchFn();
    } catch (error) {
      throw new Error(`${label} poll failed: ${error instanceof Error ? error.message : error}`);
    }
    if (isDone(result)) return result;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(interval, remaining)));
  }

  throw new Error(`${label} timed out after ${maxWait / 1000}s`);
}
