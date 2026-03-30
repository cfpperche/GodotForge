import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FileEntry } from "@/types/api";
import { Box, File } from "lucide-react";
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
const CODE_EXTS = new Set([".gd", ".gdshader", ".tscn", ".tres", ".json", ".cfg", ".ts", ".tsx", ".js", ".py", ".txt", ".rst", ".yaml", ".yml", ".toml", ".ini"]);
const MARKDOWN_EXTS = new Set([".md", ".mdx"]);

interface TextPreviewProps {
  url: string;
}

function TextPreview({ url }: TextPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setContent(null);
    setError(false);
    fetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setError(true));
  }, [url]);

  if (error) return <p className="text-destructive text-sm p-4">Failed to load file content.</p>;
  if (content === null) return <p className="text-muted-foreground text-sm p-4 animate-pulse">Loading...</p>;

  return (
    <pre className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap break-words p-4 overflow-auto h-full">
      {content}
    </pre>
  );
}

interface MarkdownPreviewProps {
  url: string;
}

function MarkdownPreview({ url }: MarkdownPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setContent(null);
    setError(false);
    fetch(url)
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
}

export function FilePreview({ entry, parentPath }: FilePreviewProps) {
  const fullPath = parentPath === "" ? entry.name : `${parentPath}/${entry.name}`;
  const url = api.getFileUrl(fullPath);
  const ext = entry.extension.toLowerCase();

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
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
          <Box className="h-12 w-12 text-orange-400/60" />
          <p className="text-sm font-medium">3D Preview</p>
          <p className="text-xs text-muted-foreground/60">{entry.name}</p>
          <a
            href={url}
            download={entry.name}
            className="text-xs text-primary hover:underline mt-1"
          >
            Download file
          </a>
        </div>
      );
    }

    if (MARKDOWN_EXTS.has(ext)) {
      return <MarkdownPreview url={url} />;
    }

    if (CODE_EXTS.has(ext)) {
      return <TextPreview url={url} />;
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
      </div>
    </div>
  );
}
