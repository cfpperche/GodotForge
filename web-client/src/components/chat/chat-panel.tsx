import { useEffect, useRef, useContext, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { useChat } from "@/hooks/use-chat";
import { ProjectContext } from "@/app";
import { Bot, Trash2, Gamepad2, Boxes, Paintbrush, Music, FolderOpen, Plus, AlertCircle, Sparkles, ShieldAlert, Check, X } from "lucide-react";

const SUGGESTIONS = [
  { icon: Gamepad2, text: "Create a 3D platformer scene with a player" },
  { icon: Boxes, text: "Model a low-poly sword in Blender and import it" },
  { icon: Paintbrush, text: "Download a stone texture from Poly Haven" },
  { icon: Music, text: "Search OpenGameArt for background music" },
];

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface SkillInfo { name: string; description: string; }

export function ChatPanel() {
  const { messages, loading, sendMessage, clearMessages, pendingConfirm, respondConfirm } = useChat();
  const { isValid, openSettings } = useContext(ProjectContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [insertText, setInsertText] = useState<string | undefined>();

  useEffect(() => {
    if (!isValid) return;
    fetch(`${BASE_URL}/skills`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setSkills(data);
    }).catch(() => {});
  }, [isValid]);

  const handleSkillClick = useCallback((name: string) => {
    setInsertText(`/${name} `);
    // Reset so the same skill can be clicked again
    setTimeout(() => setInsertText(undefined), 100);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // No project — show blocked state
  if (!isValid) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center shadow-lg">
            <AlertCircle className="h-10 w-10 text-orange-400" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Select an existing Godot project or create a new one to start building games with the copilot.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              onClick={openSettings}
            >
              <FolderOpen className="h-4 w-4" /> Open Project
            </Button>
            <Button
              className="gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              onClick={openSettings}
            >
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground mt-4">
            Projects store memory, sessions, and context separately
          </p>
        </div>

        {/* Disabled input */}
        <div className="flex gap-2 p-4 border-t border-border opacity-50 pointer-events-none">
          <div className="flex-1 h-[44px] bg-muted/30 rounded-md flex items-center px-3 text-sm text-muted-foreground">
            Select a project first...
          </div>
          <div className="h-[44px] w-[44px] bg-muted/30 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg glow-primary">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">GodotForge Copilot</h3>
                <p className="text-sm max-w-md text-muted-foreground">
                  AI game development hub. Create scenes in Godot, model in Blender,
                  download assets, and build games with natural language.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full mt-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/60 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 text-left text-sm group"
                  >
                    <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{s.text}</span>
                  </button>
                ))}
              </div>

              {/* Skill bar */}
              {skills.length > 0 && (
                <div className="max-w-lg w-full mt-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground font-medium">Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.slice(0, 12).map((s) => (
                      <button
                        key={s.name}
                        onClick={() => handleSkillClick(s.name)}
                        title={s.description}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-muted/30 text-muted-foreground border border-border/30 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                      >
                        /{s.name}
                      </button>
                    ))}
                    {skills.length > 12 && (
                      <span className="px-2.5 py-1 text-[11px] text-muted-foreground">+{skills.length - 12} more</span>
                    )}
                  </div>
                </div>
              )}
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

      {/* Confirmation dialog */}
      {pendingConfirm && (
        <div className="mx-4 mb-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <ShieldAlert className="h-4 w-4" />
            Confirmation Required
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-mono bg-muted/30 px-1.5 py-0.5 rounded">{pendingConfirm.tool}</span>
            <span className="ml-1.5 text-amber-400/70">({pendingConfirm.risk})</span>
          </div>
          {Object.keys(pendingConfirm.args).length > 0 && (
            <pre className="text-[11px] font-mono text-muted-foreground bg-muted/20 p-2 rounded overflow-x-auto">
              {Object.entries(pendingConfirm.args).map(([k, v]) => `${k}: ${String(v)}`).join("\n")}
            </pre>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => respondConfirm(true)}>
              <Check className="h-3 w-3" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 text-destructive" onClick={() => respondConfirm(false)}>
              <X className="h-3 w-3" /> Deny
            </Button>
          </div>
        </div>
      )}

      <ChatInput onSend={sendMessage} loading={loading} insertText={insertText} />
    </div>
  );
}
