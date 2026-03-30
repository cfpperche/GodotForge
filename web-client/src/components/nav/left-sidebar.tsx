import { cn } from "@/lib/utils";
import { useHealth } from "@/hooks/use-health";
import { MessageSquare, Settings, Zap, RefreshCw, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type View = "chat" | "settings";

interface LeftSidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
}

const NAV_ITEMS: { id: View; icon: typeof MessageSquare; label: string }[] = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const CONNECTION_LABELS: Record<string, string> = {
  mcp: "MCP Server",
  godot: "Godot Editor",
  blender: "Blender",
};

const UPDATE_ENDPOINTS: Record<string, string> = {
  godot: "/update/godot-plugin",
  blender: "/update/blender-addon",
};

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

export function LeftSidebar({ activeView, onNavigate }: LeftSidebarProps) {
  const { connections } = useHealth();
  const [updating, setUpdating] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleUpdate = async (key: string) => {
    const endpoint = UPDATE_ENDPOINTS[key];
    if (!endpoint) return;
    setUpdating(key);
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${CONNECTION_LABELS[key]} plugin updated`);
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Connection error");
    }
    setUpdating(null);
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col border-r border-border/50 bg-card/40 backdrop-blur-xl shrink-0 z-30 transition-all duration-200",
      collapsed ? "w-14" : "w-52"
    )}>
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/30 min-h-[49px]">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold whitespace-nowrap">GodotForge</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-1 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg transition-colors",
              activeView === item.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="text-sm whitespace-nowrap">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom: connections */}
      <div className="border-t border-border/30 px-2.5 py-2.5 space-y-1.5">
        {(["mcp", "godot", "blender"] as const).map((key) => (
          <div key={key} className="flex items-center gap-2.5" title={collapsed ? CONNECTION_LABELS[key] : undefined}>
            <div className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              connections[key].outdated
                ? "bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]"
                : connections[key].connected
                  ? "bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]"
                  : "bg-red-500"
            )} />
            {!collapsed && (
              <span className="text-[11px] whitespace-nowrap text-muted-foreground flex items-center gap-1">
                {CONNECTION_LABELS[key]}
                {connections[key].outdated && UPDATE_ENDPOINTS[key] && (
                  <button
                    onClick={() => handleUpdate(key)}
                    disabled={updating === key}
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                    title="Update plugin"
                  >
                    <RefreshCw className={cn("h-2.5 w-2.5", updating === key && "animate-spin")} />
                  </button>
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
