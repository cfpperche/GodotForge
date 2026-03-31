import { type ServerResponse } from "node:http";
import { createConnection } from "node:net";
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve, extname } from "path";
import { type ChatEngine } from "../chat.js";
import { type ConfigManager } from "../config.js";
import { type EventLog } from "../events.js";
import { type WebhookDispatcher } from "../webhooks.js";
import { type ConfirmationManager } from "../confirmations.js";
import { setGuardrailMode } from "../tool-handlers.js";
import { sendJson } from "./utils.js";
import { serveProjectFile } from "./files.js";
import { getVersionStatus, provisionGodotPlugin, provisionBlenderAddon } from "./provision.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { readFileSync } from "fs";

export interface HandlerDeps {
  chatEngine: ChatEngine;
  config: ConfigManager;
  eventLog: EventLog;
  webhooks: WebhookDispatcher;
  confirmations: ConfirmationManager;
  projectRoot: string;
  port: number;
  cachedWinUser: { value: string | null | undefined };
}

export async function handleChat(res: ServerResponse, body: string, deps: HandlerDeps): Promise<void> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const message = parsed.message as string;
  const sessionId = (parsed.session_id as string) || "default";

  if (!message) {
    sendJson(res, 400, { error: "Missing 'message' field" });
    return;
  }

  const result = await deps.chatEngine.chat(message, sessionId);
  sendJson(res, result.error ? 422 : 200, result);
}

export async function handleChatStream(res: ServerResponse, body: string, deps: HandlerDeps): Promise<void> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const message = parsed.message as string;
  const sessionId = (parsed.session_id as string) || "default";

  if (!message) {
    sendJson(res, 400, { error: "Missing 'message' field" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  deps.confirmations.setSSECallback((event) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  });

  await deps.chatEngine.chatStream(message, sessionId, (event) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === "done" || event.type === "error") {
        deps.confirmations.setSSECallback(null);
        res.end();
      }
    }
  });
}

export async function handleChatAgent(res: ServerResponse, body: string, deps: HandlerDeps): Promise<void> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const agent = parsed.agent as string;
  const task = parsed.task as string;
  const sessionId = (parsed.session_id as string) || "default";

  if (!agent || !task) {
    sendJson(res, 400, { error: "Missing 'agent' and 'task' fields" });
    return;
  }

  const result = await deps.chatEngine.chatAsAgent(agent, task, sessionId);
  sendJson(res, result.error ? 422 : 200, result);
}

export function handleUpdateSettings(res: ServerResponse, body: string, deps: HandlerDeps): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  deps.chatEngine.updateSettings(parsed as Record<string, string | number | boolean>);
  if (parsed.guardrail_mode) {
    setGuardrailMode(parsed.guardrail_mode as "yolo" | "normal" | "strict");
  }
  sendJson(res, 200, { result: "Settings updated" });
}

export function serveDashboard(res: ServerResponse): void {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const htmlPath = join(thisDir, "..", "..", "src", "web", "dashboard.html");
  const distHtmlPath = join(thisDir, "..", "web", "dashboard.html");

  let html = "";
  if (existsSync(distHtmlPath)) {
    html = readFileSync(distHtmlPath, "utf-8");
  } else if (existsSync(htmlPath)) {
    html = readFileSync(htmlPath, "utf-8");
  } else {
    html = "<html><body><h1>GodotForge Dashboard</h1><p>dashboard.html not found</p></body></html>";
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}

export async function handleConnections(res: ServerResponse, deps: HandlerDeps): Promise<void> {
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
    Promise.resolve(true),
    checkHttp(6970),
    checkTcp(8400),
  ]);

  const versions = getVersionStatus(deps.projectRoot, deps.config, deps.cachedWinUser);
  sendJson(res, 200, {
    mcp: { connected: mcp, port: deps.port },
    godot: { connected: godot, port: 6970, outdated: versions.outdated.godot_plugin },
    blender: { connected: blender, port: 8400, outdated: versions.outdated.blender_addon },
  });
}

