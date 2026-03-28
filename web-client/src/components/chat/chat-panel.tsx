import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { useChat } from "@/hooks/use-chat";
import { Bot } from "lucide-react";

export function ChatPanel() {
  const { messages, loading, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-1">GodotForge Copilot</h3>
                <p className="text-sm max-w-md">
                  AI game development hub. Create scenes, model in Blender,
                  import assets, and build games with natural language.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="flex gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-4 py-2.5">
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput onSend={sendMessage} loading={loading} />
    </div>
  );
}
