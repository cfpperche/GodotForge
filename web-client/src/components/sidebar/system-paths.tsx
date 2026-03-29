import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderOpen, Check, Save } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface PathStatus {
  value: string;
  source: "config" | "env" | "auto";
}

const PATH_DEFS = [
  { key: "godot_executable", label: "Godot Executable", placeholder: "C:\\Tools\\Godot\\Godot_v4.6.1-stable_win64.exe" },
  { key: "blender_executable", label: "Blender Executable", placeholder: "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" },
  { key: "windows_temp", label: "Windows Temp Directory", placeholder: "C:\\Users\\you\\AppData\\Local\\Temp" },
];

export function SystemPaths() {
  const [paths, setPaths] = useState<Record<string, PathStatus>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/paths`);
      const data = await res.json();
      setPaths(data.paths || {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSave = async (key: string) => {
    const value = edits[key]?.trim();
    if (!value) return;

    setSaving(key);
    try {
      await fetch(`${BASE_URL}/paths`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setEdits((prev) => ({ ...prev, [key]: "" }));
      await refresh();
    } catch { /* ignore */ }
    setSaving(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <FolderOpen className="h-3 w-3" />
        System Paths
      </h3>

      <div className="space-y-3">
        {PATH_DEFS.map((def) => {
          const status = paths[def.key];
          const currentValue = status?.value || "";
          const source = status?.source || "auto";
          const editing = edits[def.key] !== undefined && edits[def.key] !== "";

          return (
            <div key={def.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{def.label}</span>
                <Badge
                  variant={source === "config" ? "secondary" : "outline"}
                  className={`text-[9px] ${source === "config" ? "text-green-400" : source === "env" ? "text-blue-400" : "text-muted-foreground"}`}
                >
                  {source === "config" ? "Configured" : source === "env" ? "ENV" : currentValue ? "Auto" : "Not set"}
                </Badge>
              </div>

              {currentValue && !editing && (
                <div className="text-[10px] font-mono text-foreground/70 bg-muted/30 px-2 py-1 rounded truncate">
                  {currentValue}
                </div>
              )}

              <div className="flex gap-1">
                <Input
                  value={edits[def.key] || ""}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [def.key]: e.target.value }))}
                  placeholder={def.placeholder}
                  className="h-6 text-[10px] font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleSave(def.key)}
                />
                {editing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleSave(def.key)}
                    disabled={saving === def.key}
                  >
                    {saving === def.key ? <Check className="h-3 w-3 text-green-500" /> : <Save className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Separator />
    </div>
  );
}
