import { cn } from "@/lib/utils";
import { ToolCall } from "./tool-call";
import { MarkdownRenderer } from "./markdown-renderer";
import { User, Bot, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ChatMessage } from "@/types/api";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group flex gap-3 px-4 py-3 hover:bg-muted/10 transition-all duration-200", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex flex-col gap-1 min-w-0", isUser ? "items-end max-w-[80%]" : "max-w-[85%]")}>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {message.tool_calls.map((tc, i) => (
              <ToolCall key={i} tool={tc} />
            ))}
          </div>
        )}

        <div
          className={cn(
            "relative rounded-xl px-4 py-2.5 text-sm transition-all duration-200",
            isUser
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg"
              : "bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {/* Copy button for assistant messages */}
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
