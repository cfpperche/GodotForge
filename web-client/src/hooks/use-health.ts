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
        const data = await api.connections();
        setConnections(data);
      } catch { /* keep previous state */ }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return { health, connected, connections };
}
