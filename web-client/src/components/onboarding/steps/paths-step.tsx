import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, SkipForward, FolderOpen, FileText } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface PathStatus { value: string; source: "config" | "env" | "auto"; }

const PATHS = [
  { key: "godot_executable", label: "Godot Executable", placeholder: "/path/to/godot", type: "file" as const },
  { key: "blender_executable", label: "Blender Executable", placeholder: "/path/to/blender", type: "file" as const },
  { key: "windows_temp", label: "Temp Directory", placeholder: "C:\\Users\\you\\AppData\\Local\\Temp", type: "dir" as const },
];

export function PathsStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [paths, setPaths] = useState<Record<string, PathStatus>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const pickerKeyRef = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const handlePick = (key: string, type: "file" | "dir") => {
    pickerKeyRef.current = key;
    if (type === "file") fileRef.current?.click();
    else dirRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = pickerKeyRef.current;
    const name = file.name;
    e.target.value = "";
    if (key) setEdits(prev => ({ ...prev, [key]: name }));
  };

  const handleDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = pickerKeyRef.current;
    const dir = file.webkitRelativePath?.split("/")[0] || file.name;
    e.target.value = "";
    if (key) setEdits(prev => ({ ...prev, [key]: dir }));
  };


  useEffect(() => {
    fetch(`${BASE_URL}/paths`).then(r => r.json()).then(d => setPaths(d.paths || {})).catch(() => {});
  }, []);

  const allConfigured = PATHS.every(p => paths[p.key]?.value);

  const handleSave = async (key: string) => {
    const value = edits[key]?.trim();
    if (!value) return;
    await fetch(`${BASE_URL}/paths`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const res = await fetch(`${BASE_URL}/paths`);
    const data = await res.json();
    setPaths(data.paths || {});
    setEdits(prev => ({ ...prev, [key]: "" }));
  };

  return (
    <div className="flex flex-col gap-5 py-6 max-w-md mx-auto w-full">
      <div>
        <h2 className="text-xl font-semibold mb-1">System Paths</h2>
        <p className="text-sm text-muted-foreground">Where are Godot and Blender installed?</p>
      </div>

      <div className="space-y-4">
        {PATHS.map(p => {
          const status = paths[p.key];
          const hasValue = !!status?.value;
          return (
            <div key={p.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.label}</span>
                {hasValue && (
                  <Badge variant="secondary" className="text-[9px] text-green-400 gap-1">
                    <Check className="h-2.5 w-2.5" /> {status.source === "config" ? "Set" : "Auto"}
                  </Badge>
                )}
              </div>
              {hasValue && (
                <div className="text-[11px] font-mono text-foreground/70 bg-muted/30 px-2 py-1.5 rounded break-all">
                  {status.value}
                </div>
              )}
              {!hasValue && (
                <div className="flex gap-1">
                  <Input
                    value={edits[p.key] || ""}
                    onChange={e => setEdits(prev => ({ ...prev, [p.key]: e.target.value }))}
                    placeholder={p.placeholder}
                    className="font-mono text-xs h-8 flex-1"
                    onKeyDown={e => e.key === "Enter" && handleSave(p.key)}
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => handlePick(p.key, p.type)} title="Browse">
                    {p.type === "file" ? <FileText className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                  </Button>
                  {edits[p.key] && (
                    <Button size="sm" className="h-8" onClick={() => handleSave(p.key)}>Save</Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="gap-1" onClick={onSkip}>
          <SkipForward className="h-3 w-3" /> Skip
        </Button>
        <Button className="flex-1 gap-2" onClick={onNext}>
          {allConfigured ? "Continue" : "Continue Anyway"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden file picker (executables) */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".exe,.x86_64,.app"
        onChange={handleFileChange}
      />
      {/* Hidden directory picker */}
      <input
        ref={dirRef}
        type="file"
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={handleDirChange}
      />
    </div>
  );
}
