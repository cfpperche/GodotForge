/**
 * ElevenLabs API client — text-to-speech, sound effects, voices, models.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const BASE_URL = "https://api.elevenlabs.io";

// --- Types ---

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  use_speaker_boost?: boolean;
}

export interface TTSParams {
  text: string;
  model_id?: string;
  language_code?: string;
  voice_settings?: VoiceSettings;
  seed?: number;
  apply_text_normalization?: "auto" | "on" | "off";
  output_format?: string;
}

export interface SoundEffectParams {
  text: string;
  model_id?: string;
  duration_seconds?: number;
  prompt_influence?: number;
  loop?: boolean;
  output_format?: string;
}

export interface ListVoicesParams {
  page_size?: number;
  search?: string;
  sort?: string;
  category?: string;
  voice_type?: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description?: string;
  can_be_finetuned?: boolean;
  can_do_text_to_speech?: boolean;
  languages?: Array<{ language_id: string; name: string }>;
}

// --- Helpers ---

async function apiFetch(
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "xi-api-key": apiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs API error ${res.status}: ${body}`);
  }

  return res;
}

// --- API Functions ---

export async function textToSpeech(
  apiKey: string,
  voiceId: string,
  params: TTSParams
): Promise<Buffer> {
  const { output_format = "mp3_44100_128", ...bodyParams } = params;

  const body: Record<string, unknown> = {
    text: bodyParams.text,
    model_id: bodyParams.model_id ?? "eleven_multilingual_v2",
  };

  if (bodyParams.language_code) body.language_code = bodyParams.language_code;
  if (bodyParams.voice_settings) body.voice_settings = bodyParams.voice_settings;
  if (bodyParams.seed !== undefined) body.seed = bodyParams.seed;
  if (bodyParams.apply_text_normalization) body.apply_text_normalization = bodyParams.apply_text_normalization;

  const res = await apiFetch(
    apiKey,
    `/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${output_format}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  return Buffer.from(await res.arrayBuffer());
}

export async function generateSoundEffect(
  apiKey: string,
  params: SoundEffectParams
): Promise<Buffer> {
  const { output_format = "mp3_44100_128", ...bodyParams } = params;

  const body: Record<string, unknown> = {
    text: bodyParams.text,
    model_id: bodyParams.model_id ?? "eleven_text_to_sound_v2",
  };

  if (bodyParams.duration_seconds !== undefined) body.duration_seconds = bodyParams.duration_seconds;
  if (bodyParams.prompt_influence !== undefined) body.prompt_influence = bodyParams.prompt_influence;
  if (bodyParams.loop !== undefined) body.loop = bodyParams.loop;

  const res = await apiFetch(
    apiKey,
    `/v1/sound-generation?output_format=${output_format}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  return Buffer.from(await res.arrayBuffer());
}

export async function listVoices(
  apiKey: string,
  params: ListVoicesParams = {}
): Promise<ElevenLabsVoice[]> {
  const query = new URLSearchParams();
  if (params.page_size !== undefined) query.set("page_size", String(params.page_size));
  if (params.search) query.set("search", params.search);
  if (params.sort) query.set("sort", params.sort);
  if (params.category) query.set("category", params.category);
  if (params.voice_type) query.set("voice_type", params.voice_type);

  const qs = query.toString();
  const res = await apiFetch(apiKey, `/v2/voices${qs ? `?${qs}` : ""}`);
  const data = await res.json() as { voices: ElevenLabsVoice[] };
  return data.voices ?? [];
}

export async function listModels(apiKey: string): Promise<ElevenLabsModel[]> {
  const res = await apiFetch(apiKey, "/v1/models");
  return res.json() as Promise<ElevenLabsModel[]>;
}

export async function getVoiceSettings(
  apiKey: string,
  voiceId: string
): Promise<VoiceSettings> {
  const res = await apiFetch(apiKey, `/v1/voices/${encodeURIComponent(voiceId)}/settings`);
  return res.json() as Promise<VoiceSettings>;
}

export function saveAudioFile(audioBuffer: Buffer, destPath: string): void {
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, audioBuffer);
}
