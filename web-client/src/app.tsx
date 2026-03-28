import { ChatPanel } from "@/components/chat/chat-panel";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useHealth } from "@/hooks/use-health";
import { cn } from "@/lib/utils";
import { Zap, PanelRightClose, PanelRight, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function App() {
  const { connected } = useHealth();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close sidebar on mobile when resizing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-base">GodotForge</span>
            <span className="text-[10px] text-muted-foreground ml-1.5">v0.2.0</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
            <div className={cn("h-2 w-2 rounded-full transition-colors", connected ? "bg-green-500" : "bg-red-500")} />
            {connected ? "MCP Connected" : "Disconnected"}
          </div>

          {/* Mobile: just show dot */}
          <div className={cn("sm:hidden h-2.5 w-2.5 rounded-full", connected ? "bg-green-500" : "bg-red-500")} />

          <a href="https://github.com/godotforge/godotforge" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar (Ctrl+B)"
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <ChatPanel />
        </main>

        {/* Sidebar — responsive */}
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className={cn(
              "border-l border-border bg-card/50 overflow-y-auto z-50",
              "md:relative md:w-72",
              "fixed right-0 top-0 bottom-0 w-80 md:w-72"
            )}>
              <Sidebar />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
