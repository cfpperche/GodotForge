import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderOpen, Check, Gamepad2 } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface ProjectStatus {
  project_root: string;
  has_godot_project: boolean;
}

export function ProjectSelector() {
  const [project, setProject] = useState<ProjectStatus | null>(null);
  const [newPath, setNewPath] = useState("");
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/project`);
      const data = await res.json();
      setProject(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSwitch = async () => {
    if (!newPath.trim()) return;
    setSwitching(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_root: newPath.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to switch");
      } else {
        setNewPath("");
        await refresh();
      }
    } catch (e) {
      setError("Connection error");
    }
    setSwitching(false);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Gamepad2 className="h-3 w-3" />
        Active Project
      </h3>

      {project && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-foreground/80 bg-muted/30 px-2 py-1.5 rounded break-all">
            {project.project_root}
          </div>
          <div className="flex items-center gap-1.5">
            {project.has_godot_project ? (
              <Badge variant="secondary" className="text-[9px] text-green-400 gap-1">
                <Gamepad2 className="h-2.5 w-2.5" /> Godot project
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] text-muted-foreground">
                No project.godot
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-1">
        <Input
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          placeholder="/path/to/game-project"
          className="h-7 text-[10px] font-mono flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSwitch()}
        />
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 shrink-0"
          onClick={handleSwitch}
          disabled={switching || !newPath.trim()}
          title="Switch project"
        >
          {switching ? <FolderOpen className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
      </div>

      {error && (
        <p className="text-[10px] text-destructive">{error}</p>
      )}

      <p className="text-[9px] text-muted-foreground/50">
        Memory, sessions, and rules will load from this project
      </p>

      <Separator />
    </div>
  );
}
