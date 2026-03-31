import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GodotBridge } from "./bridge.js";
import { BlenderBridge } from "./blender-bridge.js";
import { ConfigManager } from "./config.js";
import { executeTool, setEventLog, setWebhookDispatcher, setConfirmationManager, setGuardrailMode } from "./tool-handlers.js";
import { EventLog } from "./events.js";
import { WebhookDispatcher } from "./webhooks.js";
import { ConfirmationManager } from "./confirmations.js";
import { registerTool } from "./tool-registry.js";
import { registerEditorTools } from "./tools/editor.js";
import { registerRuntimeTools } from "./tools/runtime.js";
import { registerLocalTools } from "./tools/local.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerBlenderTools } from "./tools/blender.js";
import { registerPipelineTools } from "./tools/pipeline.js";
import { registerMeshyTools } from "./tools/ai/meshy.js";
import { registerStabilityTools } from "./tools/ai/stability.js";
import { registerOtherAITools } from "./tools/ai/other.js";
import { registerFalTools } from "./tools/ai/fal.js";

export interface ServerHandle {
  server: McpServer;
  updateProjectRoot: (newRoot: string) => void;
}

export function createServer(projectRoot?: string, blenderBridge?: BlenderBridge, configManager?: ConfigManager): ServerHandle {
  const bridge = new GodotBridge(projectRoot);
  const blender = blenderBridge || new BlenderBridge(projectRoot);
  const state = { root: projectRoot || process.cwd() };
  const config = configManager || new ConfigManager(state.root);

  // Initialize guardrails, event log, webhooks, confirmations
  const eventLog = new EventLog(state.root);
  const webhooks = new WebhookDispatcher(config);
  const confirmations = new ConfirmationManager();
  confirmations.setWebhooks(webhooks);
  setEventLog(eventLog);
  setWebhookDispatcher(webhooks);
  setConfirmationManager(confirmations);
  const chatSettings = config.getChatSettings();
  setGuardrailMode((chatSettings.guardrail_mode as "yolo" | "normal" | "strict") || "normal");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runTool = async (name: string, args: Record<string, unknown>): Promise<any> => {
    const result = await executeTool(name, args, state.root, bridge, blender, config);
    return { content: result.content, isError: result.isError };
  };

  const server = new McpServer({ name: "godotforge", version: "0.2.0" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function regTool(name: string, description: string, schema: Record<string, z.ZodTypeAny>, handler: (args: any) => Promise<any>): void {
    server.tool(name, description, schema, handler);
    registerTool(name, description, schema);
  }

  const ctx = { regTool, runTool };

  // Register all tools from extracted modules
  registerEditorTools(ctx);
  registerRuntimeTools(ctx);
  registerLocalTools(ctx);
  registerAssetTools(ctx);
  registerBlenderTools(ctx, blender, state.root, bridge, config);
  registerPipelineTools(ctx);
  registerMeshyTools(ctx);
  registerStabilityTools(ctx);
  registerOtherAITools(ctx);
  registerFalTools(ctx);

  return {
    server,
    updateProjectRoot: (newRoot: string) => { state.root = newRoot; },
  };
}
