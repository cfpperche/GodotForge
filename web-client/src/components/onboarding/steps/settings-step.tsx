import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, SkipForward, Zap, Scale, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

const PRESETS = [
  {
    id: "fast",
    icon: Zap,
    label: "Fast",
    desc: "Quick responses, lower cost",
    model: "haiku",
    effort: "low",
    temperature: 1.0,
    color: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
    iconColor: "text-yellow-400",
  },
  {
    id: "balanced",
    icon: Scale,
    label: "Balanced",
    desc: "Best for most tasks (recommended)",
    model: "sonnet",
    effort: "high",
    temperature: 1.0,
    color: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    iconColor: "text-blue-400",
    recommended: true,
  },
  {
    id: "power",
    icon: Rocket,
    label: "Power",
    desc: "Maximum capability, complex tasks",
    model: "opus",
    effort: "max",
    temperature: 1.0,
    color: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
    iconColor: "text-purple-400",
  },
];

export function SettingsStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (preset: typeof PRESETS[number]) => {
    setSelected(preset.id);
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: preset.model,
          effort: preset.effort,
          temperature: preset.temperature,
        }),
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 py-6 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-1">Choose Your Style</h2>
        <p className="text-sm text-muted-foreground">Pick a preset — you can change this anytime in settings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset)}
            className={cn(
              "flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-300",
              "hover:-translate-y-1 hover:shadow-xl",
              selected === preset.id
                ? `bg-gradient-to-br ${preset.color} border-2 shadow-lg`
                : "bg-card/30 border-border/50 hover:bg-card/60"
            )}
          >
            <preset.icon className={cn("h-8 w-8", selected === preset.id ? preset.iconColor : "text-muted-foreground")} />
            <div>
              <div className="font-semibold">{preset.label}</div>
              <div className="text-[11px] text-muted-foreground">{preset.desc}</div>
            </div>
            {preset.recommended && (
              <span className="text-[11px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Recommended</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="gap-1" onClick={onSkip}>
          <SkipForward className="h-3 w-3" /> Skip (use defaults)
        </Button>
        <Button className="flex-1 gap-2" onClick={onNext} disabled={!selected || saving}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
