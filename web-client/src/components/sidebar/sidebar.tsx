import { ConnectionStatus } from "./connection-status";
import { ChatSettings } from "./chat-settings";
import { SystemPaths } from "./system-paths";
import { ApiKeys } from "./api-keys";
import { Zap } from "lucide-react";

export function Sidebar() {
  return (
    <div className="h-full p-4 space-y-4 overflow-y-auto">
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-2 pb-2 border-b border-border">
        <Zap className="h-4 w-4 text-primary" />
        <span className="font-semibold">Settings</span>
      </div>

      <ConnectionStatus />
      <ChatSettings />
      <SystemPaths />
      <ApiKeys />

      {/* Stats footer */}
      <div className="pt-2 space-y-1">
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { n: "32", l: "Godot" },
            { n: "39", l: "Blender" },
            { n: "4", l: "Pipeline" },
            { n: "10", l: "Other" },
          ].map(({ n, l }) => (
            <div key={l} className="rounded-lg bg-muted/50 p-1.5">
              <div className="text-sm font-bold text-primary">{n}</div>
              <div className="text-[9px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          GodotForge v0.2.0 — 85 tools
        </p>
      </div>
    </div>
  );
}
