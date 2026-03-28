import { useSettings } from "@/hooks/use-settings";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Settings, Check } from "lucide-react";
import { useState, useEffect } from "react";

const MODELS = [
  { id: "claude-opus-4-6-20250414", label: "Opus 4.6 (most capable)" },
  { id: "claude-sonnet-4-6-20250414", label: "Sonnet 4.6 (balanced)" },
  { id: "claude-sonnet-4-20250514", label: "Sonnet 4 (fast)" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (fastest)" },
];

export function ChatSettings() {
  const { settings, updateSettings } = useSettings();
  const [model, setModel] = useState("");
  const [maxTokens, setMaxTokens] = useState(4096);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setModel(settings.model);
      setMaxTokens(settings.max_tokens);
      setMemoryEnabled(settings.memory_enabled);
    }
  }, [settings]);

  if (!settings) return null;

  const handleSave = async () => {
    await updateSettings({ model, max_tokens: maxTokens, memory_enabled: memoryEnabled });
    setDirty(false);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    setDirty(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="h-3 w-3" />
          Chat Settings
        </h3>
        {dirty && (
          <Button size="sm" variant="default" className="h-6 text-[10px] gap-1" onClick={handleSave}>
            <Check className="h-3 w-3" /> Save
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Auth mode (read-only) */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Auth</span>
          <Badge variant="secondary" className="text-[10px]">
            {settings.auth_mode === "claude_cli" ? "Claude CLI" : "API Key"}
          </Badge>
        </div>

        {/* Model selector */}
        <div className="space-y-1.5">
          <span className="text-sm text-muted-foreground">Model</span>
          <div className="grid gap-1">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModelChange(m.id)}
                className={`text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  model === m.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {/* Custom model input */}
          <Input
            value={model}
            onChange={(e) => { setModel(e.target.value); setDirty(true); }}
            placeholder="Or enter custom model ID..."
            className="h-7 text-[11px] font-mono"
          />
        </div>

        {/* Max tokens */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Max Tokens</span>
            <span className="text-xs font-mono">{maxTokens}</span>
          </div>
          <input
            type="range"
            min={1024}
            max={16384}
            step={1024}
            value={maxTokens}
            onChange={(e) => { setMaxTokens(parseInt(e.target.value)); setDirty(true); }}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>1K</span>
            <span>4K</span>
            <span>8K</span>
            <span>16K</span>
          </div>
        </div>

        {/* Memory toggle */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Memory</span>
          <button
            onClick={() => { setMemoryEnabled(!memoryEnabled); setDirty(true); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              memoryEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              memoryEnabled ? "translate-x-4" : "translate-x-0"
            }`} />
          </button>
        </div>
      </div>

      <Separator />
    </div>
  );
}
