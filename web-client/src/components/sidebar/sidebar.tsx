import { ConnectionStatus } from "./connection-status";
import { ApiKeys } from "./api-keys";
import { useSettings } from "@/hooks/use-settings";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Zap } from "lucide-react";

export function Sidebar() {
  const { settings } = useSettings();

  return (
    <div className="h-full p-4 space-y-4 overflow-y-auto">
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-2 pb-2 border-b border-border">
        <Zap className="h-4 w-4 text-primary" />
        <span className="font-semibold">Settings</span>
      </div>

      <ConnectionStatus />

      {settings && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="h-3 w-3" />
            Chat Settings
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Auth</span>
              <Badge variant="secondary" className="text-[10px]">
                {settings.auth_mode === "claude_cli" ? "Claude CLI" : "API Key"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Model</span>
              <span className="text-[10px] font-mono truncate max-w-[140px] text-foreground">{settings.model}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Max Tokens</span>
              <span className="text-xs">{settings.max_tokens}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Memory</span>
              <Badge variant={settings.memory_enabled ? "default" : "outline"} className="text-[10px]">
                {settings.memory_enabled ? "Enabled" : "Off"}
              </Badge>
            </div>
          </div>
          <Separator />
        </div>
      )}

      <ApiKeys />

      {/* Stats footer */}
      <div className="pt-2 space-y-1">
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { n: "32", l: "Godot" },
            { n: "39", l: "Blender" },
            { n: "4", l: "Pipeline" },
            { n: "8", l: "Assets" },
          ].map(({ n, l }) => (
            <div key={l} className="rounded-lg bg-muted/50 p-1.5">
              <div className="text-sm font-bold text-primary">{n}</div>
              <div className="text-[9px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          GodotForge v0.2.0 — 83 tools
        </p>
      </div>
    </div>
  );
}
