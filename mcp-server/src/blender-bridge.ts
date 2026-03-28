/**
 * BlenderBridge — TCP socket client to Blender addon on :8400.
 * Sends JSON commands, receives JSON responses.
 */

import { createConnection, Socket } from "net";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface BlenderToolResult {
  result: string;
  is_error?: boolean;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8400;
const TIMEOUT_MS = 30_000;

export class BlenderBridge {
  private host = DEFAULT_HOST;
  private port = DEFAULT_PORT;

  constructor(projectRoot?: string) {
    // Check for port file override
    if (projectRoot) {
      const portFile = join(projectRoot, ".godotforge", "blender.port");
      if (existsSync(portFile)) {
        const p = parseInt(readFileSync(portFile, "utf-8").trim(), 10);
        if (!isNaN(p)) this.port = p;
      }
    }
  }

  async executeTool(
    tool: string,
    args: Record<string, unknown>
  ): Promise<BlenderToolResult> {
    const request = JSON.stringify({ tool, args });
    const response = await this.sendRaw(request);
    return JSON.parse(response) as BlenderToolResult;
  }

  async health(): Promise<BlenderToolResult> {
    return this.executeTool("health", {});
  }

  private sendRaw(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket: Socket = createConnection(
        { host: this.host, port: this.port },
        () => {
          socket.write(data);
          socket.end();
        }
      );

      let response = "";
      socket.setTimeout(TIMEOUT_MS);

      socket.on("data", (chunk) => {
        response += chunk.toString();
      });

      socket.on("end", () => {
        resolve(response);
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Blender connection timed out after 30s."));
      });

      socket.on("error", (err) => {
        reject(
          new Error(
            `Cannot connect to Blender on ${this.host}:${this.port}. ` +
              `Is Blender running with the GodotForge addon enabled? (${err.message})`
          )
        );
      });
    });
  }
}
