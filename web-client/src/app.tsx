import { ChatPanel } from "@/components/chat/chat-panel";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useHealth } from "@/hooks/use-health";
import { cn } from "@/lib/utils";
import { Zap, PanelRightClose, PanelRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

export default function App() {
  const { connected } = useHealth();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="ambient-bg" />

      {/* Toaster */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "bg-card border-border text-foreground",
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg glow-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight">GodotForge</span>
            <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">v0.2</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-1 px-2.5 py-1 rounded-full bg-muted/30">
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors",
              connected ? "bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" : "bg-red-500"
            )} />
            {connected ? "Connected" : "Disconnected"}
          </div>

          <div className={cn("sm:hidden h-2.5 w-2.5 rounded-full", connected ? "bg-green-500" : "bg-red-500")} />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted/50 transition-all"
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

        {sidebarOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className={cn(
              "border-l border-border/50 bg-card/60 backdrop-blur-xl overflow-y-auto z-50 transition-all",
              "md:relative md:w-96",
              "fixed right-0 top-0 bottom-0 w-[85vw] sm:w-96"
            )}>
              <Sidebar />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
