import { useState, useCallback, useRef, useEffect } from "react";
import { api, authFetch } from "@/lib/api";
import type { ChatMessage, ToolCallLog } from "@/types/api";

export interface PendingConfirmation {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  risk: string;
}

const SESSION_PREFIX = "godotforge-session-id:";
const MESSAGES_PREFIX = "godotforge-messages:";

function getOrCreateSessionId(projectRoot: string): string {
  const key = SESSION_PREFIX + projectRoot;
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function loadMessages(projectRoot: string): ChatMessage[] {
  try {
    const stored = sessionStorage.getItem(MESSAGES_PREFIX + projectRoot);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function useChat(projectRoot: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(projectRoot));
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const sessionId = useRef(getOrCreateSessionId(projectRoot));
  const projectRootRef = useRef(projectRoot);

  // Reload messages when project changes
  useEffect(() => {
    if (projectRoot === projectRootRef.current) return;
    projectRootRef.current = projectRoot;
    setMessages(loadMessages(projectRoot));
    sessionId.current = getOrCreateSessionId(projectRoot);
    setLoading(false);
    setPendingConfirm(null);
  }, [projectRoot]);

  // Persist messages to sessionStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(MESSAGES_PREFIX + projectRootRef.current, JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      tool_calls: [],
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    try {
      await api.chatStream(content.trim(), sessionId.current, (event) => {
        switch (event.type) {
          case "text":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: event.content || "" }
                  : m,
              ),
            );
            break;

          case "tool_use":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      tool_calls: [
                        ...(m.tool_calls || []),
                        {
                          name: event.name || "",
                          result: "",
                          is_error: false,
                        } as ToolCallLog,
                      ],
                    }
                  : m,
              ),
            );
            break;

          case "confirm":
            setPendingConfirm({
              id: event.id || "",
              tool: event.tool || event.name || "",
              args: event.args || {},
              risk: event.risk || "destructive",
            });
            break;

          case "error":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: `Error: ${event.content}` }
                  : m,
              ),
            );
            break;

          case "done":
            setLoading(false);
            break;
        }
      });
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
              }
            : m,
        ),
      );
      setLoading(false);
    }
  }, [loading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(MESSAGES_PREFIX + projectRootRef.current);
    const key = SESSION_PREFIX + projectRootRef.current;
    const newId = crypto.randomUUID();
    sessionId.current = newId;
    localStorage.setItem(key, newId);
  }, []);

  const respondConfirm = useCallback(async (confirmed: boolean) => {
    if (!pendingConfirm) return;
    const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";
    try {
      await authFetch(`${BASE_URL}/chat/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingConfirm.id, confirmed }),
      });
    } catch { /* non-critical */ }
    setPendingConfirm(null);
  }, [pendingConfirm]);

  return { messages, loading, sendMessage, clearMessages, pendingConfirm, respondConfirm };
}
