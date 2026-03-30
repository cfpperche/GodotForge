import { ConfigManager } from "./config.js";

export interface WebhookConfig {
  name: string;
  url: string;
  events: string[];  // "tool_call.*", "guardrail.blocked", "error", "*"
  format: "telegram" | "custom";
  headers?: Record<string, string>;
  chat_id?: string;  // Telegram only
}

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];
const TIMEOUT_MS = 5000;

export class WebhookDispatcher {
  private config: ConfigManager;
  private queue: Array<{ webhook: WebhookConfig; payload: WebhookPayload }> = [];
  private processing = false;

  constructor(config: ConfigManager) {
    this.config = config;
  }

  notify(event: string, data: Record<string, unknown>): void {
    const webhooks = this.getWebhooks();
    for (const wh of webhooks) {
      if (this.matchesEvent(wh.events, event)) {
        this.queue.push({ webhook: wh, payload: { event, data } });
      }
    }
    if (!this.processing) this.processQueue();
  }

  getWebhooks(): WebhookConfig[] {
    try {
      const full = this.config.getFullConfig();
      return (full.webhooks as WebhookConfig[]) || [];
    } catch {
      return [];
    }
  }

  async sendTest(webhookName: string): Promise<{ success: boolean; error?: string }> {
    const webhooks = this.getWebhooks();
    const wh = webhooks.find((w) => w.name === webhookName);
    if (!wh) return { success: false, error: `Webhook not found: ${webhookName}` };

    return this.send(wh, {
      event: "test",
      data: { message: "GodotForge webhook test", timestamp: new Date().toISOString() },
    });
  }

  private matchesEvent(patterns: string[], event: string): boolean {
    for (const p of patterns) {
      if (p === "*") return true;
      if (p === event) return true;
      if (p.endsWith(".*") && event.startsWith(p.slice(0, -1))) return true;
    }
    return false;
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      await this.send(item.webhook, item.payload);
    }
    this.processing = false;
  }

  private async send(wh: WebhookConfig, payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const body = this.formatPayload(wh, payload);
        const url = wh.format === "telegram"
          ? `https://api.telegram.org/bot${wh.url}/sendMessage`
          : wh.url;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(wh.headers || {}),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) return { success: true };

        const errText = await res.text().catch(() => "");
        console.error(`[Webhook] ${wh.name} HTTP ${res.status}: ${errText.slice(0, 200)}`);
      } catch (err) {
        console.error(`[Webhook] ${wh.name} attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }

    return { success: false, error: `Failed after ${MAX_RETRIES} attempts` };
  }

  private formatPayload(wh: WebhookConfig, payload: WebhookPayload): Record<string, unknown> {
    if (wh.format === "telegram") {
      return {
        chat_id: wh.chat_id,
        text: this.formatTelegram(payload),
        parse_mode: "HTML",
      };
    }

    // Custom — raw JSON
    return {
      source: "godotforge",
      timestamp: new Date().toISOString(),
      ...payload,
    };
  }

  private formatTelegram(payload: WebhookPayload): string {
    const { event, data } = payload;
    const emoji = this.eventEmoji(event);
    let text = `${emoji} <b>${event}</b>\n`;

    if (data.tool) text += `🔧 Tool: <code>${data.tool}</code>\n`;
    if (data.message) text += `💬 ${String(data.message).slice(0, 500)}\n`;
    if (data.reason) text += `⚠️ ${data.reason}\n`;
    if (data.success === false) text += `❌ Error: ${data.error || "unknown"}\n`;
    if (data.duration_ms) text += `⏱ ${data.duration_ms}ms\n`;

    return text.trim();
  }

  private eventEmoji(event: string): string {
    if (event.startsWith("guardrail")) return "🛡️";
    if (event.startsWith("error")) return "🔴";
    if (event.startsWith("tool_call")) return "🔧";
    if (event.startsWith("session")) return "📋";
    if (event.startsWith("chat")) return "💬";
    return "📌";
  }
}
