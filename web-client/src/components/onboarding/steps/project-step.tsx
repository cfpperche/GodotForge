import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, Loader2, Check, Gamepad2, ArrowRight } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

export function ProjectStep({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState<"choose" | "open" | "new">("choose");
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [projectPath, setProjectPath] = useState("");
  const [error, setError] = useState("");

  const handleOpen = async () => {
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
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setProjectPath(path.trim());
      setDone(true);
    } catch { setError("Connection error"); }
    setLoading(false);
  };

  const handleCreate = async () => {
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
      setProjectPath(fullPath);
      setDone(true);
    } catch { setError("Connection error"); }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center text-center gap-6 py-8">
        <div className="h-16 w-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Project Ready</h2>
          <p className="text-sm font-mono text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg">{projectPath}</p>
        </div>
        <Button size="lg" className="gap-2" onClick={onNext}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div>
          <h2 className="text-xl font-semibold text-center mb-1">Choose Your Project</h2>
          <p className="text-sm text-muted-foreground text-center">Open an existing Godot project or start fresh</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <button
            onClick={() => setMode("open")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:border-primary/30 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group"
          >
            <FolderOpen className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-semibold">Open Existing</span>
            <span className="text-xs text-muted-foreground">Select a Godot project folder</span>
          </button>
          <button
            onClick={() => setMode("new")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:border-primary/30 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group"
          >
            <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-semibold">Create New</span>
            <span className="text-xs text-muted-foreground">Start a new Godot 4.6 project</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-6 max-w-md mx-auto w-full">
      <div>
        <h2 className="text-xl font-semibold mb-1">{mode === "open" ? "Open Existing Project" : "Create New Project"}</h2>
        <p className="text-sm text-muted-foreground">
          {mode === "open" ? "Enter the path to your Godot project" : "Choose a name and location"}
        </p>
      </div>

      {mode === "open" ? (
        <div className="space-y-3">
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/home/user/my-game"
            className="font-mono"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleOpen()}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Game"
            autoFocus
          />
          <Input
            value={parentDir}
            onChange={(e) => setParentDir(e.target.value)}
            placeholder="Parent directory (e.g. /home/user/games)"
            className="font-mono"
          />
          {name && parentDir && (
            <div className="text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-1.5 rounded flex items-center gap-1.5">
              <Gamepad2 className="h-3 w-3" />
              {parentDir.replace(/\/$/, "")}/{name.replace(/\s+/g, "-").toLowerCase()}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setMode("choose")}>Back</Button>
        <Button
          className="flex-1 gap-2"
          onClick={mode === "open" ? handleOpen : handleCreate}
          disabled={loading || (mode === "open" ? !path.trim() : !name.trim() || !parentDir.trim())}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "open" ? "Open" : "Create"} Project
        </Button>
      </div>
    </div>
  );
}
