import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { blenderHandlerName } from "./blender-tools.js";
import { blenderToGodot, blenderToGodotAnimated, syncCollision, batchImport } from "./pipeline.js";
import { ConfigManager } from "./config.js";
import { handleSearchPolyHaven, handleDownloadPolyHaven, handleSearchSketchfab, handleDownloadSketchfab, handleSearchOpenGameArt, handleDownloadAsset, handleListLocalAssets } from "./assets/handlers.js";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";
import { ensureDocsReady, detectGodotVersion } from "./docs/indexer.js";
import { searchDocs, getClassReference } from "./docs/search.js";
import { readMemory, appendMemory, getMemorySize } from "./memory/store.js";
import {
  ensureMemoryDb,
  indexMemoryEntry,
  searchMemory as searchMemoryDb,
  getMemoryStats,
} from "./memory/search.js";
import { buildContext } from "./context/builder.js";

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ==================== Editor tools (delegate to Godot plugin) ====================

export async function editorTool(
  bridge: GodotBridge,
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const result = await bridge.executeTool(toolName, input);
    return {
      content: [{ type: "text" as const, text: result.result }],
      isError: result.is_error || false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    };
  }
}

// ==================== Local tools ====================

export async function handleGetProjectContext(
  root: string,
  bridge: GodotBridge
): Promise<ToolResult> {
  try {
    const ctx = await bridge.getProjectContext();
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(ctx, null, 2) },
      ],
    };
  } catch {
    const projectFile = join(root, "project.godot");
    if (existsSync(projectFile)) {
      const content = readFileSync(projectFile, "utf-8");
      return {
        content: [
          {
            type: "text" as const,
            text: `[Godot not running — reading project.godot]\n\n${content}`,
          },
        ],
      };
    }
    return {
      content: [
        { type: "text" as const, text: "No Godot project found." },
      ],
      isError: true,
    };
  }
}

export function handleReadFile(
  root: string,
  path: string
): ToolResult {
  const fullPath = resolve(root, path);
  if (!fullPath.startsWith(resolve(root))) {
    return {
      content: [
        { type: "text" as const, text: "Error: path must be within project root." },
      ],
      isError: true,
    };
  }
  if (!existsSync(fullPath)) {
    return {
      content: [{ type: "text" as const, text: `File not found: ${path}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: readFileSync(fullPath, "utf-8") }],
  };
}

export function handleListFiles(
  root: string,
  directory?: string,
  pattern?: string
): ToolResult {
  const dir = resolve(root, directory || ".");
  if (!dir.startsWith(resolve(root))) {
    return {
      content: [
        { type: "text" as const, text: "Error: path must be within project root." },
      ],
      isError: true,
    };
  }
  if (!existsSync(dir)) {
    return {
      content: [
        { type: "text" as const, text: `Directory not found: ${directory}` },
      ],
      isError: true,
    };
  }

  const entries = readdirSync(dir);
  let files = entries.map((name) => {
    const full = join(dir, name);
    const isDir = statSync(full).isDirectory();
    return isDir ? `${name}/` : name;
  });

  if (pattern) {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    files = files.filter((f) => regex.test(f.replace("/", "")));
  }

  return {
    content: [
      { type: "text" as const, text: files.join("\n") || "(empty directory)" },
    ],
  };
}

// ==================== Docs tools ====================

export async function handleSearchDocs(
  root: string,
  query: string,
  version?: string,
  kind?: string,
  limit?: number
): Promise<ToolResult> {
  try {
    const ver = version || detectGodotVersion(root) || "4.3";
    const db = await ensureDocsReady(ver);
    const results = searchDocs(db, query, kind || "all", limit || 10);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No results for "${query}" in Godot ${ver} docs.`,
          },
        ],
      };
    }

    const formatted = results
      .map(
        (r) =>
          `[${r.kind}] ${r.class_name}.${r.symbol_name}\n  ${r.description}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Godot ${ver} docs — ${results.length} results:\n\n${formatted}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Docs search failed: ${error instanceof Error ? error.message : error}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetClassReference(
  root: string,
  className: string,
  version?: string
): Promise<ToolResult> {
  try {
    const ver = version || detectGodotVersion(root) || "4.3";
    const db = await ensureDocsReady(ver);
    const ref = getClassReference(db, className);

    if (!ref) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Class "${className}" not found in Godot ${ver} docs.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(ref, null, 2) },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed: ${error instanceof Error ? error.message : error}`,
        },
      ],
      isError: true,
    };
  }
}

// ==================== Memory tools ====================

export function handleSaveMemory(
  root: string,
  category: string,
  content: string
): ToolResult {
  try {
    appendMemory(root, category, content);
    const timestamp = new Date().toISOString();
    const db = ensureMemoryDb(root);
    indexMemoryEntry(db, timestamp, category, content);
    return {
      content: [
        {
          type: "text" as const,
          text: `Saved to ${category}: "${content}"`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to save: ${error instanceof Error ? error.message : error}`,
        },
      ],
      isError: true,
    };
  }
}

export function handleSearchMemory(
  root: string,
  query: string,
  limit?: number
): ToolResult {
  try {
    const db = ensureMemoryDb(root);
    const results = searchMemoryDb(db, query, limit || 10);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No memory entries for "${query}".`,
          },
        ],
      };
    }

    const formatted = results
      .map((r) => `[${r.category}] ${r.content}`)
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `${results.length} entries:\n\n${formatted}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Search failed: ${error instanceof Error ? error.message : error}`,
        },
      ],
      isError: true,
    };
  }
}

