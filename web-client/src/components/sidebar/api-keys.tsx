import { useState } from "react";
import { useKeys } from "@/hooks/use-keys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceDef {
  key: string;
  label: string;
  url: string;
  desc: string;
  noKey?: boolean;
  planned?: boolean;
}

const CATEGORIES: { id: string; label: string; services: ServiceDef[] }[] = [
  {
    id: "llm", label: "LLM",
    services: [
      { key: "anthropic", label: "Anthropic", url: "https://console.anthropic.com/settings/keys", desc: "Claude API — powers chat and tool execution" },
    ],
  },
  {
    id: "assets", label: "Assets",
    services: [
      { key: "sketchfab", label: "Sketchfab", url: "https://sketchfab.com/settings/password", desc: "Downloadable 3D models (GLTF)" },
      { key: "polyhaven", label: "Poly Haven", url: "https://polyhaven.com", desc: "Free textures, HDRIs, 3D models", noKey: true },
      { key: "opengameart", label: "OpenGameArt", url: "https://opengameart.org", desc: "Free sprites, sounds, music, 3D", noKey: true },
    ],
  },
  {
    id: "3d", label: "3D Generation",
    services: [
      { key: "meshy", label: "Meshy", url: "https://www.meshy.ai", desc: "AI 3D model generation from text/image", planned: true },
      { key: "tripo", label: "Tripo", url: "https://www.tripo3d.ai", desc: "AI 3D model generation", planned: true },
      { key: "rodin", label: "Rodin (Hyper3D)", url: "https://hyperhuman.deemos.com", desc: "AI 3D model generation with high detail", planned: true },
    ],
  },
  {
    id: "image", label: "Image",
    services: [
      { key: "stability", label: "Stability AI", url: "https://platform.stability.ai/account/keys", desc: "Stable Diffusion — texture and image generation", planned: true },
      { key: "openai", label: "OpenAI", url: "https://platform.openai.com/api-keys", desc: "DALL-E — image generation from text", planned: true },
    ],
  },
  {
    id: "audio", label: "Audio",
    services: [
      { key: "elevenlabs", label: "ElevenLabs", url: "https://elevenlabs.io", desc: "AI voice and speech synthesis", planned: true },
      { key: "suno", label: "Suno", url: "https://suno.com", desc: "AI music generation", planned: true },
    ],
  },
  {
    id: "other", label: "Other",
    services: [
      { key: "blockade_labs", label: "Blockade Labs", url: "https://www.blockadelabs.com", desc: "AI skybox and environment generation", planned: true },
      { key: "huggingface", label: "Hugging Face", url: "https://huggingface.co/settings/tokens", desc: "ML model inference hub", planned: true },
    ],
  },
];

export function ApiKeys({ onSaved }: { onSaved?: () => void } = {}) {
  const { keys, setKey, removeKey } = useKeys();
  const [activeTab, setActiveTab] = useState("llm");

  const activeCategory = CATEGORIES.find((c) => c.id === activeTab)!;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/20">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200",
              activeTab === cat.id
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {cat.label}
            <span className="ml-1.5 text-[11px] text-muted-foreground">{cat.services.length}</span>
          </button>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeCategory.services.map((svc) => (
          <KeyRow
            key={svc.key}
            service={svc}
            status={keys[svc.key]}
            onSave={(key) => setKey(svc.key, key).then(() => onSaved?.())}
            onRemove={() => removeKey(svc.key).then(() => onSaved?.())}
          />
        ))}
      </div>
    </div>
  );
}

function KeyRow({
  service,
  status,
  onSave,
  onRemove,
}: {
  service: ServiceDef;
  status?: { configured: boolean; source: string };
  onSave: (key: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      setValue("");
      setEditing(false);
    }
  };

  const configured = status?.configured;
  const source = status?.source;

  return (
    <div className={cn(
      "group/card rounded-lg border p-3.5 space-y-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
      configured
        ? "border-green-500/20 bg-green-500/5 hover:border-green-500/30 hover:shadow-green-500/5"
        : service.noKey
          ? "border-blue-400/20 bg-blue-400/5 hover:border-blue-400/30 hover:shadow-blue-400/5"
          : "border-border/30 bg-muted/10 hover:border-primary/20 hover:shadow-primary/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium group-hover/card:text-foreground transition-colors">{service.label}</span>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          {service.planned && (
            <Badge variant="outline" className="text-[11px] text-amber-400 border-amber-400/30">Phase D</Badge>
          )}
          {service.noKey ? (
            <Badge variant="secondary" className="text-[11px] text-blue-400">Free</Badge>
          ) : configured ? (
            <Badge variant="secondary" className="text-[11px] text-green-400">
              {source === "env" ? "ENV" : "Saved"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px] text-muted-foreground">Not set</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">{service.desc}</p>

      {/* Key input */}
      {!service.noKey && (
        <>
          {editing ? (
            <div className="flex gap-1">
              <Input
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Paste API key..."
                className="h-7 text-xs focus:ring-2 focus:ring-primary/30 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 transition-all duration-200 hover:text-green-400" onClick={handleSave}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 transition-all duration-200" onClick={() => { setEditing(false); setValue(""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px] transition-all duration-200 hover:text-primary"
                onClick={() => setEditing(true)}
              >
                {configured ? "Change" : "Set key"}
              </Button>
              {configured && source === "config" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] text-destructive/70 hover:text-destructive transition-all duration-200"
                  onClick={onRemove}
                >
                  Remove
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
