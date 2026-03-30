/**
 * Confirmation manager — handles interactive approval for destructive tools.
 * Supports two channels: Web UI (POST /chat/confirm) and Telegram (inline keyboard).
 * First response wins (race pattern).
 */

import { WebhookDispatcher } from "./webhooks.js";

export interface ConfirmationRequest {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  risk: string;
  timestamp: number;
}

interface PendingConfirmation {
  request: ConfirmationRequest;
  resolve: (confirmed: boolean) => void;
  telegramMsgId?: number;
  timeout: ReturnType<typeof setTimeout>;
}

const CONFIRMATION_TIMEOUT_MS = 120_000; // 2 minutes

export class ConfirmationManager {
  private pending = new Map<string, PendingConfirmation>();
  private webhooks: WebhookDispatcher | null = null;
  private sseCallback: ((event: Record<string, unknown>) => void) | null = null;

  setWebhooks(wh: WebhookDispatcher): void {
    this.webhooks = wh;
  }

  /** Set SSE callback for current streaming session */
  setSSECallback(cb: ((event: Record<string, unknown>) => void) | null): void {
    this.sseCallback = cb;
  }

  /**
   * Request confirmation for a destructive tool.
   * Sends to both Web UI (SSE) and Telegram (inline keyboard).
   * Returns true if approved, false if denied or timed out.
   */
  async requestConfirmation(tool: string, args: Record<string, unknown>, risk: string): Promise<boolean> {
    const id = `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const request: ConfirmationRequest = {
      id,
      tool,
      args: this.sanitizeArgs(args),
      risk,
      timestamp: Date.now(),
    };

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve(false); // Timeout = deny
      }, CONFIRMATION_TIMEOUT_MS);

      this.pending.set(id, { request, resolve, timeout });

      // Send to Web UI via SSE
      if (this.sseCallback) {
        this.sseCallback({
          type: "confirm",
          id,
          tool,
          args: request.args,
          risk,
        });
      }

      // Send to Telegram via inline keyboard
      this.sendTelegramConfirmation(id, request);
    });
  }

  /** Resolve a pending confirmation (from Web UI or Telegram) */
  resolve(id: string, confirmed: boolean): boolean {
    const pending = this.pending.get(id);
    if (!pending) return false;

    clearTimeout(pending.timeout);
    this.pending.delete(id);
    pending.resolve(confirmed);
    return true;
  }

  /** Check if there are any pending confirmations */
  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /** Process Telegram callback_query updates */
  async pollTelegramCallbacks(): Promise<void> {
    if (!this.webhooks || this.pending.size === 0) return;

    const webhooks = this.webhooks.getWebhooks();
    const telegram = webhooks.find((w) => w.format === "telegram");
    if (!telegram) return;

    try {
      const res = await fetch(`https://api.telegram.org/bot${telegram.url}/getUpdates?timeout=1&allowed_updates=["callback_query"]`);
      const data = await res.json() as Record<string, unknown>;
      const results = (data.result || []) as Array<Record<string, unknown>>;

      for (const update of results) {
        const callbackQuery = update.callback_query as Record<string, unknown> | undefined;
        if (!callbackQuery?.data) continue;

        const cbData = callbackQuery.data as string;
        // Format: "confirm:ID:yes" or "confirm:ID:no"
        const match = cbData.match(/^confirm:(.+):(yes|no)$/);
        if (!match) continue;

        const [, confirmId, action] = match;
        const resolved = this.resolve(confirmId, action === "yes");

        // Answer the callback to remove loading state
        const callbackId = callbackQuery.id as string;
        await fetch(`https://api.telegram.org/bot${telegram.url}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackId,
            text: resolved ? (action === "yes" ? "Approved" : "Denied") : "Expired",
          }),
        });

        // Acknowledge the update
        const updateId = update.update_id as number;
        await fetch(`https://api.telegram.org/bot${telegram.url}/getUpdates?offset=${updateId + 1}`);
      }
    } catch {
      // Non-critical — polling failure
    }
  }

  private async sendTelegramConfirmation(id: string, request: ConfirmationRequest): Promise<void> {
    if (!this.webhooks) return;

    const webhooks = this.webhooks.getWebhooks();
    const telegram = webhooks.find((w) => w.format === "telegram");
    if (!telegram) return;

    const argsPreview = Object.entries(request.args)
      .map(([k, v]) => `  ${k}: ${String(v).slice(0, 100)}`)
      .join("\n");

    try {
      await fetch(`https://api.telegram.org/bot${telegram.url}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegram.chat_id,
          text: `🛡️ <b>Confirmation Required</b>\n\nTool: <code>${request.tool}</code>\nRisk: ${request.risk}\n\n<pre>${argsPreview}</pre>\n\nApprove this action?`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve", callback_data: `confirm:${id}:yes` },
              { text: "❌ Deny", callback_data: `confirm:${id}:no` },
            ]],
          },
        }),
      });

      // Start polling for response
      this.pollLoop(id);
    } catch {
      // If Telegram fails, Web UI is still available
    }
  }

  private async pollLoop(id: string): Promise<void> {
    while (this.pending.has(id)) {
      await this.pollTelegramCallbacks();
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (k.toLowerCase().includes("key") || k.toLowerCase().includes("token")) {
        sanitized[k] = "***";
      } else if (typeof v === "string" && v.length > 200) {
        sanitized[k] = v.slice(0, 200) + "...";
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}
