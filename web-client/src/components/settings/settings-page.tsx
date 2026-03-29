import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProjectSelector } from "@/components/sidebar/project-selector";
import { ChatSettings } from "@/components/sidebar/chat-settings";
import { SystemPaths } from "@/components/sidebar/system-paths";
import { ApiKeys } from "@/components/sidebar/api-keys";
import { ConnectionStatus } from "@/components/sidebar/connection-status";
import { ArrowLeft, Settings } from "lucide-react";

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">Configure your GodotForge environment</p>
            </div>
          </div>
          <Button variant="ghost" className="gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back to Chat
          </Button>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <SettingsCard title="Project">
              <ProjectSelector />
            </SettingsCard>

            <SettingsCard title="Chat & Model">
              <ChatSettings />
            </SettingsCard>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <SettingsCard title="System Paths">
              <SystemPaths />
            </SettingsCard>

            <SettingsCard title="API Keys">
              <ApiKeys />
            </SettingsCard>

            <SettingsCard title="Connections">
              <ConnectionStatus />
            </SettingsCard>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-muted-foreground font-mono">
            GodotForge v0.2 — 85 tools — Settings saved to ~/.godotforge/config.json
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <Separator className="opacity-30" />
      {children}
    </div>
  );
}
