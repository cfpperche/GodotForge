import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gamepad2, ChevronDown, Check, FolderOpen, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface ProjectSwitcherProps {
  projectName: string;
  projectRoot: string;
  recentProjects: string[];
  onSwitch: () => Promise<void>;
}

export function ProjectSwitcher({ projectName, projectRoot, recentProjects, onSwitch }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "open" | "new">("list");
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pickerTargetRef = useRef<"path" | "parentDir">("path");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const handleDirPick = (target: "path" | "parentDir") => {
    pickerTargetRef.current = target;
    dirRef.current?.click();
  };

  const handleDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dir = file.webkitRelativePath?.split("/")[0] || file.name;
    e.target.value = "";
    if (pickerTargetRef.current === "path") setPath(dir);
    else setParentDir(dir);
  };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("list");
        setError("");
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const switchTo = async (projectPath: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_root: projectPath }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setOpen(false);
      setMode("list");
      await onSwitch();
    } catch { setError("Connection error"); }
    setLoading(false);
  };

  const createProject = async () => {
    if (!name.trim() || !parentDir.trim()) return;
    const fullPath = `${parentDir.trim().replace(/\/$/, "")}/${name.trim().replace(/\s+/g, "-").toLowerCase()}`;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_root: fullPath, create: true, project_name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setOpen(false);
      setMode("list");
      setName("");
      setParentDir("");
      await onSwitch();
    } catch { setError("Connection error"); }
    setLoading(false);
  };

  // Filter out current project from recents
  const otherRecents = recentProjects.filter((p) => p !== projectRoot);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
      >
        <Gamepad2 className="h-3 w-3 text-green-400" />
        <span className="truncate max-w-[200px]">{projectName}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden z-50">
          {mode === "list" && (
            <>
              {/* Current project */}
              <div className="px-3 py-2 border-b border-border/30">
                <div className="flex items-center gap-2 text-xs">
                  <Check className="h-3 w-3 text-green-400" />
                  <span className="font-medium truncate">{projectName}</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate ml-5">{projectRoot}</div>
              </div>

              {/* Recent projects */}
              {otherRecents.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[11px] text-muted-foreground uppercase tracking-wider">Recent</div>
                  {otherRecents.map((p) => {
                    const pName = p.split("/").pop() || p;
                    return (
                      <button
                        key={p}
                        onClick={() => switchTo(p)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left"
                        disabled={loading}
                      >
                        <Gamepad2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate">{pName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">{p}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-border/30 py-1">
                <button
                  onClick={() => setMode("open")}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
                >
                  <FolderOpen className="h-3 w-3" /> Open Project
                </button>
                <button
                  onClick={() => setMode("new")}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
                >
                  <Plus className="h-3 w-3" /> New Project
                </button>
              </div>
            </>
          )}

          {mode === "open" && (
            <div className="p-3 space-y-2">
              <div className="text-xs font-medium">Open Existing Project</div>
              <div className="flex gap-1">
                <Input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/path/to/game-project"
                  className="h-8 text-xs font-mono flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && switchTo(path)}
                />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => handleDirPick("path")} title="Browse">
                  <FolderOpen className="h-3 w-3" />
                </Button>
              </div>
              {error && <p className="text-[11px] text-destructive">{error}</p>}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setMode("list"); setError(""); }}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs flex-1" onClick={() => switchTo(path)} disabled={loading || !path.trim()}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Open"}
                </Button>
              </div>
            </div>
          )}

          {mode === "new" && (
            <div className="p-3 space-y-2">
              <div className="text-xs font-medium">Create New Project</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Game"
                className="h-8 text-xs"
                autoFocus
              />
              <div className="flex gap-1">
                <Input
                  value={parentDir}
                  onChange={(e) => setParentDir(e.target.value)}
                  placeholder="Parent directory"
                  className="h-8 text-xs font-mono flex-1"
                />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => handleDirPick("parentDir")} title="Browse">
                  <FolderOpen className="h-3 w-3" />
                </Button>
              </div>
              {name && parentDir && (
                <div className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded truncate">
                  {parentDir.replace(/\/$/, "")}/{name.replace(/\s+/g, "-").toLowerCase()}
                </div>
              )}
              {error && <p className="text-[11px] text-destructive">{error}</p>}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setMode("list"); setError(""); }}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs flex-1" onClick={createProject} disabled={loading || !name.trim() || !parentDir.trim()}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
