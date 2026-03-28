import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ChatEngine } from "./chat.js";
import { ConfigManager } from "./config.js";

const BIND_HOST = "127.0.0.1";
const DEFAULT_PORT = 6980;
const MAX_PORT_TRIES = 10;

export class HttpServer {
  private server: ReturnType<typeof createServer> | null = null;
  private chatEngine: ChatEngine;
  private config: ConfigManager;
  private port = 0;
  private portFilePath = "";
  private projectRoot: string;

  constructor(chatEngine: ChatEngine, projectRoot: string, config?: ConfigManager) {
    this.chatEngine = chatEngine;
    this.projectRoot = projectRoot;
    this.config = config || new ConfigManager(projectRoot);
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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url || "/";
    const body = await readBody(req);

    try {
      switch (url) {
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

  private handleUpdateSettings(res: ServerResponse, body: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    this.chatEngine.updateSettings(parsed as Record<string, string | number | boolean>);
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
