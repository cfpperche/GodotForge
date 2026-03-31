import { type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, statSync, createReadStream, watch as fsWatch } from "fs";
import { join, extname, resolve, basename } from "path";
import { WebSocketServer } from "ws";

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => res(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", () => res(""));
  });
}

export function getContentType(ext: string): string {
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

export function attachFileWatcher(
  server: import("node:http").Server,
  projectRoot: string
): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = new URL(req.url || "", `http://${req.headers.host}`).pathname;
    if (pathname === "/files/watch") {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    const debounce = new Map<string, NodeJS.Timeout>();

    const watcher = fsWatch(projectRoot, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.startsWith(".")) return;

      const existing = debounce.get(filename);
      if (existing) clearTimeout(existing);

      debounce.set(filename, setTimeout(() => {
        debounce.delete(filename);
        const fullPath = join(projectRoot, filename);
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

export function serveProjectFile(
  res: ServerResponse,
  projectRoot: string,
  filePath: string,
  sendJsonFn: (res: ServerResponse, status: number, data: unknown) => void
): void {
  const safePath = resolve(join(projectRoot, decodeURIComponent(filePath)));
  if (!safePath.startsWith(projectRoot)) {
    sendJsonFn(res, 403, { error: "Path traversal rejected" });
    return;
  }

  const godotforgeDir = join(projectRoot, ".godotforge");
  if (safePath.startsWith(godotforgeDir)) {
    const name = basename(safePath);
    if (name === ".env" || name === ".api_key" || name === "config.json") {
      sendJsonFn(res, 403, { error: "Access denied" });
      return;
    }
  }

  if (!existsSync(safePath)) {
    sendJsonFn(res, 404, { error: "File not found" });
    return;
  }

  const contentType = getContentType(extname(safePath).toLowerCase());
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=60",
  });
  createReadStream(safePath).pipe(res);
}
