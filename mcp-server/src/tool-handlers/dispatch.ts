import { GodotBridge } from "../bridge.js";
import { BlenderBridge } from "../blender-bridge.js";
import { blenderHandlerName } from "../blender-tools.js";
import { blenderToGodot, blenderToGodotAnimated, syncCollision, batchImport } from "../pipeline.js";
import { ConfigManager } from "../config.js";
import { handleSearchPolyHaven, handleDownloadPolyHaven, handleSearchSketchfab, handleDownloadSketchfab, handleSearchOpenGameArt, handleDownloadAsset, handleListLocalAssets } from "../assets/handlers.js";
import { editorTool, EDITOR_TOOL_NAMES } from "../tool-handlers.js";
import type { ToolResult } from "../tool-handlers.js";
import {
  handleGetProjectContext,
  handleReadFile,
  handleListFiles,
  handleSearchDocs,
  handleGetClassReference,
  handleSaveMemory,
  handleSearchMemory,
  handleGetProjectMemory,
} from "./local-handlers.js";

export async function executeToolInner(
  toolName: string,
  args: Record<string, unknown>,
  root: string,
  bridge: GodotBridge,
  blenderBridge?: BlenderBridge,
  config?: ConfigManager
): Promise<ToolResult> {
  // Shared ConfigManager instance — avoid re-reading config.json per tool call
  const cfg = config ?? new ConfigManager(root);

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
  if (toolName === "assets.search_polyhaven") return handleSearchPolyHaven(args);
  if (toolName === "assets.download_polyhaven") return handleDownloadPolyHaven(args, root);
  if (toolName === "assets.search_sketchfab") return handleSearchSketchfab(args);
  if (toolName === "assets.download_sketchfab") return handleDownloadSketchfab(args, root, cfg);
  if (toolName === "assets.search_opengameart") return handleSearchOpenGameArt(args);
  if (toolName === "assets.download_asset") return handleDownloadAsset(args, root);
  if (toolName === "assets.list_local") return handleListLocalAssets(args, root);

  // AI generation tools (Meshy)
  if (toolName.startsWith("ai.meshy_")) {
    const h = await import("../ai/handlers.js");
    switch (toolName) {
      case "ai.meshy_text_to_3d": return h.handleMeshyTextTo3D(args, root, cfg);
      case "ai.meshy_refine": return h.handleMeshyRefine(args, root, cfg);
      case "ai.meshy_image_to_3d": return h.handleMeshyImageTo3D(args, root, cfg);
      case "ai.meshy_multi_image_to_3d": return h.handleMeshyMultiImageTo3D(args, root, cfg);
      case "ai.meshy_remesh": return h.handleMeshyRemesh(args, root, cfg);
      case "ai.meshy_retexture": return h.handleMeshyRetexture(args, root, cfg);
      case "ai.meshy_check_task": return h.handleMeshyCheckTask(args, cfg);
      case "ai.meshy_balance": return h.handleMeshyBalance(cfg);
    }
  }

  // AI generation tools (Blockade Labs)
  if (toolName.startsWith("ai.blockade_")) {
    const b = await import("../ai/blockade-handlers.js");
    switch (toolName) {
      case "ai.blockade_generate_skybox": return b.handleBlockadeGenerateSkybox(args, root, cfg);
      case "ai.blockade_list_styles": return b.handleBlockadeListStyles(args, cfg);
      case "ai.blockade_check_task": return b.handleBlockadeCheckTask(args, cfg);
    }
  }

  // AI generation tools (ElevenLabs)
  if (toolName.startsWith("ai.elevenlabs_")) {
    const e = await import("../ai/elevenlabs-handlers.js");
    switch (toolName) {
      case "ai.elevenlabs_tts": return e.handleElevenLabsTTS(args, root, cfg);
      case "ai.elevenlabs_sound_effect": return e.handleElevenLabsSoundEffect(args, root, cfg);
      case "ai.elevenlabs_list_voices": return e.handleElevenLabsListVoices(args, cfg);
      case "ai.elevenlabs_list_models": return e.handleElevenLabsListModels(cfg);
    }
  }

  // AI generation tools (Rodin / Hyper3D)
  if (toolName.startsWith("ai.rodin_")) {
    const r = await import("../ai/rodin-handlers.js");
    switch (toolName) {
      case "ai.rodin_generate": return r.handleRodinGenerate(args, root, cfg);
      case "ai.rodin_check_task": return r.handleRodinCheckTask(args, cfg);
    }
  }

  // AI generation tools (Tripo AI)
  if (toolName.startsWith("ai.tripo_")) {
    const t = await import("../ai/tripo-handlers.js");
    switch (toolName) {
      case "ai.tripo_text_to_3d": return t.handleTripoTextTo3D(args, root, cfg);
      case "ai.tripo_image_to_3d": return t.handleTripoImageTo3D(args, root, cfg);
      case "ai.tripo_refine": return t.handleTripoRefine(args, root, cfg);
      case "ai.tripo_animate": return t.handleTripoAnimate(args, root, cfg);
      case "ai.tripo_stylize": return t.handleTripoStylize(args, root, cfg);
      case "ai.tripo_check_task": return t.handleTripoCheckTask(args, cfg);
      case "ai.tripo_balance": return t.handleTripoBalance(cfg);
    }
  }

  // AI generation tools (OpenAI DALL-E)
  if (toolName.startsWith("ai.dalle_")) {
    const d = await import("../ai/openai-dalle-handlers.js");
    switch (toolName) {
      case "ai.dalle_generate": return d.handleDalleGenerate(args, root, cfg);
      case "ai.dalle_edit": return d.handleDalleEdit(args, root, cfg);
      case "ai.dalle_variation": return d.handleDalleVariation(args, root, cfg);
    }
  }

  // AI generation tools (Suno Music)
  if (toolName.startsWith("ai.suno_")) {
    const s = await import("../ai/suno-handlers.js");
    switch (toolName) {
      case "ai.suno_generate": return s.handleSunoGenerate(args, root, cfg);
      case "ai.suno_lyrics": return s.handleSunoLyrics(args, cfg);
      case "ai.suno_check_task": return s.handleSunoCheckTask(args, cfg);
      case "ai.suno_credits": return s.handleSunoCredits(cfg);
    }
  }

  // AI generation tools (Hugging Face)
  if (toolName.startsWith("ai.huggingface_")) {
    const hf = await import("../ai/huggingface-handlers.js");
    switch (toolName) {
      case "ai.huggingface_text_to_image": return hf.handleHFTextToImage(args, root, cfg);
    }
  }

  // AI generation tools (Stability AI)
  if (toolName.startsWith("ai.stability_")) {
    const s = await import("../ai/stability-handlers.js");
    switch (toolName) {
      case "ai.stability_generate": return s.handleStabilityGenerate(args, root, cfg);
      case "ai.stability_generate_ultra": return s.handleStabilityGenerateUltra(args, root, cfg);
      case "ai.stability_generate_core": return s.handleStabilityGenerateCore(args, root, cfg);
      case "ai.stability_inpaint": return s.handleStabilityInpaint(args, root, cfg);
      case "ai.stability_outpaint": return s.handleStabilityOutpaint(args, root, cfg);
      case "ai.stability_search_replace": return s.handleStabilitySearchReplace(args, root, cfg);
      case "ai.stability_recolor": return s.handleStabilityRecolor(args, root, cfg);
      case "ai.stability_erase": return s.handleStabilityErase(args, root, cfg);
      case "ai.stability_remove_bg": return s.handleStabilityRemoveBg(args, root, cfg);
      case "ai.stability_upscale_fast": return s.handleStabilityUpscaleFast(args, root, cfg);
      case "ai.stability_sketch": return s.handleStabilitySketch(args, root, cfg);
      case "ai.stability_style": return s.handleStabilityStyle(args, root, cfg);
      case "ai.stability_balance": return s.handleStabilityBalance(cfg);
    }
  }

  // AI generation tools (fal.ai gateway)
  if (toolName.startsWith("ai.fal_")) {
    const cfg = config ?? new ConfigManager(root);
    const f = await import("../ai/fal-handlers.js");
    switch (toolName) {
      case "ai.fal_flux_pro": return f.handleFalFluxPro(args, root, cfg);
      case "ai.fal_flux_schnell": return f.handleFalFluxSchnell(args, root, cfg);
      case "ai.fal_sd35": return f.handleFalSD35(args, root, cfg);
      case "ai.fal_sdxl": return f.handleFalSDXL(args, root, cfg);
      case "ai.fal_rodin": return f.handleFalRodin(args, root, cfg);
      case "ai.fal_tripo": return f.handleFalTripo(args, root, cfg);
      case "ai.fal_trellis": return f.handleFalTrellis(args, root, cfg);
      case "ai.fal_hunyuan3d": return f.handleFalHunyuan3D(args, root, cfg);
      case "ai.fal_stable_audio": return f.handleFalStableAudio(args, root, cfg);
      case "ai.fal_kokoro_tts": return f.handleFalKokoroTTS(args, root, cfg);
      case "ai.fal_upscale": return f.handleFalUpscale(args, root, cfg);
      case "ai.fal_remove_bg": return f.handleFalRemoveBg(args, root, cfg);
    }
  }

  // Blender docs tools
  if (toolName === "search_blender_docs" || toolName === "get_blender_class") {
    try {
      const { ensureBlenderDocs, searchBlenderDocs, getBlenderClassReference } = await import("../docs/blender-docs.js");
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
