import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

export interface ToolResult {
  result: string;
  is_error?: boolean;
}

export interface HealthStatus {
  status: string;
  plugin: string;
  plugin_version: string;
  godot_version: string;
  scene: string;
}

export interface ProjectContext {
  project_name: string;
  godot_version: string;
  scene_count: number;
  script_count: number;
  scenes: string[];
  scripts: string[];
  current_scene: string;
}

export class GodotBridge {
  private baseUrl: string | null = null;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || this.findProjectRoot();
  }

  private findProjectRoot(): string {
    let dir = process.cwd();
    while (dir !== "/") {
      if (existsSync(join(dir, "project.godot"))) {
        return dir;
      }
      dir = resolve(dir, "..");
    }
    return process.cwd();
  }

  private getBaseUrl(): string {
    if (this.baseUrl) return this.baseUrl;

    const portFile = join(this.projectRoot, ".godot", "godotforge.port");
    if (!existsSync(portFile)) {
      throw new Error(
        "Godot editor is not running or GodotForge plugin is not enabled. " +
          "Please open your project in Godot and enable the GodotForge plugin."
      );
    }

    const port = parseInt(readFileSync(portFile, "utf-8").trim(), 10);
    if (isNaN(port)) {
      throw new Error("Invalid port file content.");
    }

    this.baseUrl = `http://127.0.0.1:${port}`;
    return this.baseUrl;
  }

  /** Reset cached URL (e.g. if Godot restarts on a different port) */
  resetConnection(): void {
    this.baseUrl = null;
  }

  async health(): Promise<HealthStatus> {
    return this.get("/health");
  }

  async listTools(): Promise<{ tools: Array<Record<string, unknown>> }> {
    return this.get("/tools");
  }

  async executeTool(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<ToolResult> {
    return this.post(`/tools/${toolName}`, input);
  }

  async getSceneTree(): Promise<ToolResult> {
    return this.get("/context/scene");
  }

  async getProjectContext(): Promise<ProjectContext> {
    return this.get("/context/project");
  }

  private async get<T>(path: string): Promise<T> {
    const url = this.getBaseUrl() + path;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
    return response.json() as Promise<T>;
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const url = this.getBaseUrl() + path;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return response.json() as Promise<T>;
  }
}
