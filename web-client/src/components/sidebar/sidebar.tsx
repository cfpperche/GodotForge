import { ConnectionStatus } from "./connection-status";
import { ApiKeys } from "./api-keys";
import { useSettings } from "@/hooks/use-settings";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const { settings } = useSettings();

  return (
    <div className="w-72 border-l border-border bg-card/50 p-4 space-y-4 overflow-y-auto">
      <ConnectionStatus />

      {settings && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chat Settings
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auth</span>
              <Badge variant="secondary" className="text-[10px]">
                {settings.auth_mode === "claude_cli" ? "Claude CLI" : "API Key"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <span className="text-xs font-mono truncate max-w-[140px]">{settings.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Memory</span>
              <span>{settings.memory_enabled ? "On" : "Off"}</span>
            </div>
          </div>
          <Separator />
        </div>
      )}

      <ApiKeys />

      <div className="text-[10px] text-muted-foreground pt-4">
        GodotForge v0.2.0 — 83 tools
      </div>
    </div>
  );
}
