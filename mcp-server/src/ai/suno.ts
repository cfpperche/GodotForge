/**
 * Suno API client (sunoapi.org third-party wrapper).
 * Music generation, lyrics, task polling, credit check.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { pollUntil } from "./poll.js";

const BASE_URL = "https://api.sunoapi.org";
const POLL_INTERVAL_MS = 10_000;
const DEFAULT_MAX_WAIT_MS = 180_000; // 3 minutes

// --- Types ---

export type SunoModel = "V4" | "V4_5" | "V4_5PLUS" | "V5" | "V5_5";
export type VocalGender = "m" | "f";
export type SunoTaskStatus = "pending" | "processing" | "completed" | "failed";

export interface SunoTrack {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  status: SunoTaskStatus;
  error_message?: string;
}

export interface SunoTask {
  taskId: string;
  status: SunoTaskStatus;
  tracks?: SunoTrack[];
}

export interface SunoGenerateParams {
  customMode: boolean;
  instrumental: boolean;
  model?: SunoModel;
  callBackUrl?: string;
  // customMode === true
  prompt?: string;
  style?: string;
  title?: string;
  // customMode === false
  // prompt reused as creative direction
  negativeTags?: string;
  vocalGender?: VocalGender;
  styleWeight?: number;
  weirdnessConstraint?: number;
}

// --- Helpers ---

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function apiPost<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Suno API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Suno API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- API Functions ---

export async function generateMusic(apiKey: string, params: SunoGenerateParams): Promise<{ taskId: string }> {
  const body: Record<string, unknown> = {
    customMode: params.customMode,
    instrumental: params.instrumental,
  };

  if (params.model) body.model = params.model;
  if (params.callBackUrl) body.callBackUrl = params.callBackUrl;
  if (params.negativeTags) body.negativeTags = params.negativeTags;
  if (params.vocalGender) body.vocalGender = params.vocalGender;
  if (params.styleWeight !== undefined) body.styleWeight = params.styleWeight;
  if (params.weirdnessConstraint !== undefined) body.weirdnessConstraint = params.weirdnessConstraint;

  if (params.customMode) {
    body.prompt = params.prompt;
    body.style = params.style;
    body.title = params.title;
  } else {
    body.prompt = params.prompt;
  }

  const data = await apiPost<{ data: { taskId: string } }>(apiKey, "/api/v1/generate", body);
  return { taskId: data.data.taskId };
}

export async function generateLyrics(apiKey: string, prompt: string): Promise<string> {
  const data = await apiPost<{ lyrics: string }>(apiKey, "/api/v1/lyrics", { prompt });
  return data.lyrics;
}

export async function getTaskStatus(apiKey: string, taskId: string): Promise<SunoTask> {
  return apiGet<SunoTask>(apiKey, `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
}

export async function getCredits(apiKey: string): Promise<unknown> {
  return apiGet<unknown>(apiKey, "/api/v1/get-credits");
}

export async function pollSunoDone(
  apiKey: string,
  taskId: string,
  maxWaitMs: number = DEFAULT_MAX_WAIT_MS
): Promise<SunoTask> {
  return pollUntil(
    () => getTaskStatus(apiKey, taskId),
    (task) => task.status === "completed" || task.status === "failed",
    { intervalMs: POLL_INTERVAL_MS, maxWaitMs, label: `Suno ${taskId}` }
  );
}

export async function downloadAudio(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download audio: ${res.status} ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
}
