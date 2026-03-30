import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChatSettings } from "@/components/sidebar/chat-settings";
import { SystemPaths } from "@/components/sidebar/system-paths";
import { ApiKeys } from "@/components/sidebar/api-keys";
import { ConfigEditor } from "@/components/settings/config-editor";
import { Notifications } from "@/components/settings/notifications";
import { ArrowLeft, Settings, Key, FolderCog, FileJson, Bell } from "lucide-react";
import { useState, useCallback } from "react";

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [configKey, setConfigKey] = useState(0);
  const onSettingsChanged = useCallback(() => setConfigKey((k) => k + 1), []);

  return (
    <div className="h-full overflow-y-auto scroll-smooth">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center glow-primary">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">Configure your GodotForge environment</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Chat
          </Button>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <SettingsCard title="Chat & Model" icon={<Settings className="h-3.5 w-3.5 text-primary" />}>
              <ChatSettings onSaved={onSettingsChanged} />
            </SettingsCard>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <SettingsCard title="System Paths" icon={<FolderCog className="h-3.5 w-3.5 text-primary" />}>
              <SystemPaths onSaved={onSettingsChanged} />
            </SettingsCard>
          </div>
        </div>

        {/* API Keys & Services — full width with tabs */}
        <SettingsCard title="API Keys & Services" icon={<Key className="h-3.5 w-3.5 text-primary" />}>
          <ApiKeys onSaved={onSettingsChanged} />
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard title="Notifications" icon={<Bell className="h-3.5 w-3.5 text-primary" />}>
          <Notifications onSaved={onSettingsChanged} />
        </SettingsCard>

        {/* Config file editor */}
        <SettingsCard title="Config File" icon={<FileJson className="h-3.5 w-3.5 text-primary" />}>
          <ConfigEditor key={configKey} />
        </SettingsCard>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            GodotForge v0.2 — 85 tools — ~/.godotforge/config.json
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 space-y-4 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      <Separator className="opacity-20" />
      {children}
    </div>
  );
}
