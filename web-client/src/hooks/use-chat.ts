import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, ToolCallLog } from "@/types/api";

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
    sessionId.current = crypto.randomUUID();
  }, []);

  return { messages, loading, sendMessage, clearMessages };
}
