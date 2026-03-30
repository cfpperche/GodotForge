import { useSettings } from "@/hooks/use-settings";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Settings, Check, Brain, Zap, Thermometer, Wrench, Shield } from "lucide-react";
import { useState, useEffect } from "react";

const MODELS = [
  { id: "opus", label: "Opus", desc: "Most capable" },
  { id: "sonnet", label: "Sonnet", desc: "Balanced (default)" },
  { id: "haiku", label: "Haiku", desc: "Fastest" },
];

const EFFORT_LEVELS = [
  { id: "low" as const, label: "Low", desc: "Fast, efficient", color: "text-yellow-400" },
  { id: "medium" as const, label: "Medium", desc: "Balanced", color: "text-blue-400" },
  { id: "high" as const, label: "High", desc: "Thorough (default)", color: "text-green-400" },
  { id: "max" as const, label: "Max", desc: "Opus 4.6 only", color: "text-purple-400" },
];

export function ChatSettings({ onSaved }: { onSaved?: () => void } = {}) {
  const { settings, updateSettings } = useSettings();
  const [model, setModel] = useState("");
  const [maxTokens, setMaxTokens] = useState(4096);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [temperature, setTemperature] = useState(1.0);
  const [effort, setEffort] = useState<"low" | "medium" | "high" | "max">("high");
  const [thinking, setThinking] = useState<"disabled" | "adaptive">("disabled");
  const [toolChoice, setToolChoice] = useState<"auto" | "any" | "none">("auto");
  const [guardrailMode, setGuardrailMode] = useState<"yolo" | "normal" | "strict">("normal");
  const [systemPromptExtra, setSystemPromptExtra] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (settings) {
      setModel(settings.model);
      setMaxTokens(settings.max_tokens);
      setMemoryEnabled(settings.memory_enabled);
      setTemperature(settings.temperature ?? 1.0);
      setEffort(settings.effort ?? "high");
      setThinking(settings.thinking ?? "disabled");
      setToolChoice(settings.tool_choice ?? "auto");
      setGuardrailMode(settings.guardrail_mode ?? "normal");
      setSystemPromptExtra(settings.system_prompt_extra ?? "");
    }
  }, [settings]);

  if (!settings) return null;

  const handleSave = async () => {
    await updateSettings({
      model, max_tokens: maxTokens, memory_enabled: memoryEnabled,
      temperature, effort, thinking, tool_choice: toolChoice, guardrail_mode: guardrailMode,
      system_prompt_extra: systemPromptExtra,
    });
    setDirty(false);
    onSaved?.();
  };

  const markDirty = () => setDirty(true);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="h-3 w-3" />
          Chat Settings
        </h3>
        {dirty && (
          <Button size="sm" variant="default" className="h-6 text-[11px] gap-1" onClick={handleSave}>
            <Check className="h-3 w-3" /> Save
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Auth mode */}
        <Row label="Auth">
          <Badge variant="secondary" className="text-[11px]">
            {settings.auth_mode === "agent_sdk" ? "Agent SDK" : settings.auth_mode === "claude_cli" ? "Claude CLI" : "API Key"}
          </Badge>
        </Row>

        {/* Model */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Model</span>
          <div className="grid grid-cols-3 gap-1.5">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setModel(m.id); markDirty(); }}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  model === m.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-[11px] text-muted-foreground">{m.desc}</div>
              </button>
            ))}
          </div>
          <Input
            value={model}
            onChange={(e) => { setModel(e.target.value); markDirty(); }}
            placeholder="Custom model ID..."
            className="h-7 text-xs font-mono"
          />
        </div>

        {/* Effort */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" /> Effort
          </span>
          <div className="grid grid-cols-4 gap-1">
            {EFFORT_LEVELS.map((e) => (
              <button
                key={e.id}
                onClick={() => { setEffort(e.id); markDirty(); }}
                className={`px-1.5 py-1 rounded text-[11px] text-center transition-colors ${
                  effort === e.id
                    ? "bg-primary/20 border border-primary/30 " + e.color
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guardrail Mode */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" /> Guardrails
          </span>
          <div className="grid grid-cols-3 gap-1">
            {([
              { id: "yolo" as const, label: "Yolo", desc: "No confirmations" },
              { id: "normal" as const, label: "Normal", desc: "Destructive only" },
              { id: "strict" as const, label: "Strict", desc: "All actions" },
            ]).map((g) => (
              <button
                key={g.id}
                onClick={() => { setGuardrailMode(g.id); markDirty(); }}
                title={g.desc}
                className={`px-1.5 py-1 rounded text-[11px] text-center transition-colors ${
                  guardrailMode === g.id
                    ? g.id === "yolo" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : g.id === "strict" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Thermometer className="h-3 w-3" /> Temperature
            </span>
            <span className="text-[11px] font-mono">{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(e) => { setTemperature(parseFloat(e.target.value)); markDirty(); }}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Max tokens */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Max Tokens</span>
            <span className="text-[11px] font-mono">{maxTokens}</span>
          </div>
          <input
            type="range"
            min={1024}
            max={16384}
            step={1024}
            value={maxTokens}
            onChange={(e) => { setMaxTokens(parseInt(e.target.value)); markDirty(); }}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        {/* Memory */}
        <Row label="Memory">
          <Toggle value={memoryEnabled} onChange={(v) => { setMemoryEnabled(v); markDirty(); }} />
        </Row>

        {/* Thinking */}
        <Row label={<span className="flex items-center gap-1"><Brain className="h-3 w-3" /> Thinking</span>}>
          <div className="flex gap-1">
            {(["disabled", "adaptive"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setThinking(t); markDirty(); }}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  thinking === t
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-transparent"
                }`}
              >
                {t === "adaptive" ? "Adaptive" : "Off"}
              </button>
            ))}
          </div>
        </Row>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          {showAdvanced ? "▼" : "▶"} Advanced
        </button>

        {showAdvanced && (
          <div className="space-y-3 pl-2 border-l border-border">
            {/* Tool choice */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Tool Choice
              </span>
              <div className="flex gap-1">
                {(["auto", "any", "none"] as const).map((tc) => (
                  <button
                    key={tc}
                    onClick={() => { setToolChoice(tc); markDirty(); }}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      toolChoice === tc
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted/30 text-muted-foreground border border-transparent"
                    }`}
                  >
                    {tc}
                  </button>
                ))}
              </div>
            </div>

            {/* System prompt extra */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Extra System Prompt</span>
              <Textarea
                value={systemPromptExtra}
                onChange={(e) => { setSystemPromptExtra(e.target.value); markDirty(); }}
                placeholder="Additional instructions appended to system prompt..."
                className="min-h-[60px] text-[11px] resize-none"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-8 h-4.5 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${
        value ? "translate-x-3.5" : "translate-x-0"
      }`} />
    </button>
  );
}
