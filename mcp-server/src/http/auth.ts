/**
 * Bearer token authentication for HTTP API.
 * Token generated on first start, stored in ~/.godotforge/http-token.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { randomBytes, timingSafeEqual } from "crypto";
import type { IncomingMessage } from "http";

const TOKEN_FILE = "http-token";

function getTokenPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
  return join(home, ".godotforge", TOKEN_FILE);
}

export function getOrCreateToken(): string {
  const tokenPath = getTokenPath();

  if (existsSync(tokenPath)) {
    try {
      const token = readFileSync(tokenPath, "utf-8").trim();
      if (token.length >= 32) return token;
    } catch { /* regenerate */ }
  }

  const dir = join(tokenPath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const token = randomBytes(32).toString("hex");
  writeFileSync(tokenPath, token, "utf-8");
  try { chmodSync(tokenPath, 0o600); } catch { /* Windows */ }
  console.error(`[Auth] Generated new HTTP auth token at ${tokenPath}`);
  return token;
}

export function validateRequest(req: IncomingMessage, expectedToken: string): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;
  const provided = Buffer.from(parts[1]);
  const expected = Buffer.from(expectedToken);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Paths exempt from auth (health checks, CORS preflight). */
export function isExempt(method: string, path: string): boolean {
  if (method === "OPTIONS") return true;
  if (path === "/health") return true;
  return false;
}
