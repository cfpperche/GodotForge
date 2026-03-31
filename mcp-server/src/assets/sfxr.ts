/**
 * jsfxr wrapper — retro sound effect generation (local, offline).
 * Generates WAV files from presets + optional parameter overrides.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

// --- Types ---

export type SfxrPreset =
  | "pickupCoin" | "laserShoot" | "explosion" | "powerUp"
  | "hitHurt" | "jump" | "blipSelect" | "synth"
  | "tone" | "click" | "random";

export interface SfxrParams {
  preset: SfxrPreset;
  wave_type?: number;
  p_env_attack?: number;
  p_env_sustain?: number;
  p_env_punch?: number;
  p_env_decay?: number;
  p_base_freq?: number;
  p_freq_limit?: number;
  p_freq_ramp?: number;
  p_freq_dramp?: number;
  p_vib_strength?: number;
  p_vib_speed?: number;
  p_arp_mod?: number;
  p_arp_speed?: number;
  p_duty?: number;
  p_duty_ramp?: number;
  p_repeat_speed?: number;
  p_pha_offset?: number;
  p_pha_ramp?: number;
  p_lpf_freq?: number;
  p_lpf_ramp?: number;
  p_lpf_resonance?: number;
  p_hpf_freq?: number;
  p_hpf_ramp?: number;
  sound_vol?: number;
  sample_rate?: number;
  sample_size?: number;
}

// --- Generation ---

export async function generateSfx(params: SfxrParams, destPath: string): Promise<{ size: number }> {
  const sfxrModule = await import("jsfxr");
  const sfxr = sfxrModule.sfxr || sfxrModule.default?.sfxr || sfxrModule.default;

  if (!sfxr?.generate || !sfxr?.toWave) {
    throw new Error("jsfxr module not found or incompatible. Run: npm install jsfxr");
  }

  // sfxr.generate(preset) returns a params object with randomized values
  const VALID_PRESETS = new Set([
    "pickupCoin", "laserShoot", "explosion", "powerUp", "hitHurt",
    "jump", "blipSelect", "synth", "tone", "click", "random",
  ]);
  if (!VALID_PRESETS.has(params.preset)) {
    throw new Error(`Unknown preset: ${params.preset}. Valid: ${[...VALID_PRESETS].join(", ")}`);
  }

  const p = sfxr.generate(params.preset) as Record<string, unknown>;

  // Apply overrides
  const overrideKeys = [
    "wave_type", "p_env_attack", "p_env_sustain", "p_env_punch", "p_env_decay",
    "p_base_freq", "p_freq_limit", "p_freq_ramp", "p_freq_dramp",
    "p_vib_strength", "p_vib_speed", "p_arp_mod", "p_arp_speed",
    "p_duty", "p_duty_ramp", "p_repeat_speed",
    "p_pha_offset", "p_pha_ramp",
    "p_lpf_freq", "p_lpf_ramp", "p_lpf_resonance",
    "p_hpf_freq", "p_hpf_ramp",
    "sound_vol", "sample_rate", "sample_size",
  ] as const;

  for (const key of overrideKeys) {
    const val = params[key];
    if (val !== undefined) {
      p[key] = val;
    }
  }

  // Generate WAV
  const wave = sfxr.toWave(p) as { dataURI?: string };
  if (!wave?.dataURI) {
    throw new Error("Failed to generate WAV data from jsfxr");
  }

  // Decode data URI → Buffer
  const base64 = wave.dataURI.split(",")[1];
  if (!base64) throw new Error("Invalid WAV data URI from jsfxr");
  const buffer = Buffer.from(base64, "base64");

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);

  return { size: buffer.length };
}
