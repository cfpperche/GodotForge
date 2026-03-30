import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Check, Loader2, Trash2, Plus, Globe, ExternalLink, Pencil } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface WebhookInfo {
  name: string;
  events: string[];
  format: string;
}

const EVENT_OPTIONS = [
  { id: "guardrail.blocked", label: "Guardrail blocks", description: "When a dangerous tool is blocked" },
  { id: "guardrail.*", label: "Confirmations", description: "Approval requests for destructive tools" },
  { id: "error", label: "Errors", description: "Internal errors and failures" },
  { id: "tool_call.*", label: "Tool calls", description: "Every tool execution (high volume)" },
  { id: "session.*", label: "Sessions", description: "Session start and end" },
  { id: "chat.*", label: "Chat messages", description: "User and assistant messages" },
];

const QUICK_PRESETS = [
  { label: "Security only", events: ["guardrail.blocked", "guardrail.*", "error"] },
  { label: "Everything", events: ["*"] },
];

export function Notifications({ onSaved }: { onSaved?: () => void }) {
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Telegram setup state
  const [showTelegram, setShowTelegram] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramEvents, setTelegramEvents] = useState<string[]>(["guardrail.blocked", "error"]);
  const [telegramStatus, setTelegramStatus] = useState<"idle" | "loading" | "waiting" | "done" | "error">("idle");
  const [telegramBotUrl, setTelegramBotUrl] = useState("");
  const [telegramError, setTelegramError] = useState("");

  // Custom webhook state
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customEvents, setCustomEvents] = useState<string[]>(["guardrail.blocked", "error"]);

  const editWebhook = useCallback(async (name: string) => {
    // Fetch full config to get the webhook details (events list)
    try {
      const res = await fetch(`${BASE_URL}/config`);
      const config = await res.json() as Record<string, unknown>;
      const whs = (config.webhooks || []) as Array<Record<string, unknown>>;
      const wh = whs.find((w) => w.name === name);
      if (!wh) return;

      if (wh.format === "telegram") {
        setTelegramToken((wh.url as string) || "");
        setTelegramEvents((wh.events as string[]) || ["guardrail.blocked", "error"]);
        setShowTelegram(true);
      } else {
        setCustomName((wh.name as string) || "");
        setCustomUrl((wh.url as string) || "");
        setCustomEvents((wh.events as string[]) || ["guardrail.blocked", "error"]);
        setShowCustom(true);
      }
    } catch { /* ignore */ }
  }, []);

  const [testingName, setTestingName] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ name: string; success: boolean } | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/webhooks`);
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const setupTelegram = async () => {
    if (!telegramToken.trim()) return;
    setTelegramStatus("loading");
    setTelegramError("");

    try {
      const res = await fetch(`${BASE_URL}/webhooks/telegram/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: telegramToken.trim(), events: telegramEvents }),
      });
      const data = await res.json() as Record<string, unknown>;

      if (data.status === "ok") {
        setTelegramStatus("done");
        setShowTelegram(false);
        setTelegramToken("");
        await fetchWebhooks();
        onSaved?.();
      } else if (data.status === "waiting" && data.bot_url) {
        setTelegramStatus("waiting");
        setTelegramBotUrl(data.bot_url as string);
      } else {
        setTelegramStatus("error");
        setTelegramError((data.error as string) || "Setup failed");
      }
    } catch {
      setTelegramStatus("error");
      setTelegramError("Connection error");
    }
  };

  const saveCustomWebhook = async () => {
    if (!customName.trim() || !customUrl.trim()) return;

    try {
      // Read current config, add webhook, save
      const configRes = await fetch(`${BASE_URL}/config`);
      const config = await configRes.json() as Record<string, unknown>;
      const existing = ((config.webhooks || []) as Record<string, unknown>[]).filter(
        (w) => w.name !== customName.trim()
      );
      existing.push({
        name: customName.trim(),
        url: customUrl.trim(),
        events: customEvents,
        format: "custom",
      });

      await fetch(`${BASE_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, webhooks: existing }),
      });

      setShowCustom(false);
      setCustomName("");
      setCustomUrl("");
      await fetchWebhooks();
      onSaved?.();
    } catch { /* ignore */ }
  };

  const removeWebhook = async (name: string) => {
    try {
      const configRes = await fetch(`${BASE_URL}/config`);
      const config = await configRes.json() as Record<string, unknown>;
      const filtered = ((config.webhooks || []) as Record<string, unknown>[]).filter(
        (w) => w.name !== name
      );
      await fetch(`${BASE_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, webhooks: filtered }),
      });
      await fetchWebhooks();
      onSaved?.();
    } catch { /* ignore */ }
  };

  const testWebhook = async (name: string) => {
    setTestingName(name);
    setTestResult(null);
    try {
      const res = await fetch(`${BASE_URL}/webhooks/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json() as Record<string, unknown>;
      setTestResult({ name, success: !!data.success });
    } catch {
      setTestResult({ name, success: false });
    }
    setTestingName(null);
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Active webhooks */}
      {webhooks.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Webhooks</div>
          {webhooks.map((wh) => (
            <div key={wh.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{wh.name}</span>
                  <Badge variant="secondary" className="text-[11px]">{wh.format}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {wh.events.map((e) => (
                    <Badge key={e} variant="outline" className="text-[11px] font-mono">{e}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => editWebhook(wh.name)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => testWebhook(wh.name)}
                  disabled={testingName === wh.name}
                >
                  {testingName === wh.name ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : testResult?.name === wh.name ? (
                    testResult.success ? <Check className="h-3 w-3 text-green-400" /> : <span className="text-destructive">Failed</span>
                  ) : (
                    <><Send className="h-3 w-3" /> Test</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 text-destructive/70 hover:text-destructive"
                  onClick={() => removeWebhook(wh.name)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {webhooks.length === 0 && !showTelegram && !showCustom && (
        <p className="text-xs text-muted-foreground">No webhooks configured. Add one to receive notifications about tool executions, guardrail blocks, and errors.</p>
      )}

      {/* Add buttons */}
      {!showTelegram && !showCustom && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowTelegram(true)}>
            <Send className="h-3 w-3" /> Add Telegram
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowCustom(true)}>
            <Globe className="h-3 w-3" /> Add Custom Webhook
          </Button>
        </div>
      )}

      {/* Telegram setup form */}
      {showTelegram && (
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Telegram Setup
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { setShowTelegram(false); setTelegramStatus("idle"); }}>
              Cancel
            </Button>
          </div>

          {telegramStatus !== "waiting" && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Bot Token (from @BotFather)</label>
                <Input
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="7123456789:AAHfiqksKZ8WmR2z..."
                  className="h-8 text-xs font-mono"
                  type="password"
                  autoFocus
                />
              </div>

              <EventSelector events={telegramEvents} onChange={setTelegramEvents} />

              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 w-full"
                onClick={setupTelegram}
                disabled={telegramStatus === "loading" || !telegramToken.trim()}
              >
                {telegramStatus === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Connect Telegram
              </Button>
            </>
          )}

          {telegramStatus === "waiting" && (
            <div className="space-y-3 text-center py-2">
              <p className="text-xs">Send <code className="bg-muted px-1 py-0.5 rounded">/start</code> to your bot, then click Verify:</p>
              <a
                href={telegramBotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Open {telegramBotUrl.split("/").pop()} in Telegram
              </a>
              <Button size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={setupTelegram}>
                <Check className="h-3 w-3" /> Verify Connection
              </Button>
            </div>
          )}

          {telegramStatus === "done" && (
            <p className="text-xs text-green-400 flex items-center gap-1"><Check className="h-3 w-3" /> Connected!</p>
          )}

          {telegramError && (
            <p className="text-[11px] text-destructive">{telegramError}</p>
          )}
        </div>
      )}

      {/* Custom webhook form */}
      {showCustom && (
        <div className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" /> Custom Webhook
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setShowCustom(false)}>
              Cancel
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Name</label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="My Server"
              className="h-8 text-xs"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">URL</label>
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://my-server.com/webhook"
              className="h-8 text-xs font-mono"
            />
          </div>

          <EventSelector events={customEvents} onChange={setCustomEvents} />

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 w-full"
            onClick={saveCustomWebhook}
            disabled={!customName.trim() || !customUrl.trim()}
          >
            <Plus className="h-3 w-3" /> Add Webhook
          </Button>
        </div>
      )}
    </div>
  );
}

function EventSelector({ events, onChange }: { events: string[]; onChange: (e: string[]) => void }) {
  const toggle = (id: string) => {
    if (events.includes(id)) {
      onChange(events.filter((e) => e !== id));
    } else {
      // Remove "*" wildcard when selecting specific events
      onChange([...events.filter((e) => e !== "*"), id]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-medium text-muted-foreground">Events to notify</label>

      {/* Quick presets */}
      <div className="flex gap-1.5">
        {QUICK_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            size="sm"
            variant={JSON.stringify(events.sort()) === JSON.stringify(preset.events.sort()) ? "default" : "outline"}
            className="h-6 text-[11px]"
            onClick={() => onChange(preset.events)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Individual event checkboxes */}
      <div className="grid grid-cols-2 gap-1.5">
        {EVENT_OPTIONS.map((opt) => {
          const checked = events.includes(opt.id) || events.includes("*");
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`flex items-start gap-2 p-2 rounded-lg text-left text-[11px] transition-colors ${
                checked
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : "bg-muted/20 border border-border/30 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <div className={`mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                checked ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`}>
                {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              <div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-muted-foreground text-[10px]">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Show selected events */}
      <p className="text-[11px] text-muted-foreground">
        Selected: {events.includes("*") ? "All events" : events.join(", ") || "None"}
      </p>
    </div>
  );
}
