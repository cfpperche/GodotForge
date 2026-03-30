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
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
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

      {/* Tab bar */}
      <div className="px-6 shrink-0">
        <div className="flex gap-1 border-b border-border/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors relative",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {activeTab === "chat" && <ChatSettings onSaved={onSettingsChanged} />}
          {activeTab === "paths" && <SystemPaths onSaved={onSettingsChanged} />}
          {activeTab === "keys" && <ApiKeys onSaved={onSettingsChanged} />}
          {activeTab === "notifications" && <Notifications onSaved={onSettingsChanged} />}
          {activeTab === "config" && <ConfigEditor key={configKey} />}
        </div>
      </div>
    </div>
  );
}
