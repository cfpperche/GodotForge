import { type ServerResponse } from "node:http";
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

export function writePortFile(projectRoot: string, port: number): string {
  const dir = join(projectRoot, ".godotforge");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const portFilePath = join(dir, "mcp.port");
  writeFileSync(portFilePath, String(port));
  console.error(`[GodotForge HTTP] Port file: ${portFilePath}`);
  return portFilePath;
}

export function removePortFile(portFilePath: string): void {
  if (portFilePath && existsSync(portFilePath)) {
    unlinkSync(portFilePath);
  }
}
