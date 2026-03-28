import { cn } from "@/lib/utils";
import { ToolCall } from "./tool-call";
import { User, Bot } from "lucide-react";
import type { ChatMessage } from "@/types/api";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[80%]", isUser && "items-end")}>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-col gap-0.5 mb-1">
            {message.tool_calls.map((tc, i) => (
              <ToolCall key={i} tool={tc} />
            ))}
          </div>
        )}

        <div
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border"
          )}
        >
          {message.content}
        </div>

        <span className="text-[10px] text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
