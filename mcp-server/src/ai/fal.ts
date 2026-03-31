/**
 * fal.ai API client — queue-based async inference.
 * Docs: https://fal.ai/docs/queue/usage
 * Auth: Authorization: Key ${apiKey}
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { dirname } from "path";
import { pollUntil } from "./poll.js";

const QUEUE_URL = "https://queue.fal.run";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 300_000;

// --- Types ---

export interface QueueResponse {
  request_id: string;
  status_url: string;
  response_url: string;
  cancel_url: string;
}

export interface QueueStatus {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  queue_position?: number;
  logs?: Array<{ message: string }>;
  error?: string;
  response_url: string;
}

export interface FalImage {
  url: string;
  width: number;
  height: number;
  content_type: string;
}

export interface FalFile {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

// --- Auth ---

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Key ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function throwOnError(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`fal.ai ${context}: HTTP ${res.status} — ${body.slice(0, 300)}`);
  }
}

// --- Queue API ---

export async function submit(
  modelId: string,
  params: Record<string, unknown>,
  apiKey: string
): Promise<QueueResponse> {
  const res = await fetch(`${QUEUE_URL}/${modelId}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(params),
  });
  await throwOnError(res, `submit(${modelId})`);
  return res.json() as Promise<QueueResponse>;
}

export async function getStatus(statusUrl: string, apiKey: string): Promise<QueueStatus> {
  const res = await fetch(statusUrl, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  await throwOnError(res, "getStatus");
  return res.json() as Promise<QueueStatus>;
}

export async function fetchResult<T>(responseUrl: string, apiKey: string): Promise<T> {
  const res = await fetch(responseUrl, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  await throwOnError(res, "fetchResult");
  return res.json() as Promise<T>;
}

export async function pollUntilDone(
  statusUrl: string,
  apiKey: string,
  maxWaitMs: number = MAX_POLL_MS
): Promise<QueueStatus> {
  const status = await pollUntil(
    () => getStatus(statusUrl, apiKey),
    (s) => {
      if (s.error) throw new Error(`fal.ai job failed: ${s.error}`);
      return s.status === "COMPLETED";
    },
    { intervalMs: POLL_INTERVAL_MS, maxWaitMs, label: "fal.ai job" }
  );
  return status;
}

export async function run<T>(
  modelId: string,
  params: Record<string, unknown>,
  apiKey: string
): Promise<T> {
  const queued = await submit(modelId, params, apiKey);
  console.error(`[fal.ai] Queued ${modelId} — request_id: ${queued.request_id}`);
  const done = await pollUntilDone(queued.status_url, apiKey);
  return fetchResult<T>(done.response_url, apiKey);
}

// --- File Utilities ---

export async function downloadFile(url: string, destPath: string): Promise<void> {
  mkdirSync(dirname(destPath), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": "GodotForge/0.2.0" } });
  if (!res.ok) throw new Error(`fal.ai download failed: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
}

/**
 * Resolve a local file path or res:// path to a base64 data URI
 * so it can be passed to external APIs that require a URL.
 */
export function localPathToDataUri(filePath: string, projectRoot: string): string {
  let absPath = filePath;
  if (filePath.startsWith("res://")) {
    absPath = filePath.replace("res://", `${projectRoot}/`);
  }
  const buffer = readFileSync(absPath);
  const ext = absPath.split(".").pop()?.toLowerCase() ?? "png";
  const mime =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * If the value looks like a local path, convert to data URI; otherwise return as-is.
 */
export function resolveImageUrl(value: string, projectRoot: string): string {
  if (value.startsWith("res://") || value.startsWith("/")) {
    return localPathToDataUri(value, projectRoot);
  }
  return value;
}
