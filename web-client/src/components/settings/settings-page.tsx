import { Button } from "@/components/ui/button";
import { ChatSettings } from "@/components/sidebar/chat-settings";
import { SystemPaths } from "@/components/sidebar/system-paths";
import { ApiKeys } from "@/components/sidebar/api-keys";
import { ConfigEditor } from "@/components/settings/config-editor";
import { Notifications } from "@/components/settings/notifications";
import { ArrowLeft, Settings, Key, FolderCog, FileJson, Bell } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SettingsPageProps {
  onBack: () => void;
}

const TABS = [
  { id: "chat", label: "Chat & Model", icon: Settings },
  { id: "paths", label: "System Paths", icon: FolderCog },
  { id: "keys", label: "API Keys", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "config", label: "Config File", icon: FileJson },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [configKey, setConfigKey] = useState(0);
  const onSettingsChanged = useCallback(() => setConfigKey((k) => k + 1), []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Settings className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
            <p className="text-xs text-muted-foreground">Configure your GodotForge environment</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Chat
        </Button>
      </div>

      {/* Tab bar */}
      <div className="px-6 shrink-0">
        <div className="flex gap-0.5 border-b border-border/50 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors relative whitespace-nowrap",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {activeTab === "chat" && (
            <div className="max-w-2xl">
              <ChatSettings onSaved={onSettingsChanged} />
            </div>
          )}
          {activeTab === "paths" && (
            <div className="max-w-2xl">
              <SystemPaths onSaved={onSettingsChanged} />
            </div>
          )}
          {activeTab === "keys" && (
            <div className="max-w-5xl">
              <ApiKeys onSaved={onSettingsChanged} />
            </div>
          )}
          {activeTab === "notifications" && (
            <div className="max-w-3xl">
              <Notifications onSaved={onSettingsChanged} />
            </div>
          )}
          {activeTab === "config" && (
            <div className="max-w-4xl">
              <ConfigEditor key={configKey} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
