import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { useChat } from "@/hooks/use-chat";
import { Bot, Trash2, Gamepad2, Boxes, Paintbrush, Music } from "lucide-react";

const SUGGESTIONS = [
  { icon: Gamepad2, text: "Create a 3D platformer scene with a player" },
  { icon: Boxes, text: "Model a low-poly sword in Blender and import it" },
  { icon: Paintbrush, text: "Download a stone texture from Poly Haven" },
  { icon: Music, text: "Search OpenGameArt for background music" },
];

export function ChatPanel() {
  const { messages, loading, sendMessage, clearMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with clear button */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end px-4 py-1 border-b border-border/50">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" onClick={clearMessages}>
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-180px)] text-muted-foreground gap-6 px-4">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">GodotForge Copilot</h3>
                <p className="text-sm max-w-md text-muted-foreground">
                  AI game development hub. Create scenes in Godot, model in Blender,
                  download assets, and build games with natural language.
                </p>
              </div>

              {/* Suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full mt-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all text-left text-sm group"
                  >
                    <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="flex gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput onSend={sendMessage} loading={loading} />
    </div>
  );
}
