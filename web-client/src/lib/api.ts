import type {
  ChatResponse,
  HealthResponse,
  SettingsResponse,
  KeysResponse,
  StreamEvent,
  FileEntry,
} from "@/types/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

/** Auth token — bootstrapped from /health on first request. */
let authToken: string | null = null;

async function bootstrapToken(): Promise<string> {
  if (authToken) return authToken;
  try {
    const res = await fetch(`${BASE_URL}/health?include_token=1`);
    if (res.ok) {
      const data = await res.json() as { token?: string };
      if (data.token) {
        authToken = data.token;
        return authToken;
      }
    }
  } catch { /* server not ready */ }
  return "";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await bootstrapToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
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

  listFiles: async (path = ""): Promise<FileEntry[]> => {
    const token = await bootstrapToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/files?path=${encodeURIComponent(path)}`, { headers });
    if (!res.ok) return [];
    return res.json() as Promise<FileEntry[]>;
  },

  getFileUrl: (path: string): string => {
    return `${BASE_URL}/file/${encodeURIComponent(path)}`;
  },

  deleteFile: async (path: string): Promise<boolean> => {
    const token = await bootstrapToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/file/${encodeURIComponent(path)}`, { method: "DELETE", headers });
    return res.ok;
  },

  saveFile: async (path: string, content: string): Promise<boolean> => {
    const token = await bootstrapToken();
    const headers: Record<string, string> = { "Content-Type": "text/plain" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/file/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers,
      body: content,
    });
    return res.ok;
  },

  chatStream: async (
    message: string,
    sessionId: string,
    onEvent: (event: StreamEvent) => void,
  ): Promise<void> => {
    const token = await bootstrapToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!res.ok || !res.body) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as Record<string, string>;
      onEvent({ type: "error", content: err.error || `HTTP ${res.status}` });
      onEvent({ type: "done" });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6)) as StreamEvent;
            onEvent(event);
          } catch { /* skip malformed events */ }
        }
      }
    }
  },
};
