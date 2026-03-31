import { useEffect, useState } from "react";
import { api, authFetch } from "@/lib/api";
import type { FileEntry } from "@/types/api";
import { Box, File, Trash2, Download } from "lucide-react";
import { CodeEditor } from "./previews/code-editor";
import "@google/model-viewer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".bmp", ".ico"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".flac", ".aac"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".avi", ".mov"]);
const MODEL_EXTS = new Set([".glb", ".gltf", ".fbx", ".obj", ".blend"]);
const CODE_EXTS = new Set([".gd", ".gdshader", ".tscn", ".tres", ".json", ".cfg", ".ts", ".tsx", ".js", ".py", ".txt", ".rst", ".yaml", ".yml", ".toml", ".ini", ".uid", ".import", ".godot", ".csv", ".log"]);
const MARKDOWN_EXTS = new Set([".md", ".mdx"]);


interface MarkdownPreviewProps {
  url: string;
}

function MarkdownPreview({ url }: MarkdownPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setContent(null);
    setError(false);
    authFetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setError(true));
  }, [url]);

  if (error) return <p className="text-destructive text-sm p-4">Failed to load file content.</p>;
  if (content === null) return <p className="text-muted-foreground text-sm p-4 animate-pulse">Loading...</p>;

  return (
    <div className="prose prose-sm prose-invert max-w-none p-4 overflow-auto h-full text-foreground/80">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

interface FilePreviewProps {
  entry: FileEntry;
  parentPath: string;
  onDelete?: () => void;
}

export function FilePreview({ entry, parentPath, onDelete }: FilePreviewProps) {
  const fullPath = parentPath === "" ? entry.name : `${parentPath}/${entry.name}`;
  const url = api.getFileUrl(fullPath);
  const ext = entry.extension.startsWith(".") ? entry.extension.toLowerCase() : `.${entry.extension.toLowerCase()}`;

  const renderPreview = () => {
    if (IMAGE_EXTS.has(ext)) {
      return (
        <div className="flex items-center justify-center h-full p-4 bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#111_0%_50%)] bg-[size:20px_20px]">
          <img
            src={url}
            alt={entry.name}
            className="max-w-full max-h-full object-contain rounded shadow-lg"
          />
        </div>
      );
    }

    if (AUDIO_EXTS.has(ext)) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <svg className="h-7 w-7 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <audio controls src={url} className="w-full max-w-sm" />
        </div>
      );
    }

    if (VIDEO_EXTS.has(ext)) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <video controls src={url} className="max-w-full max-h-full rounded shadow-lg" />
        </div>
      );
    }

    if (MODEL_EXTS.has(ext)) {
      if (ext === ".glb" || ext === ".gltf") {
        return (
          <div className="h-full w-full p-2">
            <model-viewer
              src={url}
              auto-rotate
              camera-controls
              shadow-intensity="0.5"
              loading="lazy"
              style={{ width: "100%", height: "100%", minHeight: 300, background: "transparent" }}
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
          <Box className="h-12 w-12 text-orange-400/60" />
          <p className="text-sm font-medium">{entry.name}</p>
          <p className="text-xs text-muted-foreground/60">Preview not available for {ext} files</p>
          <a href={url} download={entry.name} className="text-xs text-primary hover:underline mt-1">Download file</a>
        </div>
      );
    }

    if (MARKDOWN_EXTS.has(ext)) {
      return <MarkdownPreview url={url} />;
    }

    if (CODE_EXTS.has(ext)) {
      return <CodeEditor url={url} filePath={fullPath} extension={ext} />;
    }

    // Unknown type — metadata only
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-4">
        <File className="h-12 w-12 text-muted-foreground/40" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground/60">{entry.name}</p>
          <p className="text-xs">{entry.extension || "Unknown type"}</p>
        </div>
        <a
          href={url}
          download={entry.name}
          className="text-xs text-primary hover:underline"
        >
          Download file
        </a>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview area */}
      <div className="flex-1 overflow-hidden min-h-0">
        {renderPreview()}
      </div>

      {/* Metadata bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-t border-border/40 bg-card/30 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70 truncate max-w-[200px]">{entry.name}</span>
        <span className="text-border/60">·</span>
        <span>{formatSize(entry.size)}</span>
        {entry.modified && (
          <>
            <span className="text-border/60">·</span>
            <span>{new Date(entry.modified).toLocaleString()}</span>
          </>
        )}
        {entry.extension && (
          <>
            <span className="text-border/60">·</span>
            <span className="uppercase tracking-wide">{entry.extension.replace(".", "")}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <a href={url} download={entry.name} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Download">
            <Download className="h-3.5 w-3.5" />
          </a>
          {onDelete && (
            <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Delete file">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
