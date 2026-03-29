import { cn } from "@/lib/utils";
import { useHealth } from "@/hooks/use-health";
import { MessageSquare, Settings, Zap } from "lucide-react";

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

export function LeftSidebar({ activeView, onNavigate }: LeftSidebarProps) {
  const { connections } = useHealth();

  return (
    <aside className="group/sidebar hidden md:flex flex-col w-14 hover:w-56 transition-all duration-300 ease-in-out border-r border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden shrink-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border/30 min-h-[49px]">
        <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md glow-primary">
          <Zap className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
          GodotForge
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-1 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg transition-all duration-200",
              activeView === item.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom: connections */}
      <div className="border-t border-border/30 px-2.5 py-2.5 space-y-1.5">
        {(["mcp", "godot", "blender"] as const).map((key) => (
          <div key={key} className="flex items-center gap-2.5">
            <div className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              connections[key].outdated
                ? "bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]"
                : connections[key].connected
                  ? "bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]"
                  : "bg-red-500"
            )} />
            <span className="text-[10px] whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 text-muted-foreground">
              {CONNECTION_LABELS[key]}{connections[key].outdated ? " ⟳" : ""}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
