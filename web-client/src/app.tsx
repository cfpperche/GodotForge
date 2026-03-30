import { ChatPanel } from "@/components/chat/chat-panel";
import { LeftSidebar } from "@/components/nav/left-sidebar";
import { ProjectSwitcher } from "@/components/nav/project-switcher";
import { SettingsPage } from "@/components/settings/settings-page";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useProject } from "@/hooks/use-project";
import { useOnboarding } from "@/hooks/use-onboarding";
import { cn } from "@/lib/utils";
import { Zap, Menu, X } from "lucide-react";
import { useState, createContext, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

type View = "chat" | "settings";

export const ProjectContext = createContext<{
  isValid: boolean;
  refresh: () => Promise<void>;
  openSettings: () => void;
}>({ isValid: false, refresh: async () => {}, openSettings: () => {} });

export default function App() {
  const { project, isValid, refresh: refreshProject, recentProjects } = useProject();
  const { completed: onboardingDone } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(!onboardingDone);
  const [activeView, setActiveView] = useState<View>("chat");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOnboardingComplete = useCallback(async () => {
    await refreshProject();
    setShowOnboarding(false);
  }, [refreshProject]);

  // Derive project name from path
  const projectName = project?.project_root?.split("/").pop() || "";

  // Show onboarding wizard
  if (showOnboarding) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ className: "bg-card border-border text-foreground" }} />
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </>
    );
  }

  return (
    <ProjectContext.Provider value={{ isValid, refresh: refreshProject, openSettings: () => setActiveView("settings") }}>
      <div className="flex h-screen overflow-hidden">
        <div className="ambient-bg" />
        <Toaster position="top-right" toastOptions={{ className: "bg-card border-border text-foreground" }} />

        {/* Left sidebar — desktop only */}
        <LeftSidebar
          activeView={activeView}
          onNavigate={(v) => { setActiveView(v); setMobileMenuOpen(false); }}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="relative z-20 flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/60 backdrop-blur-xl shrink-0">
            {/* Mobile hamburger */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              {/* Logo (mobile only — desktop has it in sidebar) */}
              <div className="flex md:hidden items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">GodotForge</span>
              </div>

              {/* Project switcher dropdown */}
              {projectName && (
                <ProjectSwitcher
                  projectName={projectName}
                  projectRoot={project?.project_root || ""}
                  recentProjects={recentProjects}
                  onSwitch={refreshProject}
                />
              )}
            </div>

          </header>

          {/* Mobile navigation drawer */}
          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
              <div className="fixed left-0 top-0 bottom-0 w-64 bg-card/95 backdrop-blur-xl border-r border-border z-50 p-4 space-y-2 md:hidden">
                <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-semibold">GodotForge</span>
                </div>
                <button
                  onClick={() => { setActiveView("chat"); setMobileMenuOpen(false); }}
                  className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm", activeView === "chat" ? "bg-primary/15 text-primary" : "text-muted-foreground")}
                >
                  Chat
                </button>
                <button
                  onClick={() => { setActiveView("settings"); setMobileMenuOpen(false); }}
                  className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm", activeView === "settings" ? "bg-primary/15 text-primary" : "text-muted-foreground")}
                >
                  Settings
                </button>
              </div>
            </>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            {activeView === "chat" && <ChatPanel />}
            {activeView === "settings" && <SettingsPage onBack={() => setActiveView("chat")} />}
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}
