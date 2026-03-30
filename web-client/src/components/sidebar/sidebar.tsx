import { ProjectSelector } from "./project-selector";
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

      <ProjectSelector />
      <ConnectionStatus />
      <ChatSettings />
      <SystemPaths />
      <ApiKeys />

      {/* Stats footer */}
      <div className="pt-2 space-y-2">
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            { n: "32", l: "Godot", color: "from-blue-500/20 to-blue-500/5" },
            { n: "39", l: "Blender", color: "from-orange-500/20 to-orange-500/5" },
            { n: "4", l: "Pipeline", color: "from-green-500/20 to-green-500/5" },
            { n: "10", l: "Other", color: "from-purple-500/20 to-purple-500/5" },
          ].map(({ n, l, color }) => (
            <div key={l} className={`rounded-lg bg-gradient-to-br ${color} p-2 border border-border/30`}>
              <div className="text-sm font-bold text-foreground">{n}</div>
              <div className="text-[11px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center pt-1 font-mono">
          GodotForge v0.2 — 85 tools
        </p>
      </div>
    </div>
  );
}
