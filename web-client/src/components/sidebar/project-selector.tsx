import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderOpen, Plus, Check, Gamepad2, Loader2 } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface ProjectStatus {
  project_root: string;
  has_godot_project: boolean;
}

export function ProjectSelector() {
  const [project, setProject] = useState<ProjectStatus | null>(null);
  const [mode, setMode] = useState<"idle" | "switch" | "new">("idle");
  const [inputPath, setInputPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dirRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/project`);
      setProject(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSwitch = async (path: string) => {
    if (!path.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_root: path.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
      } else {
        setInputPath("");
        setMode("idle");
        await refresh();
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  const handleNewProject = async () => {
    if (!parentDir.trim() || !projectName.trim()) return;
    const fullPath = `${parentDir.trim().replace(/\/$/, "")}/${projectName.trim().replace(/\s+/g, "-").toLowerCase()}`;

    setLoading(true);
    setError("");

    try {
      // Create project via MCP — init directory + project.godot
      const res = await fetch(`${BASE_URL}/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_root: fullPath, create: true, project_name: projectName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create project");
      } else {
        setProjectName("");
        setParentDir("");
        setMode("idle");
        await refresh();
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  const handleDirPick = () => {
    dirRef.current?.click();
  };

  const handleDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // webkitdirectory gives us the directory name from the files
      const path = files[0].webkitRelativePath?.split("/")[0] || files[0].name;
      if (mode === "switch") {
        setInputPath(path);
      } else {
        setParentDir(path);
      }
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Gamepad2 className="h-3 w-3" />
        Active Project
      </h3>

      {/* Current project display */}
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

      {/* Action buttons */}
      {mode === "idle" && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[10px] gap-1"
            onClick={() => setMode("switch")}
          >
            <FolderOpen className="h-3 w-3" /> Open Project
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[10px] gap-1"
            onClick={() => setMode("new")}
          >
            <Plus className="h-3 w-3" /> New Project
          </Button>
        </div>
      )}

      {/* Switch project form */}
      {mode === "switch" && (
        <div className="space-y-1.5 p-2 rounded-lg border border-border bg-muted/20">
          <span className="text-[10px] font-medium">Open existing project</span>
          <div className="flex gap-1">
            <Input
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="/path/to/game-project"
              className="h-7 text-[10px] font-mono flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSwitch(inputPath)}
              autoFocus
            />
            <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={handleDirPick} title="Browse">
              <FolderOpen className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-6 text-[10px] gap-1 flex-1" onClick={() => handleSwitch(inputPath)} disabled={loading || !inputPath.trim()}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Open
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setMode("idle"); setError(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* New project form */}
      {mode === "new" && (
        <div className="space-y-1.5 p-2 rounded-lg border border-primary/20 bg-primary/5">
          <span className="text-[10px] font-medium">Create new Godot project</span>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="My Awesome Game"
            className="h-7 text-[10px]"
            autoFocus
          />
          <div className="flex gap-1">
            <Input
              value={parentDir}
              onChange={(e) => setParentDir(e.target.value)}
              placeholder="Parent directory (e.g. /home/user/games)"
              className="h-7 text-[10px] font-mono flex-1"
            />
            <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={handleDirPick} title="Browse">
              <FolderOpen className="h-3 w-3" />
            </Button>
          </div>
          {projectName && parentDir && (
            <div className="text-[9px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
              {parentDir.replace(/\/$/, "")}/{projectName.replace(/\s+/g, "-").toLowerCase()}
            </div>
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-6 text-[10px] gap-1 flex-1" onClick={handleNewProject} disabled={loading || !projectName.trim() || !parentDir.trim()}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Create
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setMode("idle"); setError(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {/* Hidden dir picker */}
      <input
        ref={dirRef}
        type="file"
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={handleDirChange}
      />

      <Separator />
    </div>
  );
}
