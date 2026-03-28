import { ChatPanel } from "@/components/chat/chat-panel";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useHealth } from "@/hooks/use-health";
import { cn } from "@/lib/utils";
import { Zap, PanelRightClose, PanelRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function App() {
  const { connected } = useHealth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">GodotForge</span>
          <span className="text-xs text-muted-foreground">v0.2.0</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn("h-2 w-2 rounded-full", connected ? "bg-green-500" : "bg-red-500")} />
            {connected ? "Connected" : "Disconnected"}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
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

        {sidebarOpen && <Sidebar />}
      </div>
    </div>
  );
}
