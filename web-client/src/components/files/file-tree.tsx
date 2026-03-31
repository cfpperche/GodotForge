import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FileEntry } from "@/types/api";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileText,
  Box,
  File,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

function fileIcon(entry: FileEntry) {
  if (entry.isDir) return null; // handled inline
  const ext = entry.extension.startsWith(".") ? entry.extension.toLowerCase() : `.${entry.extension.toLowerCase()}`;
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".bmp", ".ico"].includes(ext))
    return <FileImage className="h-3.5 w-3.5 shrink-0 text-blue-400" />;
  if ([".mp3", ".wav", ".ogg", ".flac", ".aac"].includes(ext))
    return <FileAudio className="h-3.5 w-3.5 shrink-0 text-green-400" />;
  if ([".mp4", ".webm", ".avi", ".mov"].includes(ext))
    return <FileVideo className="h-3.5 w-3.5 shrink-0 text-purple-400" />;
  if ([".glb", ".gltf", ".fbx", ".obj", ".blend"].includes(ext))
    return <Box className="h-3.5 w-3.5 shrink-0 text-orange-400" />;
  if ([".gd", ".gdshader", ".tscn", ".tres", ".json", ".cfg", ".ts", ".tsx", ".js", ".py"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-yellow-400" />;
  if ([".md", ".txt", ".rst"].includes(ext))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

interface TreeNodeProps {
  name: string;
  path: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  onSelectFile: (entry: FileEntry, parentPath: string) => void;
  depth: number;
  refreshKey: number;
}

function TreeNode({ name, path, currentPath, onNavigate, onSelectFile, depth, refreshKey }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = currentPath === path;

  // Re-fetch children when refreshKey changes (polling detected changes)
  useEffect(() => {
    if (expanded && loaded) {
      api.listFiles(path).then(setChildren).catch(() => {});
    }
  }, [refreshKey, expanded, loaded, path]);

  const toggle = useCallback(async () => {
    if (!expanded && !loaded) {
      setLoading(true);
      try {
        const result = await api.listFiles(path);
        setChildren(result);
        setLoaded(true);
      } catch {
        setChildren([]);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    }
    setExpanded((prev) => !prev);
    onNavigate(path);
  }, [expanded, loaded, path, onNavigate]);

  return (
    <div>
      <button
        onClick={toggle}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={cn(
          "flex items-center gap-1.5 w-full py-1 pr-2 text-[13px] rounded transition-colors text-left",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        )}
      >
        {loading ? (
          <ChevronRight className="h-3 w-3 shrink-0 animate-pulse" />
        ) : expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        {expanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/80" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{name}</span>
      </button>

      {expanded && loaded && (
        <div>
          {children.map((child) =>
            child.isDir ? (
              <TreeNode
                key={child.name}
                name={child.name}
                path={path === "" ? child.name : `${path}/${child.name}`}
                currentPath={currentPath}
                onNavigate={onNavigate}
                onSelectFile={onSelectFile}
                depth={depth + 1}
                refreshKey={refreshKey}
              />
            ) : (
              <button
                key={child.name}
                style={{ paddingLeft: `${(depth + 1) * 12 + 8 + 12}px` }}
                onClick={() => onSelectFile(child, path)}
                className="flex items-center gap-1.5 w-full py-1 pr-2 text-[13px] rounded transition-colors text-left text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                {fileIcon(child)}
                <span className="truncate">{child.name}</span>
              </button>
            )
          )}
          {children.length === 0 && (
            <p style={{ paddingLeft: `${(depth + 1) * 12 + 8 + 12}px` }} className="py-1 text-[12px] text-muted-foreground/50 italic">
              Empty
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onSelectFile: (entry: FileEntry, parentPath: string) => void;
  refreshKey: number;
}

export function FileTree({ currentPath, onNavigate, onSelectFile, refreshKey }: FileTreeProps) {
  const [roots, setRoots] = useState<FileEntry[]>([]);

  useEffect(() => {
    api.listFiles("").then(setRoots).catch(() => setRoots([]));
  }, [refreshKey]);

  return (
    <div className="py-2 space-y-0.5">
      {/* Root level — "res://" shortcut */}
      <button
        onClick={() => onNavigate("")}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1 text-[13px] rounded transition-colors",
          currentPath === ""
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        )}
      >
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">res://</span>
      </button>

      {roots
        .filter((e) => e.isDir)
        .map((entry) => (
          <TreeNode
            key={entry.name}
            name={entry.name}
            path={entry.name}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onSelectFile={onSelectFile}
            depth={0}
            refreshKey={refreshKey}
          />
        ))}
    </div>
  );
}
