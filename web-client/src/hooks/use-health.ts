import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connected, setConnected] = useState(false);

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
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return { health, connected };
}