export function handleWriteConfig(res: ServerResponse, body: string, deps: HandlerDeps): void {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(body); } catch { sendJson(res, 400, { error: "Invalid JSON" }); return; }

  try {
    deps.config.writeFullConfig(parsed);
    sendJson(res, 200, { result: "Config saved", config: deps.config.getFullConfig() });
  } catch (error) {
    sendJson(res, 422, { error: error instanceof Error ? error.message : "Failed to save config" });
  }
}

export function handleSwitchProject(res: ServerResponse, body: string, deps: HandlerDeps): void {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(body); } catch { sendJson(res, 400, { error: "Invalid JSON" }); return; }

  const projectRoot = parsed.project_root as string;
  const create = parsed.create as boolean;
  const projectName = (parsed.project_name as string) || "New Game";

  if (!projectRoot) {
    sendJson(res, 400, { error: "Missing 'project_root'" });
    return;
  }

  if (create) {
    if (existsSync(projectRoot)) {
      sendJson(res, 400, { error: `Directory already exists: ${projectRoot}` });
      return;
    }

    try {
      mkdirSync(projectRoot, { recursive: true });

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

      for (const dir of ["scenes", "scripts", "assets"]) {
        mkdirSync(join(projectRoot, dir), { recursive: true });
      }

      console.error(`[GodotForge] Created new project: ${projectRoot}`);
    } catch (error) {
      sendJson(res, 500, { error: `Failed to create project: ${error instanceof Error ? error.message : error}` });
      return;
    }
  } else if (!existsSync(projectRoot)) {
    sendJson(res, 400, { error: `Directory not found: ${projectRoot}` });
    return;
  }

  provisionGodotPlugin(projectRoot);

  deps.chatEngine.switchProject(projectRoot);
  deps.projectRoot = projectRoot;

  sendJson(res, 200, {
    result: `${create ? "Created and switched" : "Switched"} to project: ${projectRoot}`,
    has_godot_project: existsSync(join(projectRoot, "project.godot")),
  });
}

export function handleSetPath(res: ServerResponse, body: string, deps: HandlerDeps): void {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(body); } catch { sendJson(res, 400, { error: "Invalid JSON" }); return; }

  const key = parsed.key as string;
  const value = parsed.value as string;
  if (!key || !value) { sendJson(res, 400, { error: "Missing 'key' and 'value'" }); return; }

  deps.config.setPath(key as keyof import("../config.js").SystemPaths, value);

  if (key === "blender_executable") {
    provisionBlenderAddon(deps.config, deps.cachedWinUser);
  }

  sendJson(res, 200, { result: `Path saved: ${key} = ${value}` });
}

export function handleSetKey(res: ServerResponse, body: string, deps: HandlerDeps): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const service = parsed.service as string;
  const key = parsed.key as string;

  if (!service || !key) {
    sendJson(res, 400, { error: "Missing 'service' and 'key' fields" });
    return;
  }

  try {
    deps.config.setKey(service as keyof import("../config.js").ServiceKeys, key);
    sendJson(res, 200, { result: `Key saved for ${service}` });
  } catch (error) {
    sendJson(res, 422, { error: `Failed to save key: ${error instanceof Error ? error.message : error}` });
  }
}

export function handleRemoveKey(res: ServerResponse, body: string, deps: HandlerDeps): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const service = parsed.service as string;
  if (!service) {
    sendJson(res, 400, { error: "Missing 'service' field" });
    return;
  }

  deps.config.removeKey(service as keyof import("../config.js").ServiceKeys);
  sendJson(res, 200, { result: `Key removed for ${service}` });
}

export function handleListFiles(res: ServerResponse, projectRoot: string, relPath: string, _includeMeta: boolean): void {
  const safePath = resolve(join(projectRoot, relPath));
  if (!safePath.startsWith(projectRoot)) {
    sendJson(res, 403, { error: "Path traversal rejected" });
    return;
  }
  if (!existsSync(safePath)) {
    sendJson(res, 404, { error: `Path not found: ${relPath}` });
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
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Failed to list files" });
  }
}

export { serveProjectFile, sendJson };
