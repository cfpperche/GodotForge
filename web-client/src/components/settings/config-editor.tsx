import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Save, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

export function ConfigEditor() {
  const [value, setValue] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/config`);
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      setValue(json);
      setOriginal(json);
    } catch {
      setError("Failed to load config");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
      } else {
        const json = JSON.stringify(data.config, null, 2);
        setValue(json);
        setOriginal(json);
        toast.success("Config saved");
      }
    } catch {
      setError("Connection error");
    }
    setSaving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const dirty = value !== original;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading config...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(""); }}
        className="w-full min-h-[250px] bg-muted/20 border border-border/30 rounded-lg p-4 font-mono text-xs text-foreground leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
        spellCheck={false}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" className="gap-1.5 transition-all duration-300 hover:-translate-y-0.5" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 transition-all duration-300" onClick={load} disabled={!dirty}>
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5 transition-all duration-300" onClick={handleCopy}>
          <Copy className="h-3 w-3" /> Copy
        </Button>
        {dirty && (
          <span className="text-[10px] text-amber-400 ml-auto animate-pulse">Unsaved changes</span>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground font-mono">~/.godotforge/config.json</p>
    </div>
  );
}