export function handleGetProjectMemory(root: string): ToolResult {
  try {
    const memory = readMemory(root);
    const db = ensureMemoryDb(root);
    const stats = getMemoryStats(db);
    const sizeKB = (getMemorySize(root) / 1024).toFixed(1);

    const header = `Memory: ${stats.total_entries} entries, ${sizeKB}KB, categories: ${stats.categories.join(", ") || "none"}`;

    return {
      content: [
        { type: "text" as const, text: `${header}\n\n${memory}` },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed: ${error instanceof Error ? error.message : error}`,
        },
      ],
      isError: true,
    };
  }
}

// ==================== Context ====================

export async function handleGetContext(
  root: string,
  bridge?: GodotBridge
): Promise<ToolResult> {
  const ctx = await buildContext(root, bridge);
  return { content: [{ type: "text" as const, text: ctx }] };
}

// ==================== Tool execution router ====================

const EDITOR_TOOL_NAMES = new Set([
  "create_scene", "get_scene_tree", "open_scene",
  "add_node", "set_property", "remove_node", "rename_node",
  "duplicate_node", "move_node",
  "create_script", "read_script", "edit_script",
  "run_scene", "stop_scene", "get_game_status", "take_screenshot",
  "execute_editor_script", "add_resource", "add_scene_instance",
  "save_scene", "get_node_properties", "connect_signal",
  "set_project_setting", "get_editor_errors",
]);

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  root: string,
  bridge: GodotBridge,
  blenderBridge?: BlenderBridge
): Promise<ToolResult> {
  // Editor tools — delegate to Godot plugin
  if (EDITOR_TOOL_NAMES.has(toolName)) {
    return editorTool(bridge, toolName, args);
  }

  // Blender tools — delegate to Blender addon
  if (toolName.startsWith("blender.") && blenderBridge) {
    try {
      const result = await blenderBridge.executeTool(blenderHandlerName(toolName), args);
      return {
        content: [{ type: "text" as const, text: result.result }],
        isError: result.is_error || false,
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  // Pipeline tools
  if (toolName.startsWith("pipeline.") && blenderBridge) {
    switch (toolName) {
      case "pipeline.blender_to_godot":
        return blenderToGodot(blenderBridge, bridge, root, args);
      case "pipeline.blender_to_godot_animated":
        return blenderToGodotAnimated(blenderBridge, bridge, root, args);
      case "pipeline.sync_collision":
        return syncCollision(blenderBridge, bridge, root, args);
      case "pipeline.batch_import":
        return batchImport(bridge, root, args);
    }
  }

  // Asset tools
  if (toolName === "assets.search_polyhaven") {
    return handleSearchPolyHaven(args);
  }
  if (toolName === "assets.download_polyhaven") {
    return handleDownloadPolyHaven(args, root);
  }
  if (toolName === "assets.search_sketchfab") {
    return handleSearchSketchfab(args);
  }
  if (toolName === "assets.download_sketchfab") {
    const cfg = new ConfigManager(root);
    return handleDownloadSketchfab(args, root, cfg);
  }
  if (toolName === "assets.search_opengameart") {
    return handleSearchOpenGameArt(args);
  }
  if (toolName === "assets.download_asset") {
    return handleDownloadAsset(args, root);
  }
  if (toolName === "assets.list_local") {
    return handleListLocalAssets(args, root);
  }

  // Blender docs tools
  if (toolName === "search_blender_docs" || toolName === "get_blender_class") {
    try {
      const { ensureBlenderDocs, searchBlenderDocs, getBlenderClassReference } = await import("./docs/blender-docs.js");
      const db = await ensureBlenderDocs();
      if (toolName === "search_blender_docs") {
        const results = searchBlenderDocs(db, args.query as string, (args.limit as number) || 10);
        if (results.length === 0) return { content: [{ type: "text" as const, text: `No Blender docs found for "${args.query}".` }] };
        const formatted = results.map((r) => `[${r.kind}] ${r.class_name}.${r.symbol_name}\n  ${r.description}`).join("\n\n");
        return { content: [{ type: "text" as const, text: `Blender API — ${results.length} results:\n\n${formatted}` }] };
      } else {
        const ref = getBlenderClassReference(db, args.class_name as string);
        if (!ref) return { content: [{ type: "text" as const, text: `Blender class "${args.class_name}" not found.` }], isError: true };
        return { content: [{ type: "text" as const, text: JSON.stringify(ref, null, 2) }] };
      }
    } catch (error) {
      return { content: [{ type: "text" as const, text: `Blender docs error: ${error instanceof Error ? error.message : error}` }], isError: true };
    }
  }

  // Config tools
  if (toolName === "get_service_status") {
    const cfg = new ConfigManager(root);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(cfg.getStatus(), null, 2) }],
    };
  }

  // Local tools
  switch (toolName) {
    case "get_project_context":
      return handleGetProjectContext(root, bridge);
    case "read_file":
      return handleReadFile(root, args.path as string);
    case "list_files":
      return handleListFiles(root, args.directory as string, args.pattern as string);
    case "search_docs":
      return handleSearchDocs(root, args.query as string, args.version as string, args.kind as string, args.limit as number);
    case "get_class_reference":
      return handleGetClassReference(root, args.class_name as string, args.version as string);
    case "save_memory":
      return handleSaveMemory(root, args.category as string, args.content as string);
    case "search_memory":
      return handleSearchMemory(root, args.query as string, args.limit as number);
    case "get_project_memory":
      return handleGetProjectMemory(root);
    default:
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}
