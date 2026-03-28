import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { SettingsResponse } from "@/types/api";

export function useSettings() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateSettings = useCallback(async (partial: Record<string, unknown>) => {
    await api.setSettings(partial);
    await refresh();
  }, [refresh]);

  return { settings, updateSettings, refresh };
}
