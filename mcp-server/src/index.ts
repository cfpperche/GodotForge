#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let projectRoot: string | undefined;

  // Parse --project-root flag
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-root" && args[i + 1]) {
      projectRoot = args[i + 1];
      i++;
    }
  }

  const server = createServer(projectRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[GodotForge MCP] Server started (stdio transport)");
  console.error(
    `[GodotForge MCP] Project root: ${projectRoot || process.cwd()}`
  );
}

main().catch((error) => {
  console.error("[GodotForge MCP] Fatal error:", error);
  process.exit(1);
});
