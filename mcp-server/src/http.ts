import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ChatEngine } from "./chat.js";
import { ConfigManager } from "./config.js";
import { EventLog } from "./events.js";
import { WebhookDispatcher } from "./webhooks.js";
import { ConfirmationManager } from "./confirmations.js";
import { setEventLog, setWebhookDispatcher, setConfirmationManager, setGuardrailMode } from "./tool-handlers.js";
import { sendJson, writePortFile, removePortFile } from "./http/utils.js";
import { readBody, attachFileWatcher, serveProjectFile } from "./http/files.js";
import { getVersionStatus, provisionGodotPlugin, provisionBlenderAddon } from "./http/provision.js";
import {
  handleChat,
  handleChatStream,
  handleChatAgent,
  handleUpdateSettings,
  serveDashboard,
  handleConnections,
  handleWriteConfig,
  handleSwitchProject,
  handleSetPath,
  handleSetKey,
  handleRemoveKey,
  handleListFiles,
  type HandlerDeps,
} from "./http/handlers.js";

const BIND_HOST = "127.0.0.1";
const DEFAULT_PORT = 6980;
const MAX_PORT_TRIES = 10;

export class HttpServer {
  private server: ReturnType<typeof createServer> | null = null;
  private chatEngine: ChatEngine;
  private config: ConfigManager;
  private eventLog: EventLog;
  private webhooks: WebhookDispatcher;
  private confirmations: ConfirmationManager;
  private port = 0;
  private portFilePath = "";
  private projectRoot: string;
  private _cachedWinUser: { value: string | null | undefined } = { value: undefined };

  constructor(chatEngine: ChatEngine, projectRoot: string, config?: ConfigManager) {
    this.chatEngine = chatEngine;
    this.projectRoot = projectRoot;
    this.config = config || new ConfigManager(projectRoot);
    this.eventLog = new EventLog(projectRoot);
    this.webhooks = new WebhookDispatcher(this.config);
    this.confirmations = new ConfirmationManager();
    this.confirmations.setWebhooks(this.webhooks);

    setEventLog(this.eventLog);
    setWebhookDispatcher(this.webhooks);
    setConfirmationManager(this.confirmations);
    setGuardrailMode(chatEngine.getSettings().guardrail_mode || "normal");

    // Write active project so all processes (stdio MCP, HTTP) stay in sync
    this.writeActiveProject(projectRoot);
  }

