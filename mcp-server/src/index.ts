#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { ChatEngine } from "./chat.js";
import { HttpServer } from "./http.js";
import { ConfigManager } from "./config.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let projectRoot: string | undefined;
  let httpOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-root" && args[i + 1]) {
      projectRoot = args[i + 1];
      i++;
    }
    if (args[i] === "--http-only") {
      httpOnly = true;
    }
  }

  const root = projectRoot || process.cwd();
  const bridge = new GodotBridge(projectRoot);
  const blenderBridge = new BlenderBridge(projectRoot);

  // Config manager (API keys)
  const config = new ConfigManager(root);

  // GodotForge repo root (where bundled game-dev assets live)
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = join(dirname(__filename), "..", "..");

  // Always start the HTTP server (for native chat panel)
  const chatEngine = new ChatEngine(root, bridge, blenderBridge, repoRoot);
  const httpServer = new HttpServer(chatEngine, root, config, httpOnly);
  const httpPort = await httpServer.start();

  // Start MCP stdio transport (unless --http-only)
  let updateMcpRoot: ((newRoot: string) => void) | null = null;
  if (!httpOnly) {
    const { server: mcpServer, updateProjectRoot } = createServer(projectRoot, blenderBridge, config);
    updateMcpRoot = updateProjectRoot;
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("[GodotForge MCP] stdio transport started");
  }

  // Wire project switching to update MCP stdio root
  chatEngine.onProjectSwitch = (newRoot: string) => {
    updateMcpRoot?.(newRoot);
  };

  console.error(`[GodotForge] Project root: ${root}`);
  console.error(`[GodotForge] HTTP server: http://127.0.0.1:${httpPort}`);
  if (httpOnly) {
    console.error("[GodotForge] Running in HTTP-only mode (no stdio)");
  }

  // Graceful shutdown
  process.on("SIGINT", () => {
    httpServer.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    httpServer.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[GodotForge] Fatal error:", error);
  process.exit(1);
});
