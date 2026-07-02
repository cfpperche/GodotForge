import { z } from "zod";
import { ToolContext } from "./types.js";

export function registerRuntimeTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  // --- Runtime tools (delegated to Godot plugin) ---

  regTool(
    "run_scene",
    "Run a scene in the Godot editor. If no path given, runs current or main scene.",
    {
      scene_path: z.string().optional().describe("Scene path (e.g. 'res://scenes/main.tscn')"),
    },
    async (args) => runTool("run_scene", args)
  );

  regTool(
    "stop_scene",
    "Stop the currently running scene in the Godot editor.",
    {},
    async () => runTool("stop_scene", {})
  );

  regTool(
    "get_game_status",
    "Check if a scene is running in Godot and which scene it is.",
    {},
    async () => runTool("get_game_status", {})
  );

  regTool(
    "take_screenshot",
    "Take a screenshot. If a game is running, captures the game window; otherwise captures the editor viewport.",
    {
      output_path: z.string().optional().describe("Save path (default: res://.godotforge/screenshot.png)"),
    },
    async (args) => runTool("take_screenshot", args)
  );

  regTool(
    "take_game_screenshot",
    "Take a screenshot of the RUNNING game window (not editor). Requires a scene to be playing via run_scene.",
    {
      output_path: z.string().optional().describe("Save path (default: res://.godotforge/game_screenshot.png)"),
    },
    async (args) => runTool("take_game_screenshot", args)
  );

  regTool(
    "get_runtime_state",
    "Get runtime scene tree state of the running game: node types, positions, visibility, text values, velocities.",
    {
      node_path: z.string().optional().describe("Filter results to nodes matching this path substring"),
    },
    async (args) => runTool("get_runtime_state", args)
  );

  regTool(
    "simulate_input",
    "Simulate an input action in the running game (press + release). Use to play-test games autonomously.",
    {
      action: z.string().describe("Input action name (e.g. 'flap', 'jump', 'ui_accept')"),
      duration_ms: z.number().optional().describe("How long to hold the action in ms (default: 100)"),
    },
    async (args) => runTool("simulate_input", args)
  );

  regTool(
    "simulate_input_sequence",
    "Execute a timed sequence of inputs in the running game. Single HTTP call, game-side timing. Each step is either an input action or a positioned mouse click (for click-to-move/UI testing).",
    {
      sequence: z.array(z.object({
        action: z.string().optional().describe("Input action name (omit when using mouse_click)"),
        mouse_click: z.object({
          x: z.number().describe("Viewport X coordinate in pixels"),
          y: z.number().describe("Viewport Y coordinate in pixels"),
          button: z.enum(["left", "right", "middle", "wheel_up", "wheel_down"]).optional()
            .describe("Mouse button (default: left)"),
          double_click: z.boolean().optional().describe("Send as double click (default: false)"),
        }).optional().describe("Positioned mouse click (omit when using action)"),
        delay_ms: z.number().optional().describe("Delay before this step in ms (default: 0 = immediate)"),
      })).describe("Array of timed input steps"),
    },
    async (args) => runTool("simulate_input_sequence", args)
  );
}
