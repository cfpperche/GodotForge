declare module "jsfxr" {
  interface SfxrWave {
    dataURI: string;
    getAudio(): unknown;
  }

  interface SfxrParams {
    [key: string]: unknown;
    wave_type: number;
    sound_vol: number;
    sample_rate: number;
    sample_size: number;
    pickupCoin(): void;
    laserShoot(): void;
    explosion(): void;
    powerUp(): void;
    hitHurt(): void;
    jump(): void;
    blipSelect(): void;
    synth(): void;
    tone(): void;
    click(): void;
    random(): void;
    mutate(): void;
    fromJSON(obj: Record<string, unknown>): void;
    toB58(): string;
    fromB58(str: string): void;
  }

  interface Sfxr {
    generate(preset: string): Record<string, unknown>;
    toWave(params: Record<string, unknown>): SfxrWave;
    toBuffer(params: Record<string, unknown>): Float32Array;
    toAudio(params: Record<string, unknown>): unknown;
    play(params: Record<string, unknown>): void;
    b58encode(params: Record<string, unknown>): string;
    b58decode(str: string): Record<string, unknown>;
  }

  export const sfxr: Sfxr;
}
