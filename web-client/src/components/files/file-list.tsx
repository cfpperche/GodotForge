import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { FileEntry } from "@/types/api";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  Box,
  File,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".bmp"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".flac", ".aac"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".avi", ".mov"]);
const MODEL_EXTS = new Set([".glb", ".gltf", ".fbx", ".obj", ".blend"]);
const CODE_EXTS = new Set([".gd", ".gdshader", ".tscn", ".tres", ".json", ".cfg", ".ts", ".tsx", ".js", ".py", ".md", ".txt", ".uid", ".import", ".godot", ".csv", ".log"]);

interface FileCardProps {
  entry: FileEntry;
  parentPath: string;
  onClick: () => void;
  onDoubleClick: () => void;
  selected: boolean;
}

function FileCard({ entry, parentPath, onClick, onDoubleClick, selected }: FileCardProps) {
  const ext = entry.extension.startsWith(".") ? entry.extension.toLowerCase() : `.${entry.extension.toLowerCase()}`;
  const fullPath = parentPath === "" ? entry.name : `${parentPath}/${entry.name}`;
  const isImage = IMAGE_EXTS.has(ext);

  const iconNode = (() => {
    if (entry.isDir) return <Folder className="h-8 w-8 text-primary/70" />;
    if (AUDIO_EXTS.has(ext)) return <FileAudio className="h-8 w-8 text-green-400" />;
    if (VIDEO_EXTS.has(ext)) return <FileVideo className="h-8 w-8 text-purple-400" />;
    if (MODEL_EXTS.has(ext)) return <Box className="h-8 w-8 text-orange-400" />;
    if (CODE_EXTS.has(ext)) return <FileCode className="h-8 w-8 text-yellow-400" />;
    if (IMAGE_EXTS.has(ext)) return null; // replaced by thumbnail
    return <File className="h-8 w-8 text-muted-foreground" />;
  })();

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors text-left group",
        selected
          ? "border-primary/50 bg-primary/10"
          : "border-border/40 bg-card/50 hover:border-border hover:bg-card/80"
      )}
    >
      {/* Thumbnail or icon */}
      <div className="w-full aspect-square max-h-16 flex items-center justify-center rounded overflow-hidden bg-muted/30">
        {isImage ? (
          <img
            src={api.getFileUrl(fullPath)}
            alt={entry.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                const icon = document.createElement("div");
                icon.className = "flex items-center justify-center w-full h-full";
                icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>`;
                parent.appendChild(icon);
              }
            }}
          />
        ) : (
          iconNode
        )}
        {entry.isDir && (
          <FolderOpen className="h-8 w-8 text-primary/70 hidden group-hover:block absolute" />
        )}
      </div>

      {/* Name */}
      <span className="text-[11px] text-foreground/80 truncate w-full text-center leading-tight">
        {entry.name}
      </span>

      {/* Size */}
      {!entry.isDir && (
        <span className="text-[10px] text-muted-foreground/60">
          {formatSize(entry.size)}
        </span>
      )}
    </button>
  );
}

interface FileListRowProps {
  entry: FileEntry;
  parentPath: string;
  onClick: () => void;
  onDoubleClick: () => void;
  selected: boolean;
}

function FileListRow({ entry, parentPath, onClick, onDoubleClick, selected }: FileListRowProps) {
  const ext = entry.extension.startsWith(".") ? entry.extension.toLowerCase() : `.${entry.extension.toLowerCase()}`;
  const fullPath = parentPath === "" ? entry.name : `${parentPath}/${entry.name}`;
  const isImage = IMAGE_EXTS.has(ext);

  const IconComp = (() => {
    if (entry.isDir) return Folder;
    if (AUDIO_EXTS.has(ext)) return FileAudio;
    if (VIDEO_EXTS.has(ext)) return FileVideo;
    if (MODEL_EXTS.has(ext)) return Box;
    if (CODE_EXTS.has(ext)) return FileCode;
    if (IMAGE_EXTS.has(ext)) return FileImage;
    return File;
  })();

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors",
        selected
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted/40 text-foreground"
      )}
    >
      {isImage ? (
        <img
          src={api.getFileUrl(fullPath)}
          alt={entry.name}
          className="h-5 w-5 rounded object-cover shrink-0"
        />
      ) : (
        <IconComp className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 text-sm truncate">{entry.name}</span>
      <span className="text-xs text-muted-foreground shrink-0">
        {entry.isDir ? "Folder" : entry.extension || "file"}
      </span>
      <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
        {entry.isDir ? "—" : formatSize(entry.size)}
      </span>
      <span className="text-xs text-muted-foreground shrink-0 w-28 text-right hidden lg:block">
        {entry.modified ? new Date(entry.modified).toLocaleDateString() : "—"}
      </span>
    </button>
  );
}

interface FileListProps {
  entries: FileEntry[];
  currentPath: string;
  selectedFile: { entry: FileEntry; parentPath: string } | null;
  viewMode: "grid" | "list";
  onNavigate: (path: string) => void;
  onSelectFile: (entry: FileEntry, parentPath?: string) => void;
}

export function FileList({
  entries,
  currentPath,
  selectedFile,
  viewMode,
  onNavigate,
  onSelectFile,
}: FileListProps) {
  const sorted = [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Empty directory
      </div>
    );
  }

  const handleClick = (entry: FileEntry) => {
    if (entry.isDir) {
      onNavigate(currentPath === "" ? entry.name : `${currentPath}/${entry.name}`);
    } else {
      onSelectFile(entry);
    }
  };

  const handleDoubleClick = (entry: FileEntry) => {
    if (entry.isDir) {
      onNavigate(currentPath === "" ? entry.name : `${currentPath}/${entry.name}`);
    }
  };

  if (viewMode === "list") {
    return (
      <div className="p-2 space-y-0.5">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground/60 uppercase tracking-wide">
          <span className="flex-1">Name</span>
          <span className="shrink-0">Type</span>
          <span className="shrink-0 w-16 text-right">Size</span>
          <span className="shrink-0 w-28 text-right hidden lg:block">Modified</span>
        </div>
        {sorted.map((entry) => (
          <FileListRow
            key={entry.name}
            entry={entry}
            parentPath={currentPath}
            selected={selectedFile?.entry.name === entry.name}
            onClick={() => handleClick(entry)}
            onDoubleClick={() => handleDoubleClick(entry)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {sorted.map((entry) => (
        <FileCard
          key={entry.name}
          entry={entry}
          parentPath={currentPath}
          selected={selectedFile?.entry.name === entry.name}
          onClick={() => handleClick(entry)}
          onDoubleClick={() => handleDoubleClick(entry)}
        />
      ))}
    </div>
  );
}
