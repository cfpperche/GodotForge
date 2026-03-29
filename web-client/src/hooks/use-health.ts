import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

interface ConnectionEntry {
  connected: boolean;
  port: number;
  outdated?: boolean;
}

interface Connections {
  mcp: ConnectionEntry;
  godot: ConnectionEntry;
  blender: ConnectionEntry;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connected, setConnected] = useState(false);
  const [connections, setConnections] = useState<Connections>({
    mcp: { connected: false, port: 6980 },
    godot: { connected: false, port: 6970 },
    blender: { connected: false, port: 8400 },
  });

  useEffect(() => {
    const check = async () => {
      try {
        const data = await api.health();
        setHealth(data);
        setConnected(true);
      } catch {
        setHealth(null);
        setConnected(false);
      }

      try {
        const res = await fetch(`${BASE_URL}/connections`);
        const data = await res.json();
        setConnections(data);
      } catch { /* keep previous state */ }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return { health, connected, connections };
}
