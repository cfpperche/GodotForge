import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderOpen, FileText, Save } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface PathStatus {
  value: string;
  source: "config" | "env" | "auto";
}

const PATH_DEFS = [
  { key: "godot_executable", label: "Godot Executable", placeholder: "Select Godot executable...", picker: "file" as const, accept: ".exe,.x86_64,.app" },
  { key: "blender_executable", label: "Blender Executable", placeholder: "Select Blender executable...", picker: "file" as const, accept: ".exe,.app" },
  { key: "windows_temp", label: "Temp Directory", placeholder: "Select temp directory...", picker: "directory" as const, accept: "" },
];

export function SystemPaths({ onSaved }: { onSaved?: () => void } = {}) {
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

  const handleSave = async (key: string, value: string) => {
    if (!value.trim()) return;
    setSaving(key);
    try {
      await fetch(`${BASE_URL}/paths`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: value.trim() }),
      });
      setEdits((prev) => ({ ...prev, [key]: "" }));
      await refresh();
      onSaved?.();
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
        {PATH_DEFS.map((def) => (
          <PathField
            key={def.key}
            def={def}
            status={paths[def.key]}
            editValue={edits[def.key] || ""}
            onEditChange={(v) => setEdits((prev) => ({ ...prev, [def.key]: v }))}
            onSave={(v) => handleSave(def.key, v)}
            saving={saving === def.key}
          />
        ))}
      </div>

      <Separator />
    </div>
  );
}

function PathField({
  def,
  status,
  editValue,
  onEditChange,
  onSave,
  saving,
}: {
  def: typeof PATH_DEFS[number];
  status?: PathStatus;
  editValue: string;
  onEditChange: (v: string) => void;
  onSave: (v: string) => void;
  saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const currentValue = status?.value || "";
  const source = status?.source || "auto";

  const handlePick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // For file picker, we get the file name — but browsers don't give full paths
    // So we use webkitRelativePath for directories, and show file name for files
    // In practice, the user will need to type/paste the full path on their system
    const file = files[0];
    const name = file.name;
    onEditChange(name);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{def.label}</span>
        <Badge
          variant={source === "config" ? "secondary" : "outline"}
          className={`text-[11px] ${source === "config" ? "text-green-400" : source === "env" ? "text-blue-400" : "text-muted-foreground"}`}
        >
          {source === "config" ? "Configured" : source === "env" ? "ENV" : currentValue ? "Auto" : "Not set"}
        </Badge>
      </div>

      {/* Current value display */}
      {currentValue && (
        <div className="text-[11px] font-mono text-foreground/80 bg-muted/30 px-2 py-1.5 rounded break-all">
          {currentValue}
        </div>
      )}

      {/* Input row with browse button */}
      <div className="flex gap-1">
        <Input
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          placeholder={def.placeholder}
          className="h-7 text-[11px] font-mono flex-1"
          onKeyDown={(e) => e.key === "Enter" && onSave(editValue)}
        />

        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 shrink-0"
          onClick={handlePick}
          title={def.picker === "directory" ? "Browse folder" : "Browse file"}
        >
          {def.picker === "directory" ? (
            <FolderOpen className="h-3 w-3" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
        </Button>

        {editValue && (
          <Button
            size="icon"
            variant="default"
            className="h-7 w-7 shrink-0"
            onClick={() => onSave(editValue)}
            disabled={saving}
          >
            <Save className="h-3 w-3" />
          </Button>
        )}

        {/* Hidden file/directory input */}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={def.accept || undefined}
          {...(def.picker === "directory" ? { webkitdirectory: "", directory: "" } as Record<string, string> : {})}
          onChange={handleFileChange}
        />
      </div>

      {/* Hint for manual path entry */}
      {!currentValue && (
        <p className="text-[11px] text-muted-foreground">
          Paste the full path or use the browse button
        </p>
      )}
    </div>
  );
}
