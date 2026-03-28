import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { KeyStatus } from "@/types/api";

export function useKeys() {
  const [keys, setKeys] = useState<Record<string, KeyStatus>>({});

  const refresh = useCallback(async () => {
    try {
      const data = await api.getKeys();
      setKeys(data.services);
    } catch {
      setKeys({});
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setKey = useCallback(async (service: string, key: string) => {
    await api.setKey(service, key);
    await refresh();
  }, [refresh]);

  const removeKey = useCallback(async (service: string) => {
    await api.removeKey(service);
    await refresh();
  }, [refresh]);

  return { keys, setKey, removeKey, refresh };
}
