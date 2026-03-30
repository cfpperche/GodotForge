import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createConnection } from "node:net";
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync, cpSync, readdirSync, statSync, createReadStream, watch as fsWatch } from "fs";
import { join, dirname, basename, resolve, extname } from "path";
import { WebSocketServer } from "ws";
import { execSync, execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
import { fileURLToPath } from "url";
import { ChatEngine } from "./chat.js";
import { ConfigManager } from "./config.js";
import { EventLog } from "./events.js";
import { WebhookDispatcher } from "./webhooks.js";
import { ConfirmationManager } from "./confirmations.js";
import { setEventLog, setWebhookDispatcher, setConfirmationManager, setGuardrailMode } from "./tool-handlers.js";

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
  private _cachedWinUser: string | null | undefined = undefined; // undefined = not yet resolved

  constructor(chatEngine: ChatEngine, projectRoot: string, config?: ConfigManager) {
    this.chatEngine = chatEngine;
    this.projectRoot = projectRoot;
    this.config = config || new ConfigManager(projectRoot);
    this.eventLog = new EventLog(projectRoot);
    this.webhooks = new WebhookDispatcher(this.config);
    this.confirmations = new ConfirmationManager();
    this.confirmations.setWebhooks(this.webhooks);

    // Wire into tool handlers
    setEventLog(this.eventLog);
    setWebhookDispatcher(this.webhooks);
    setConfirmationManager(this.confirmations);
    setGuardrailMode(chatEngine.getSettings().guardrail_mode || "normal");
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
          this.writePortFile();
          console.error(`[GodotForge HTTP] Listening on ${BIND_HOST}:${port}`);
          this.provisionBlenderAddon();
          this.attachFileWatcher();
          resolve(port);
        });
      };

      tryPort(DEFAULT_PORT, 0);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.removePortFile();
      console.error("[GodotForge HTTP] Stopped.");
    }
  }

  getPort(): number {
    return this.port;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS
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
      // Prefix-matched routes (must come before the switch)
      const urlPath = new URL(url, "http://localhost").pathname;
      if (urlPath.startsWith("/file/")) {
        this.serveProjectFile(res, urlPath.slice("/file/".length));
        return;
      }

      switch (urlPath) {
        case "/":
        case "/dashboard":
          this.serveDashboard(res);
          break;

        case "/health":
          this.sendJson(res, 200, {
            status: "ok",
            service: "godotforge-mcp",
            version: "0.1.0",
            port: this.port,
          });
          break;

        case "/chat":
          if (req.method !== "POST") {
            this.sendJson(res, 405, { error: "Method not allowed" });
            break;
          }
          await this.handleChat(res, body);
          break;

        case "/chat/stream":
          if (req.method !== "POST") {
            this.sendJson(res, 405, { error: "Method not allowed" });
            break;
          }
          await this.handleChatStream(res, body);
          break;

        case "/chat/agent":
          if (req.method !== "POST") {
            this.sendJson(res, 405, { error: "Method not allowed" });
            break;
          }
          await this.handleChatAgent(res, body);
          break;

        case "/chat/confirm":
          if (req.method === "POST") {
            const parsed = JSON.parse(body || "{}") as Record<string, unknown>;
            const id = parsed.id as string;
            const confirmed = parsed.confirmed as boolean;
            if (!id) {
              this.sendJson(res, 400, { error: "Missing 'id' field" });
              break;
            }
            const resolved = this.confirmations.resolve(id, !!confirmed);
            this.sendJson(res, 200, { resolved, confirmed: !!confirmed });
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/settings":
          if (req.method === "POST") {
            this.handleUpdateSettings(res, body);
          } else if (req.method === "GET") {
            const settings = this.chatEngine.getSettings();
            this.sendJson(res, 200, {
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
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/context":
          if (req.method === "GET") {
            const { buildContext } = await import("./context/builder.js");
            const ctx = await buildContext(this.projectRoot);
            this.sendJson(res, 200, { context: ctx });
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/version":
          if (req.method === "GET") {
            this.sendJson(res, 200, this.getVersionStatus());
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/connections":
          if (req.method === "GET") {
            await this.handleConnections(res);
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/config":
          if (req.method === "GET") {
            this.sendJson(res, 200, this.config.getFullConfig());
          } else if (req.method === "PUT") {
            this.handleWriteConfig(res, body);
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/update/godot-plugin":
          if (req.method === "POST") {
            this.provisionGodotPlugin(this.projectRoot, true);
            this.sendJson(res, 200, { result: "Godot plugin updated", ...this.getVersionStatus() });
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/update/blender-addon":
          if (req.method === "POST") {
            this.provisionBlenderAddon(true);
            this.sendJson(res, 200, { result: "Blender addon updated", ...this.getVersionStatus() });
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/project":
          if (req.method === "GET") {
            const root = this.chatEngine.getProjectRoot();
            const hasGodot = existsSync(join(root, "project.godot"));
            this.sendJson(res, 200, {
              project_root: root,
              has_godot_project: hasGodot,
              is_valid: hasGodot,
              recent_projects: this.config.getRecentProjects(),
            });
          } else if (req.method === "POST") {
            this.handleSwitchProject(res, body);
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/paths":
          if (req.method === "GET") {
            this.sendJson(res, 200, { paths: this.config.getPathsStatus() });
          } else if (req.method === "POST") {
            this.handleSetPath(res, body);
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/keys":
          if (req.method === "GET") {
            // Returns status only — never returns actual key values
            this.sendJson(res, 200, { services: this.config.getStatus() });
          } else if (req.method === "POST") {
            this.handleSetKey(res, body);
          } else if (req.method === "DELETE") {
            this.handleRemoveKey(res, body);
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/skills":
          this.sendJson(res, 200, this.chatEngine.getSkills().map(
            ({ name, description }) => ({ name, description })
          ));
          break;

        case "/agents":
          this.sendJson(res, 200, this.chatEngine.getAgents().map(
            ({ name, description }) => ({ name, description })
          ));
          break;

        case "/templates":
          this.sendJson(res, 200, this.chatEngine.getTemplates().map(
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
          this.sendJson(res, 200, events);
          break;
        }

        case "/events/stats":
          this.sendJson(res, 200, this.eventLog.stats());
          break;

        case "/webhooks":
          if (req.method === "GET") {
            this.sendJson(res, 200, this.webhooks.getWebhooks().map(
              ({ name, events, format }) => ({ name, events, format })
            ));
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/webhooks/test":
          if (req.method === "POST") {
            const parsed = JSON.parse(body || "{}") as Record<string, string>;
            const result = await this.webhooks.sendTest(parsed.name || "");
            this.sendJson(res, result.success ? 200 : 422, result);
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/webhooks/telegram/setup":
          if (req.method === "POST") {
            const parsed = JSON.parse(body || "{}") as Record<string, unknown>;
            const token = parsed.token as string;
            if (!token) {
              this.sendJson(res, 400, { error: "Missing 'token' field" });
              break;
            }
            const result = await this.webhooks.setupTelegram(token, parsed.events as string[] | undefined);
            this.sendJson(res, 200, result);
          } else {
            this.sendJson(res, 405, { error: "Method not allowed" });
          }
          break;

        case "/files": {
          if (req.method !== "GET") { this.sendJson(res, 405, { error: "Method not allowed" }); break; }
          const params = new URL(url, "http://localhost").searchParams;
          this.handleListFiles(res, params.get("path") || "", params.get("include_meta") !== "false");
          break;
        }

        default:
          this.sendJson(res, 404, { error: `Not found: ${url}` });
      }
    } catch (error) {
      console.error("[GodotForge HTTP] Error:", error);
      this.sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  }

  private async handleChat(res: ServerResponse, body: string): Promise<void> {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const message = parsed.message as string;
    const sessionId = (parsed.session_id as string) || "default";

    if (!message) {
      this.sendJson(res, 400, { error: "Missing 'message' field" });
      return;
    }

    const result = await this.chatEngine.chat(message, sessionId);
    this.sendJson(res, result.error ? 422 : 200, result);
  }

  private async handleChatStream(res: ServerResponse, body: string): Promise<void> {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const message = parsed.message as string;
    const sessionId = (parsed.session_id as string) || "default";

    if (!message) {
      this.sendJson(res, 400, { error: "Missing 'message' field" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Wire SSE callback to confirmation manager so confirm events reach the client
    this.confirmations.setSSECallback((event) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    });

    await this.chatEngine.chatStream(message, sessionId, (event) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === "done" || event.type === "error") {
          this.confirmations.setSSECallback(null);
          res.end();
        }
      }
    });
  }

  private async handleChatAgent(res: ServerResponse, body: string): Promise<void> {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const agent = parsed.agent as string;
    const task = parsed.task as string;
    const sessionId = (parsed.session_id as string) || "default";

    if (!agent || !task) {
      this.sendJson(res, 400, { error: "Missing 'agent' and 'task' fields" });
      return;
    }

    const result = await this.chatEngine.chatAsAgent(agent, task, sessionId);
    this.sendJson(res, result.error ? 422 : 200, result);
  }

  private handleUpdateSettings(res: ServerResponse, body: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    this.chatEngine.updateSettings(parsed as Record<string, string | number | boolean>);
    if (parsed.guardrail_mode) {
      setGuardrailMode(parsed.guardrail_mode as "yolo" | "normal" | "strict");
    }
    this.sendJson(res, 200, { result: "Settings updated" });
  }

  private serveDashboard(res: ServerResponse): void {
    // Find dashboard.html relative to this file
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const htmlPath = join(thisDir, "..", "src", "web", "dashboard.html");
    const distHtmlPath = join(thisDir, "web", "dashboard.html");

    let html = "";
    if (existsSync(distHtmlPath)) {
      html = readFileSync(distHtmlPath, "utf-8");
    } else if (existsSync(htmlPath)) {
      html = readFileSync(htmlPath, "utf-8");
    } else {
      // Inline fallback
      html = "<html><body><h1>GodotForge Dashboard</h1><p>dashboard.html not found</p></body></html>";
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(html),
    });
    res.end(html);
  }

  private async handleConnections(res: ServerResponse): Promise<void> {
    const checkHttp = async (port: number): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        return r.ok;
      } catch { return false; }
    };

    const checkTcp = (port: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const socket = createConnection({ host: "127.0.0.1", port, timeout: 1500 }, () => {
          socket.end();
          resolve(true);
        });
        socket.on("error", () => resolve(false));
        socket.on("timeout", () => { socket.destroy(); resolve(false); });
      });
    };

    const [mcp, godot, blender] = await Promise.all([
      Promise.resolve(true), // we're running
      checkHttp(6970),
      checkTcp(8400),
    ]);

    const versions = this.getVersionStatus();
    this.sendJson(res, 200, {
      mcp: { connected: mcp, port: this.port },
      godot: { connected: godot, port: 6970, outdated: versions.outdated.godot_plugin },
      blender: { connected: blender, port: 8400, outdated: versions.outdated.blender_addon },
    });
  }

  private handleWriteConfig(res: ServerResponse, body: string): void {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(body); } catch { this.sendJson(res, 400, { error: "Invalid JSON" }); return; }

    try {
      this.config.writeFullConfig(parsed);
      this.sendJson(res, 200, { result: "Config saved", config: this.config.getFullConfig() });
    } catch (error) {
      this.sendJson(res, 422, { error: error instanceof Error ? error.message : "Failed to save config" });
    }
  }

  private handleSwitchProject(res: ServerResponse, body: string): void {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(body); } catch { this.sendJson(res, 400, { error: "Invalid JSON" }); return; }

    const projectRoot = parsed.project_root as string;
    const create = parsed.create as boolean;
    const projectName = (parsed.project_name as string) || "New Game";

    if (!projectRoot) {
      this.sendJson(res, 400, { error: "Missing 'project_root'" });
      return;
    }

    // Create new project if requested
    if (create) {
      if (existsSync(projectRoot)) {
        this.sendJson(res, 400, { error: `Directory already exists: ${projectRoot}` });
        return;
      }

      try {
        mkdirSync(projectRoot, { recursive: true });

        // Create minimal project.godot
        const godotConfig = [
          "; Engine configuration file.",
          "",
          "config_version=5",
          "",
          "[application]",
          "",
          `config/name="${projectName}"`,
          `config/features=PackedStringArray("4.6")`,
          "",
          "[editor_plugins]",
          "",
          'enabled=PackedStringArray("res://addons/godotforge/plugin.cfg")',
          "",
        ].join("\n");
        writeFileSync(join(projectRoot, "project.godot"), godotConfig);

        // Create standard directories
        for (const dir of ["scenes", "scripts", "assets"]) {
          mkdirSync(join(projectRoot, dir), { recursive: true });
        }

        console.error(`[GodotForge] Created new project: ${projectRoot}`);
      } catch (error) {
        this.sendJson(res, 500, { error: `Failed to create project: ${error instanceof Error ? error.message : error}` });
        return;
      }
    } else if (!existsSync(projectRoot)) {
      this.sendJson(res, 400, { error: `Directory not found: ${projectRoot}` });
      return;
    }

    // Auto-provision Godot plugin into project
    this.provisionGodotPlugin(projectRoot);

    this.chatEngine.switchProject(projectRoot);
    this.projectRoot = projectRoot;

    this.sendJson(res, 200, {
      result: `${create ? "Created and switched" : "Switched"} to project: ${projectRoot}`,
      has_godot_project: existsSync(join(projectRoot, "project.godot")),
    });
  }

  private getRepoRoot(): string {
    const __filename = fileURLToPath(import.meta.url);
    return join(dirname(__filename), "..", "..");
  }

  /** Read version from plugin.cfg: version="X.Y.Z" */
  private readGodotPluginVersion(pluginDir: string): string {
    try {
      const cfg = readFileSync(join(pluginDir, "plugin.cfg"), "utf-8");
      const match = cfg.match(/version="([^"]+)"/);
      return match?.[1] || "0.0.0";
    } catch { return "0.0.0"; }
  }

  /** Read version from __init__.py: "version": (X, Y, Z) */
  private readBlenderAddonVersion(addonDir: string): string {
    try {
      const init = readFileSync(join(addonDir, "__init__.py"), "utf-8");
      const match = init.match(/"version":\s*\((\d+),\s*(\d+),\s*(\d+)\)/);
      return match ? `${match[1]}.${match[2]}.${match[3]}` : "0.0.0";
    } catch { return "0.0.0"; }
  }

  /** Compare semver strings: returns true if a > b */
  private isNewer(a: string, b: string): boolean {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return true;
      if ((pa[i] || 0) < (pb[i] || 0)) return false;
    }
    return false;
  }

  /** Get bundled versions + installed versions for status */
  getVersionStatus(): {
    bundled: { godot_plugin: string; blender_addon: string };
    installed: { godot_plugin: string; blender_addon: string };
    outdated: { godot_plugin: boolean; blender_addon: boolean };
  } {
    const repoRoot = this.getRepoRoot();
    const bundledGodot = this.readGodotPluginVersion(join(repoRoot, "addons", "godotforge"));
    const bundledBlender = this.readBlenderAddonVersion(join(repoRoot, "blender-addon", "godotforge"));

    const installedGodot = this.readGodotPluginVersion(join(this.projectRoot, "addons", "godotforge"));

    // Find installed Blender addon
    const blenderAddonDir = this.getBlenderAddonDir();
    let installedBlender = "0.0.0";
    if (blenderAddonDir) {
      installedBlender = this.readBlenderAddonVersion(blenderAddonDir);
    }

    return {
      bundled: { godot_plugin: bundledGodot, blender_addon: bundledBlender },
      installed: { godot_plugin: installedGodot, blender_addon: installedBlender },
      outdated: {
        godot_plugin: this.isNewer(bundledGodot, installedGodot),
        blender_addon: this.isNewer(bundledBlender, installedBlender),
      },
    };
  }

  /** Resolve the Blender addon install directory from config paths. */
  private getBlenderAddonDir(): string | null {
    const blenderPath = this.config.getPath("blender_executable");
    if (!blenderPath) return null;

    const vMatch = blenderPath.match(/Blender\s+(\d+\.\d+)/i);
    if (!vMatch) return null;

    // Try to get Windows user (cached to avoid execSync on every call)
    const winUser = this.getWindowsUser();
    if (!winUser) return null;

    return `/mnt/c/Users/${winUser}/AppData/Roaming/Blender Foundation/Blender/${vMatch[1]}/scripts/addons/godotforge`;
  }

  private getWindowsUser(): string | null {
    if (this._cachedWinUser !== undefined) return this._cachedWinUser;
    // Try to extract from known paths first
    const paths = [this.config.getPath("blender_executable"), this.config.getPath("windows_temp")];
    for (const p of paths) {
      const m = p.match(/\/mnt\/c\/(?:Users|users)\/([^/]+)/);
      if (m) { this._cachedWinUser = m[1]; return this._cachedWinUser; }
    }
    // Fall back to cmd.exe (once, cached)
    try { this._cachedWinUser = execSync("cmd.exe /C echo %USERNAME%", { stdio: "pipe" }).toString().trim(); } catch { this._cachedWinUser = null; }
    return this._cachedWinUser;
  }

  private async provisionBlenderAddon(force: boolean = false): Promise<void> {
    const destDir = this.getBlenderAddonDir();
    if (!destDir) {
      console.error("[GodotForge] Cannot determine Blender addon directory, skipping provision");
      return;
    }

    const blenderPath = this.config.getPath("blender_executable");

    // Find source addon
    const __filename = fileURLToPath(import.meta.url);
    const repoRoot = join(dirname(__filename), "..", "..");
    const srcAddon = join(repoRoot, "blender-addon", "godotforge");

    if (!existsSync(join(srcAddon, "__init__.py"))) {
      console.error(`[GodotForge] Source Blender addon not found at ${srcAddon}`);
      return;
    }

    const srcVersion = this.readBlenderAddonVersion(srcAddon);
    const destVersion = this.readBlenderAddonVersion(destDir);

    if (!force && existsSync(join(destDir, "__init__.py")) && !this.isNewer(srcVersion, destVersion)) {
      console.error(`[GodotForge] Blender addon up to date (v${destVersion})`);
      return;
    }

    const isUpdate = existsSync(join(destDir, "__init__.py"));
    try {
      mkdirSync(dirname(destDir), { recursive: true });
      cpSync(srcAddon, destDir, { recursive: true });
      console.error(`[GodotForge] ${isUpdate ? "Updated" : "Installed"} Blender addon (v${srcVersion}) to ${destDir}`);

      // Enable addon via blender --background --python (async to avoid blocking HTTP server)
      const enableScript = join(destDir, "_enable.py");
      writeFileSync(enableScript, [
        "import bpy",
        'bpy.ops.preferences.addon_enable(module="godotforge")',
        "bpy.ops.wm.save_userpref()",
        'print("[GodotForge] Addon enabled")',
      ].join("\n"));

      try {
        await execFileAsync(blenderPath, ["--background", "--python", enableScript], { timeout: 30000 });
        console.error("[GodotForge] Blender addon enabled via preferences");
      } catch {
        console.error("[GodotForge] Could not auto-enable addon (Blender may not be available). User can enable manually.");
      }

      // Clean up temp script
      try { unlinkSync(enableScript); } catch { /* ignore */ }
    } catch (error) {
      console.error(`[GodotForge] Failed to install Blender addon: ${error}`);
    }
  }

  private provisionGodotPlugin(projectRoot: string, force: boolean = false): void {
    const destPlugin = join(projectRoot, "addons", "godotforge");
    const repoRoot = this.getRepoRoot();
    const srcPlugin = join(repoRoot, "addons", "godotforge");

    if (!existsSync(join(srcPlugin, "plugin.cfg"))) {
      console.error(`[GodotForge] Source addon not found at ${srcPlugin}, skipping provision`);
      return;
    }

    const srcVersion = this.readGodotPluginVersion(srcPlugin);
    const destVersion = this.readGodotPluginVersion(destPlugin);

    if (!force && existsSync(join(destPlugin, "plugin.cfg")) && !this.isNewer(srcVersion, destVersion)) {
      console.error(`[GodotForge] Godot plugin up to date (v${destVersion})`);
      return;
    }

    const isUpdate = existsSync(join(destPlugin, "plugin.cfg"));
    try {
      mkdirSync(join(projectRoot, "addons"), { recursive: true });
      cpSync(srcPlugin, destPlugin, { recursive: true });
      console.error(`[GodotForge] ${isUpdate ? "Updated" : "Provisioned"} Godot plugin (v${srcVersion}) into ${destPlugin}`);

      // Enable plugin in project.godot
      const godotFile = join(projectRoot, "project.godot");
      if (existsSync(godotFile)) {
        const content = readFileSync(godotFile, "utf-8");
        if (!content.includes("editor_plugins")) {
          writeFileSync(godotFile, content + '\n[editor_plugins]\n\nenabled=PackedStringArray("res://addons/godotforge/plugin.cfg")\n');
          console.error("[GodotForge] Enabled plugin in project.godot");
        }
      }
    } catch (error) {
      console.error(`[GodotForge] Failed to provision plugin: ${error}`);
    }
  }

  private handleSetPath(res: ServerResponse, body: string): void {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(body); } catch { this.sendJson(res, 400, { error: "Invalid JSON" }); return; }

    const key = parsed.key as string;
    const value = parsed.value as string;
    if (!key || !value) { this.sendJson(res, 400, { error: "Missing 'key' and 'value'" }); return; }

    this.config.setPath(key as keyof import("./config.js").SystemPaths, value);

    // Auto-provision Blender addon when path is set
    if (key === "blender_executable") {
      this.provisionBlenderAddon();
    }

    this.sendJson(res, 200, { result: `Path saved: ${key} = ${value}` });
  }

  private handleSetKey(res: ServerResponse, body: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const service = parsed.service as string;
    const key = parsed.key as string;

    if (!service || !key) {
      this.sendJson(res, 400, { error: "Missing 'service' and 'key' fields" });
      return;
    }

    try {
      this.config.setKey(service as keyof import("./config.js").ServiceKeys, key);
      this.sendJson(res, 200, { result: `Key saved for ${service}` });
    } catch (error) {
      this.sendJson(res, 422, { error: `Failed to save key: ${error instanceof Error ? error.message : error}` });
    }
  }

  private handleRemoveKey(res: ServerResponse, body: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const service = parsed.service as string;
    if (!service) {
      this.sendJson(res, 400, { error: "Missing 'service' field" });
      return;
    }

    this.config.removeKey(service as keyof import("./config.js").ServiceKeys);
    this.sendJson(res, 200, { result: `Key removed for ${service}` });
  }

  private handleListFiles(res: ServerResponse, relPath: string, _includeMeta: boolean): void {
    const safePath = resolve(join(this.projectRoot, relPath));
    if (!safePath.startsWith(this.projectRoot)) {
      this.sendJson(res, 403, { error: "Path traversal rejected" });
      return;
    }
    if (!existsSync(safePath)) {
      this.sendJson(res, 404, { error: `Path not found: ${relPath}` });
      return;
    }

    try {
      const entries = readdirSync(safePath, { withFileTypes: true });
      const result = entries
        .filter((e) => !e.name.startsWith("."))
        .map((e) => {
          let size = 0;
          let modified = "";
          try {
            const st = statSync(join(safePath, e.name));
            size = st.size;
            modified = st.mtime.toISOString();
          } catch { /* skip if stat fails */ }
          return {
            name: e.name,
            isDir: e.isDirectory(),
            size,
            modified,
            extension: e.isDirectory() ? "" : extname(e.name).slice(1),
          };
        })
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      this.sendJson(res, 200, result);
    } catch (error) {
      this.sendJson(res, 500, { error: error instanceof Error ? error.message : "Failed to list files" });
    }
  }

  private attachFileWatcher(): void {
    const wss = new WebSocketServer({ noServer: true });

    this.server!.on("upgrade", (req, socket, head) => {
      const pathname = new URL(req.url || "", `http://${req.headers.host}`).pathname;
      if (pathname === "/files/watch") {
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
      } else {
        socket.destroy();
      }
    });

    wss.on("connection", (ws) => {
      const debounce = new Map<string, NodeJS.Timeout>();

      const watcher = fsWatch(this.projectRoot, { recursive: true }, (eventType, filename) => {
        if (!filename || filename.startsWith(".")) return;

        const existing = debounce.get(filename);
        if (existing) clearTimeout(existing);

        debounce.set(filename, setTimeout(() => {
          debounce.delete(filename);
          const fullPath = join(this.projectRoot, filename);
          let type: string;
          if (eventType === "change") {
            type = "modified";
          } else {
            type = existsSync(fullPath) ? "created" : "deleted";
          }
          const isDir = existsSync(fullPath) && statSync(fullPath).isDirectory();
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type, path: filename, isDir }));
          }
        }, 100));
      });

      ws.on("close", () => {
        watcher.close();
        for (const t of debounce.values()) clearTimeout(t);
      });
    });
  }

  private serveProjectFile(res: ServerResponse, filePath: string): void {
    const safePath = resolve(join(this.projectRoot, decodeURIComponent(filePath)));
    if (!safePath.startsWith(this.projectRoot)) {
      this.sendJson(res, 403, { error: "Path traversal rejected" });
      return;
    }

    // Blocklist sensitive files
    const godotforgeDir = join(this.projectRoot, ".godotforge");
    if (safePath.startsWith(godotforgeDir)) {
      const name = basename(safePath);
      if (name === ".env" || name === ".api_key" || name === "config.json") {
        this.sendJson(res, 403, { error: "Access denied" });
        return;
      }
    }

    if (!existsSync(safePath)) {
      this.sendJson(res, 404, { error: "File not found" });
      return;
    }

    const contentType = getContentType(extname(safePath).toLowerCase());
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=60",
    });
    createReadStream(safePath).pipe(res);
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    const json = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
  }

  private writePortFile(): void {
    const dir = join(this.projectRoot, ".godotforge");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.portFilePath = join(dir, "mcp.port");
    writeFileSync(this.portFilePath, String(this.port));
    console.error(`[GodotForge HTTP] Port file: ${this.portFilePath}`);
  }

  private removePortFile(): void {
    if (this.portFilePath && existsSync(this.portFilePath)) {
      unlinkSync(this.portFilePath);
    }
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", () => resolve(""));
  });
}

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".gd": "text/plain; charset=utf-8",
    ".gdshader": "text/plain; charset=utf-8",
    ".tscn": "text/plain; charset=utf-8",
    ".tres": "text/plain; charset=utf-8",
    ".cfg": "text/plain; charset=utf-8",
    ".json": "application/json",
    ".md": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".csv": "text/plain; charset=utf-8",
    ".log": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}
