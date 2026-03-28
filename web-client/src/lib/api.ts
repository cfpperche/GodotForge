import type {
  ChatResponse,
  HealthResponse,
  SettingsResponse,
  KeysResponse,
} from "@/types/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as Record<string, string>;
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  chat: (message: string, sessionId: string) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),

  getSettings: () => request<SettingsResponse>("/settings"),

  setSettings: (settings: Record<string, unknown>) =>
    request<{ result: string }>("/settings", {
      method: "POST",
      body: JSON.stringify(settings),
    }),

  getKeys: () => request<KeysResponse>("/keys"),

  setKey: (service: string, key: string) =>
    request<{ result: string }>("/keys", {
      method: "POST",
      body: JSON.stringify({ service, key }),
    }),

  removeKey: (service: string) =>
    request<{ result: string }>("/keys", {
      method: "DELETE",
      body: JSON.stringify({ service }),
    }),
};
