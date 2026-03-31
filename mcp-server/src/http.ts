import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, writeFileSync, mkdirSync, statSync, rmSync } from "fs";
import { join, resolve, basename } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer as createMcpServer } from "./server.js";
import { ChatEngine } from "./chat.js";
import { ConfigManager } from "./config.js";
import { BlenderBridge } from "./blender-bridge.js";
import { TaskRegistry } from "./tasks.js";
import { EventLog } from "./events.js";
import { WebhookDispatcher } from "./webhooks.js";
import { ConfirmationManager } from "./confirmations.js";
import { setEventLog, setWebhookDispatcher, setConfirmationManager, setGuardrailMode } from "./tool-handlers.js";
import { sendJson, writePortFile, removePortFile } from "./http/utils.js";
import { readBody, attachFileWatcher, serveProjectFile, broadcastFileChange } from "./http/files.js";
import { getVersionStatus, provisionGodotPlugin, provisionBlenderAddon } from "./http/provision.js";
import { RateLimiter, getCategory } from "./http/rate-limiter.js";
import { getOrCreateToken, validateRequest, isExempt } from "./http/auth.js";
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

  private isHttpOnly: boolean;
  private rateLimiter = new RateLimiter();
  private authToken: string;
  private mcpTransports = new Map<string, StreamableHTTPServerTransport>();
  private blenderBridge: BlenderBridge;
  private taskRegistry = new TaskRegistry();

  private static readonly CORS_ORIGINS = new Set([
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
  ]);

  constructor(chatEngine: ChatEngine, projectRoot: string, config?: ConfigManager, httpOnly = false, blenderBridge?: BlenderBridge) {
    this.isHttpOnly = httpOnly;
    this.chatEngine = chatEngine;
    this.projectRoot = projectRoot;
    this.config = config || new ConfigManager(projectRoot);
    this.blenderBridge = blenderBridge || new BlenderBridge(projectRoot);
    this.eventLog = new EventLog(projectRoot);
    this.webhooks = new WebhookDispatcher(this.config);
    this.confirmations = new ConfirmationManager();
    this.confirmations.setWebhooks(this.webhooks);

    setEventLog(this.eventLog);
    setWebhookDispatcher(this.webhooks);
    setConfirmationManager(this.confirmations);
    setGuardrailMode(chatEngine.getSettings().guardrail_mode || "normal");

    this.authToken = getOrCreateToken();

    // Only the dedicated HTTP-only server writes the active project
    if (this.isHttpOnly) this.writeActiveProject(projectRoot);
  }

  private handleSaveFile(res: ServerResponse, filePath: string, content: string): void {
    const safePath = resolve(join(this.projectRoot, decodeURIComponent(filePath)));
    if (!safePath.startsWith(this.projectRoot)) {
      sendJson(res, 403, { error: "Path traversal rejected" });
      return;
    }
    const name = basename(safePath);
    if (name === ".env" || name === "config.json" || name === "project.godot") {
      sendJson(res, 403, { error: "Cannot edit protected file" });
      return;
    }
    try {
      mkdirSync(join(safePath, ".."), { recursive: true });
      writeFileSync(safePath, content, "utf-8");
      broadcastFileChange(this.projectRoot, safePath, "modified");
      sendJson(res, 200, { saved: filePath });
    } catch (e) {
      sendJson(res, 500, { error: `Save failed: ${(e as Error).message}` });
    }
  }

  private handleDeleteFile(res: ServerResponse, filePath: string): void {
    const safePath = resolve(join(this.projectRoot, decodeURIComponent(filePath)));
    if (!safePath.startsWith(this.projectRoot)) {
      sendJson(res, 403, { error: "Path traversal rejected" });
      return;
    }
    const name = basename(safePath);
    if (name === ".env" || name === "config.json" || name === "project.godot") {
      sendJson(res, 403, { error: "Cannot delete protected file" });
      return;
    }
    if (!existsSync(safePath)) {
      sendJson(res, 404, { error: "File not found" });
      return;
    }
    try {
      const isDir = statSync(safePath).isDirectory();
      rmSync(safePath, { recursive: true });
      broadcastFileChange(this.projectRoot, safePath, "deleted");
      sendJson(res, 200, { deleted: filePath, isDir });
    } catch (e) {
      sendJson(res, 500, { error: `Delete failed: ${(e as Error).message}` });
    }
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

  /** Handle MCP Streamable HTTP transport at /mcp. */
  private async handleMcpTransport(req: IncomingMessage, res: ServerResponse, body: string): Promise<void> {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "POST") {
      let parsedBody: unknown;
      try { parsedBody = JSON.parse(body); } catch {
        sendJson(res, 400, { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
        return;
      }

      if (sessionId && this.mcpTransports.has(sessionId)) {
        // Existing session
        await this.mcpTransports.get(sessionId)!.handleRequest(req, res, parsedBody);
      } else if (!sessionId && isInitializeRequest(parsedBody)) {
        // New session — create transport + MCP server
        const transports = this.mcpTransports;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            transports.set(sid, transport);
            console.error(`[GodotForge MCP] Streamable HTTP session: ${sid}`);
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) transports.delete(sid);
        };
        const { server: mcpServer } = createMcpServer(this.projectRoot, this.blenderBridge, this.config);
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
      } else {
        sendJson(res, 400, { jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: missing or invalid session" }, id: null });
      }
    } else if (req.method === "GET") {
      // SSE stream for server-initiated messages
      if (sessionId && this.mcpTransports.has(sessionId)) {
        await this.mcpTransports.get(sessionId)!.handleRequest(req, res);
      } else {
        sendJson(res, 404, { error: "Session not found" });
      }
    } else if (req.method === "DELETE") {
      // Session termination
      if (sessionId && this.mcpTransports.has(sessionId)) {
        await this.mcpTransports.get(sessionId)!.handleRequest(req, res);
        this.mcpTransports.delete(sessionId);
      } else {
        sendJson(res, 404, { error: "Session not found" });
      }
    } else {
      sendJson(res, 405, { error: "Method not allowed" });
    }
  }

  stop(): void {
    // Close MCP transport sessions
    for (const transport of this.mcpTransports.values()) {
      transport.close().catch(() => {});
    }
    this.mcpTransports.clear();

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
    // CORS — restrict to known origins
    const origin = req.headers.origin;
    if (origin && HttpServer.CORS_ORIGINS.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (!origin) {
      // Non-browser requests (curl, Godot plugin) — allow
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url || "/";
    const method = req.method || "GET";
    const urlPath = new URL(url, "http://localhost").pathname;

    // Auth — Bearer token required (except exempt paths)
    if (!isExempt(method, urlPath) && !validateRequest(req, this.authToken)) {
      this.eventLog.emit({ type: "guardrail", action: "auth_failed", path: urlPath, method });
      sendJson(res, 401, { error: "Unauthorized. Include Authorization: Bearer <token> header." });
      return;
    }

    // Rate limiting (exempt /health)
    if (urlPath !== "/health") {
      const category = getCategory(urlPath, method);
      const limit = this.rateLimiter.check(category);
      if (!limit.allowed) {
        res.setHeader("Retry-After", String(Math.ceil(limit.retryAfterMs / 1000)));
        sendJson(res, 429, { error: "Too many requests", retry_after_ms: limit.retryAfterMs });
        return;
      }
    }

    const body = await readBody(req);

    try {
      // MCP Streamable HTTP transport
      if (urlPath === "/mcp") {
        await this.handleMcpTransport(req, res, body);
        return;
      }

      if (urlPath.startsWith("/tasks/")) {
        const taskId = urlPath.slice("/tasks/".length);
        if (req.method === "GET") {
          const task = this.taskRegistry.get(taskId);
          if (task) sendJson(res, 200, task);
          else sendJson(res, 404, { error: "Task not found" });
        } else if (req.method === "DELETE") {
          const cancelled = this.taskRegistry.cancel(taskId);
          sendJson(res, 200, { cancelled, task_id: taskId });
        } else {
          sendJson(res, 405, { error: "Method not allowed" });
        }
        return;
      }

      if (urlPath.startsWith("/file/")) {
        const fileSuffix = urlPath.slice("/file/".length);
        if (req.method === "DELETE") {
          this.handleDeleteFile(res, fileSuffix);
          return;
        }
        if (req.method === "PUT") {
          this.handleSaveFile(res, fileSuffix, body);
          return;
        }
        serveProjectFile(res, this.projectRoot, fileSuffix, sendJson);
        return;
      }

      switch (urlPath) {
        case "/":
        case "/dashboard":
          serveDashboard(res);
          break;

        case "/health": {
          const qs = new URL(url, "http://localhost").searchParams;
          const resp: Record<string, unknown> = {
            status: "ok",
            service: "godotforge-mcp",
            version: "0.1.0",
            port: this.port,
          };
          // Token bootstrap for web copilot (localhost only)
          if (qs.get("include_token") === "1") {
            resp.token = this.authToken;
          }
          sendJson(res, 200, resp);
          break;
        }

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

        case "/chat/history": {
          const qs = new URL(url, "http://localhost").searchParams;
          const sid = qs.get("session_id") || "default";
          const messages = this.chatEngine.getSessionHistory(sid);
          sendJson(res, 200, { session_id: sid, messages });
          break;
        }

        case "/chat/sessions": {
          if (req.method === "GET") {
            sendJson(res, 200, this.chatEngine.listSessions());
          } else if (req.method === "DELETE") {
            const p = JSON.parse(body || "{}") as Record<string, unknown>;
            const sid = p.session_id as string;
            if (!sid) { sendJson(res, 400, { error: "Missing 'session_id'" }); break; }
            this.chatEngine.deleteSession(sid);
            sendJson(res, 200, { deleted: sid });
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
          break;
        }

        case "/tasks": {
          if (req.method === "GET") {
            sendJson(res, 200, this.taskRegistry.list());
          } else {
            sendJson(res, 405, { error: "Method not allowed" });
          }
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
            if (this.isHttpOnly) this.writeActiveProject(this.projectRoot);
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
