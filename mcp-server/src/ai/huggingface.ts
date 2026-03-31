/**
 * Hugging Face Inference API client (router.huggingface.co).
 * Text-to-image via any diffusion model.
 */

const BASE_URL = "https://router.huggingface.co";
const DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

// --- Types ---

export interface TextToImageParams {
  inputs: string;
  model?: string;
  parameters?: {
    guidance_scale?: number;
    negative_prompt?: string;
    num_inference_steps?: number;
    width?: number;
    height?: number;
    seed?: number;
  };
}

// --- API Functions ---

export async function textToImage(apiKey: string, params: TextToImageParams): Promise<Buffer> {
  const model = params.model ?? DEFAULT_MODEL;
  const body: Record<string, unknown> = { inputs: params.inputs };
  if (params.parameters && Object.keys(params.parameters).length > 0) {
    body.parameters = params.parameters;
  }

  const res = await fetch(`${BASE_URL}/hf-inference/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HuggingFace API ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
