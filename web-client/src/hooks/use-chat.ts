import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/types/api";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(crypto.randomUUID());

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await api.chat(content.trim(), sessionId.current);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.error
          ? `Error: ${response.error}`
          : response.response,
        tool_calls: response.tool_calls,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionId.current = crypto.randomUUID();
  }, []);

  return { messages, loading, sendMessage, clearMessages };
}
