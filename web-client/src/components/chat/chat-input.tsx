import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  insertText?: string;
}

export function ChatInput({ onSend, loading, insertText }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert text from external source (e.g. skill bar click)
  useEffect(() => {
    if (insertText) {
      setValue(insertText);
      textareaRef.current?.focus();
    }
  }, [insertText]);

  const handleSend = () => {
    if (!value.trim() || loading) return;
    onSend(value);
    setValue("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 p-4 border-t border-border">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
        disabled={loading}
        className="min-h-[44px] max-h-[200px] resize-none bg-muted/50"
        rows={1}
      />
      <Button
        onClick={handleSend}
        disabled={!value.trim() || loading}
        size="icon"
        className="shrink-0 self-end"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
