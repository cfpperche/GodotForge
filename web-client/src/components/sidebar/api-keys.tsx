import { useState } from "react";
import { useKeys } from "@/hooks/use-keys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, X, ExternalLink } from "lucide-react";

const SERVICES = [
  { key: "anthropic", label: "Anthropic", url: "https://console.anthropic.com/settings/keys" },
  { key: "sketchfab", label: "Sketchfab", url: "https://sketchfab.com/settings/password" },
  { key: "stability", label: "Stability AI", url: "https://platform.stability.ai/account/keys" },
  { key: "openai", label: "OpenAI", url: "https://platform.openai.com/api-keys" },
  { key: "elevenlabs", label: "ElevenLabs", url: "https://elevenlabs.io" },
  { key: "meshy", label: "Meshy", url: "https://www.meshy.ai" },
  { key: "huggingface", label: "Hugging Face", url: "https://huggingface.co/settings/tokens" },
] as const;

export function ApiKeys() {
  const { keys, setKey, removeKey } = useKeys();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        API Keys
      </h3>

      <div className="space-y-2">
        {SERVICES.map((svc) => (
          <KeyRow
            key={svc.key}
            label={svc.label}
            url={svc.url}
            status={keys[svc.key]}
            onSave={(key) => setKey(svc.key, key)}
            onRemove={() => removeKey(svc.key)}
          />
        ))}
      </div>

      <Separator />
    </div>
  );
}

function KeyRow({
  label,
  url,
  status,
  onSave,
  onRemove,
}: {
  label: string;
  url: string;
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
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{label}</span>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-accent" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {configured ? (
            <Badge variant="secondary" className="text-[10px] text-green-400">
              {source === "env" ? "ENV" : "Config"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Not set
            </Badge>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex gap-1">
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste key..."
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
            <Save className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px]"
            onClick={() => setEditing(true)}
          >
            {configured ? "Change" : "Set key"}
          </Button>
          {configured && source === "config" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] text-destructive"
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
