import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { FileEntry, FileWatchEvent } from "@/types/api";

const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:6980")
  .replace(/^http/, "ws");

export type ViewMode = "grid" | "list";

export function useFiles(projectRoot: string) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(false);

  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  const loadEntries = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const result = await api.listFiles(path);
      setEntries(result);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on path change
  useEffect(() => {
    loadEntries(currentPath);
  }, [currentPath, loadEntries]);

  // WebSocket file-watch with auto-reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      try {
        ws = new WebSocket(`${WS_BASE}/files/watch`);

        ws.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data as string) as FileWatchEvent;
            const watchedPath = currentPathRef.current;
            const prefix = watchedPath === "" ? "" : watchedPath + "/";
            if (event.path === watchedPath || event.path.startsWith(prefix)) {
              loadEntries(watchedPath);
            }
          } catch { /* ignore malformed messages */ }
        };

        ws.onclose = () => {
          if (destroyed) return;
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        // WebSocket construction can throw in some environments
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [loadEntries]);

  // Reset path when project root changes
  useEffect(() => {
    setCurrentPath("");
    setSelectedFile(null);
  }, [projectRoot]);

  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  }, []);

  const selectFile = useCallback((entry: FileEntry) => {
    setSelectedFile(entry);
  }, []);

  const toggleView = useCallback(() => {
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  }, []);

  const goUp = useCallback(() => {
    if (!currentPath) return;
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    navigate(segments.join("/"));
  }, [currentPath, navigate]);

  const refresh = useCallback(() => {
    loadEntries(currentPath);
  }, [currentPath, loadEntries]);

  return {
    currentPath,
    entries,
    selectedFile,
    viewMode,
    loading,
    navigate,
    selectFile,
    toggleView,
    goUp,
    refresh,
  };
}
