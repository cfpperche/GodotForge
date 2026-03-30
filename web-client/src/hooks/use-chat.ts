import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, ToolCallLog, StreamEvent } from "@/types/api";

export interface PendingConfirmation {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  risk: string;
}

const SESSION_KEY = "godotforge-session-id";
const MESSAGES_KEY = "godotforge-messages";

function getOrCreateSessionId(): string {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(MESSAGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const sessionId = useRef(getOrCreateSessionId());

  // Persist messages to sessionStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
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
    sessionStorage.removeItem(MESSAGES_KEY);
    const newId = crypto.randomUUID();
    sessionId.current = newId;
    localStorage.setItem(SESSION_KEY, newId);
  }, []);

  const respondConfirm = useCallback(async (confirmed: boolean) => {
    if (!pendingConfirm) return;
    const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";
    try {
      await fetch(`${BASE_URL}/chat/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingConfirm.id, confirmed }),
      });
    } catch { /* non-critical */ }
    setPendingConfirm(null);
  }, [pendingConfirm]);

  return { messages, loading, sendMessage, clearMessages, pendingConfirm, respondConfirm };
}