  private writeActiveProject(root: string): void {
    try {
      const dir = join(homedir(), ".godotforge");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "active-project"), root, "utf-8");
    } catch { /* non-critical */ }
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      const tryPort = (port: number, attempt: number): void => {
        if (attempt >= MAX_PORT_TRIES) {
          reject(new Error(`Could not bind to ports ${DEFAULT_PORT}-${DEFAULT_PORT + MAX_PORT_TRIES}`));
          return;
        }

        this.server!.once("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            tryPort(port + 1, attempt + 1);
          } else {
            reject(err);
          }
        });

        this.server!.listen(port, BIND_HOST, () => {
          this.port = port;
          this.portFilePath = writePortFile(this.projectRoot, port);
          console.error(`[GodotForge HTTP] Listening on ${BIND_HOST}:${port}`);
          provisionBlenderAddon(this.config, this._cachedWinUser);
          attachFileWatcher(this.server!, this.projectRoot);
          resolve(port);
        });
      };

      tryPort(DEFAULT_PORT, 0);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      removePortFile(this.portFilePath);
      console.error("[GodotForge HTTP] Stopped.");
    }
  }

  getPort(): number {
    return this.port;
  }

  getVersionStatus(): ReturnType<typeof getVersionStatus> {
    return getVersionStatus(this.projectRoot, this.config, this._cachedWinUser);
  }

  private get deps(): HandlerDeps {
    return {
      chatEngine: this.chatEngine,
      config: this.config,
      eventLog: this.eventLog,
      webhooks: this.webhooks,
      confirmations: this.confirmations,
      projectRoot: this.projectRoot,
      port: this.port,
      cachedWinUser: this._cachedWinUser,
    };
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url || "/";
    const body = await readBody(req);

    try {
      const urlPath = new URL(url, "http://localhost").pathname;
      if (urlPath.startsWith("/file/")) {
        serveProjectFile(res, this.projectRoot, urlPath.slice("/file/".length), sendJson);
        return;
      }

      switch (urlPath) {
        case "/":
        case "/dashboard":
          serveDashboard(res);
          break;

        case "/health":
          sendJson(res, 200, {
            status: "ok",
            service: "godotforge-mcp",
            version: "0.1.0",
            port: this.port,
          });
          break;

        case "/chat":
          if (req.method !== "POST") { sendJson(res, 405, { error: "Method not allowed" }); break; }
          await handleChat(res, body, this.deps);
          break;

        case "/chat/stream":
          if (req.method !== "POST") { sendJson(res, 405, { error: "Method not allowed" }); break; }
          await handleChatStream(res, body, this.deps);
          break;

        case "/chat/agent":
          if (req.method !== "POST") { sendJson(res, 405, { error: "Method not allowed" }); break; }
          await handleChatAgent(res, body, this.deps);
          break;

        case "/chat/confirm": {
          if (req.method !== "POST") { sendJson(res, 405, { error: "Method not allowed" }); break; }
          const parsed = JSON.parse(body || "{}") as Record<string, unknown>;
          const id = parsed.id as string;
          const confirmed = parsed.confirmed as boolean;
          if (!id) { sendJson(res, 400, { error: "Missing 'id' field" }); break; }
          const resolved = this.confirmations.resolve(id, !!confirmed);
          sendJson(res, 200, { resolved, confirmed: !!confirmed });
          break;
        }

        case "/settings":
          if (req.method === "POST") {
            handleUpdateSettings(res, body, this.deps);
          } else if (req.method === "GET") {
            const settings = this.chatEngine.getSettings();
            sendJson(res, 200, {
              auth_mode: settings.auth_mode,
              model: settings.model,
              max_tokens: settings.max_tokens,
              memory_enabled: settings.memory_enabled,
              has_api_key: settings.api_key !== "",
              temperature: settings.temperature,
              effort: settings.effort,
              thinking: settings.thinking,
              tool_choice: settings.tool_choice,
              guardrail_mode: settings.guardrail_mode,
              system_prompt_extra: settings.system_prompt_extra,
            });
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/context":
          if (req.method === "GET") {
            const { buildContext } = await import("./context/builder.js");
            const ctx = await buildContext(this.projectRoot);
            sendJson(res, 200, { context: ctx });
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/version":
          if (req.method === "GET") {
            sendJson(res, 200, this.getVersionStatus());
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/connections":
          if (req.method === "GET") {
            await handleConnections(res, this.deps);
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/config":
          if (req.method === "GET") {
            sendJson(res, 200, this.config.getFullConfig());
          } else if (req.method === "PUT") {
            handleWriteConfig(res, body, this.deps);
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/update/godot-plugin":
          if (req.method === "POST") {
            provisionGodotPlugin(this.projectRoot, true);
            sendJson(res, 200, { result: "Godot plugin updated", ...this.getVersionStatus() });
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/update/blender-addon":
          if (req.method === "POST") {
            provisionBlenderAddon(this.config, this._cachedWinUser, true).catch((e) =>
              console.error(`[GodotForge] Blender addon provision failed: ${e}`)
            );
            sendJson(res, 200, { result: "Blender addon update scheduled", ...this.getVersionStatus() });
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/project":
          if (req.method === "GET") {
            const root = this.chatEngine.getProjectRoot();
            const hasGodot = existsSync(join(root, "project.godot"));
            sendJson(res, 200, {
              project_root: root,
              has_godot_project: hasGodot,
              is_valid: hasGodot,
              recent_projects: this.config.getRecentProjects(),
            });
          } else if (req.method === "POST") {
            handleSwitchProject(res, body, this.deps);
            // sync back mutated projectRoot
            this.projectRoot = this.deps.projectRoot;
            this.writeActiveProject(this.projectRoot);
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/paths":
          if (req.method === "GET") {
            sendJson(res, 200, { paths: this.config.getPathsStatus() });
          } else if (req.method === "POST") {
            handleSetPath(res, body, this.deps);
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/keys":
          if (req.method === "GET") {
            sendJson(res, 200, { services: this.config.getStatus() });
          } else if (req.method === "POST") {
            handleSetKey(res, body, this.deps);
          } else if (req.method === "DELETE") {
            handleRemoveKey(res, body, this.deps);
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/skills":
          sendJson(res, 200, this.chatEngine.getSkills().map(
            ({ name, description }) => ({ name, description })
          ));
          break;

        case "/agents":
          sendJson(res, 200, this.chatEngine.getAgents().map(
            ({ name, description }) => ({ name, description })
          ));
          break;

        case "/templates":
          sendJson(res, 200, this.chatEngine.getTemplates().map(
            ({ name }) => ({ name })
          ));
          break;

        case "/events": {
          const params = new URL(req.url || "/", "http://localhost").searchParams;
          const events = this.eventLog.query({
            limit: parseInt(params.get("limit") || "100"),
            type: params.get("type") || undefined,
            since: params.get("since") || undefined,
          });
          sendJson(res, 200, events);
          break;
        }

        case "/events/stats":
          sendJson(res, 200, this.eventLog.stats());
          break;

        case "/webhooks":
          if (req.method === "GET") {
            sendJson(res, 200, this.webhooks.getWebhooks().map(
              ({ name, events, format }) => ({ name, events, format })
            ));
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/webhooks/test":
          if (req.method === "POST") {
            const parsed = JSON.parse(body || "{}") as Record<string, string>;
            const result = await this.webhooks.sendTest(parsed.name || "");
            sendJson(res, result.success ? 200 : 422, result);
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/webhooks/telegram/setup":
          if (req.method === "POST") {
            const parsed = JSON.parse(body || "{}") as Record<string, unknown>;
            const token = parsed.token as string;
            if (!token) { sendJson(res, 400, { error: "Missing 'token' field" }); break; }
            const result = await this.webhooks.setupTelegram(token, parsed.events as string[] | undefined);
            sendJson(res, 200, result);
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/files": {
          if (req.method !== "GET") { sendJson(res, 405, { error: "Method not allowed" }); break; }
          const params = new URL(url, "http://localhost").searchParams;
          handleListFiles(res, this.projectRoot, params.get("path") || "", params.get("include_meta") !== "false");
          break;
        }

        default:
          sendJson(res, 404, { error: `Not found: ${url}` });
      }
    } catch (error) {
      console.error("[GodotForge HTTP] Error:", error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  }
}
