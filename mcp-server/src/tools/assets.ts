import { z } from "zod";
import type { ToolContext } from "./types.js";

export function registerAssetTools(ctx: ToolContext): void {
  const { regTool, runTool } = ctx;

  regTool(
    "assets.search_polyhaven",
    "Search Poly Haven for free textures, 3D models, and HDRIs. No API key needed.",
    {
      type: z.enum(["hdris", "textures", "models", "all"]).optional().describe("Asset type (default: all)"),
      categories: z.string().optional().describe("Filter by categories (comma-separated)"),
    },
    async (args) => runTool("assets.search_polyhaven", args)
  );

  regTool(
    "assets.download_polyhaven",
    "Download a Poly Haven asset (texture, model, or HDRI) into the project.",
    {
      asset_id: z.string().describe("Asset ID from search results"),
      resolution: z.string().optional().describe("Resolution (1k, 2k, 4k — default: 1k)"),
      format: z.string().optional().describe("File format (jpg, png, exr, gltf — default: jpg)"),
      target_dir: z.string().optional().describe("Target directory (default: assets/textures)"),
    },
    async (args) => runTool("assets.download_polyhaven", args)
  );

  regTool(
    "assets.search_sketchfab",
    "Search Sketchfab for downloadable 3D models.",
    {
      query: z.string().describe("Search query"),
      downloadable: z.boolean().optional().describe("Only downloadable models (default: true)"),
      animated: z.boolean().optional().describe("Only animated models"),
      count: z.number().optional().describe("Results count (default: 10)"),
    },
    async (args) => runTool("assets.search_sketchfab", args)
  );

  regTool(
    "assets.download_sketchfab",
    "Download a Sketchfab model (GLTF) into the project. Requires Sketchfab API token.",
    {
      uid: z.string().describe("Model UID from search results"),
      target_dir: z.string().optional().describe("Target directory (default: assets/models)"),
    },
    async (args) => runTool("assets.download_sketchfab", args)
  );

  regTool(
    "assets.search_opengameart",
    "Search OpenGameArt.org for free sprites, 3D models, sounds, and music.",
    {
      query: z.string().describe("Search query"),
      type: z.enum(["2d", "3d", "music", "sound"]).optional().describe("Filter by asset type"),
    },
    async (args) => runTool("assets.search_opengameart", args)
  );

  regTool(
    "assets.download_asset",
    "Download any asset from a URL into the project. Triggers Godot filesystem rescan.",
    {
      url: z.string().describe("Direct download URL"),
      target_dir: z.string().optional().describe("Target directory (default: assets/downloads)"),
      file_name: z.string().optional().describe("Override filename"),
    },
    async (args) => runTool("assets.download_asset", args)
  );

  regTool(
    "assets.list_local",
    "List downloaded assets in the project with type and size.",
    {
      directory: z.string().optional().describe("Directory to scan (default: assets)"),
      type: z.enum(["texture", "model", "audio", "scene", "script", "material"]).optional().describe("Filter by asset type"),
    },
    async (args) => runTool("assets.list_local", args)
  );

  // ==================== ambientCG ====================

  regTool(
    "assets.search_ambientcg",
    "Search ambientCG for free PBR materials, HDRIs, and 3D models (CC0 license). No API key needed.",
    {
      q: z.string().optional().describe("Search query (e.g. 'brick', 'wood floor', 'metal')"),
      type: z.enum(["Material", "HDRI", "3DModel", "Substance", "Decal", "Terrain"]).optional().describe("Filter by asset type"),
      sort: z.enum(["Popular", "Latest", "Alphabetically", "Downloads"]).optional().describe("Sort order (default: Popular)"),
      limit: z.number().optional().describe("Results per page (default: 20)"),
      offset: z.number().optional().describe("Pagination offset"),
      method: z.enum(["PBRPhotogrammetry", "PBRApproximated", "PBRProcedural", "PlainPhoto", "UnknownOrOther"]).optional().describe("Filter by creation method"),
    },
    async (args) => runTool("assets.search_ambientcg", args)
  );

  regTool(
    "assets.download_ambientcg",
    "Download an ambientCG PBR material/HDRI/model. Extracts ZIP with texture maps to project.",
    {
      asset_id: z.string().describe("Asset ID from search results (e.g. 'Metal063', 'WoodFloor051')"),
      resolution: z.enum(["1K", "2K", "4K", "8K", "12K"]).optional().describe("Texture resolution (default: 1K)"),
      format: z.enum(["JPG", "PNG", "EXR"]).optional().describe("Image format (default: JPG). EXR for HDRIs."),
      target_dir: z.string().optional().describe("Target directory (default: assets/textures/ambientcg)"),
    },
    async (args) => runTool("assets.download_ambientcg", args)
  );

  // ==================== Godot Asset Library ====================

  regTool(
    "assets.search_godot_library",
    "Search the official Godot Asset Library for addons, plugins, and project templates. No API key needed.",
    {
      filter: z.string().optional().describe("Search text"),
      type: z.enum(["addon", "project"]).optional().describe("Asset type filter"),
      category: z.number().optional().describe("Category ID (1=2D Tools, 2=3D Tools, 3=Shaders, 4=Materials, 5=Tools, 6=Scripts, 7=Misc)"),
      godot_version: z.string().optional().describe("Godot version filter (e.g. '4.2', '4.1')"),
      sort: z.enum(["updated", "name", "rating", "cost"]).optional().describe("Sort order (default: updated)"),
      page: z.number().optional().describe("Page number (0-based)"),
      page_length: z.number().optional().describe("Results per page (default: 20, max: 500)"),
      support: z.string().optional().describe("Support level filter: 'official', 'community', 'testing' (combine with '+')"),
      user: z.string().optional().describe("Filter by author username"),
    },
    async (args) => runTool("assets.search_godot_library", args)
  );

  regTool(
    "assets.download_godot_library",
    "Download and extract an addon/project from the Godot Asset Library into the project.",
    {
      asset_id: z.string().describe("Asset ID from search results"),
      target_dir: z.string().optional().describe("Target directory (default: addons)"),
    },
    async (args) => runTool("assets.download_godot_library", args)
  );

  // ==================== Freesound ====================

  regTool(
    "assets.search_freesound",
    "Search Freesound.org for sound effects and music (500K+ sounds). Requires Freesound API key.",
    {
      query: z.string().describe("Search terms (supports +/- modifiers, quoted phrases)"),
      filter: z.string().optional().describe("Solr filter syntax: 'duration:[0.5 TO 5.0]', 'tag:explosion', 'type:(wav OR flac)', 'license:\"Attribution\"', 'channels:1', 'samplerate:44100'"),
      sort: z.enum(["score", "duration_desc", "duration_asc", "created_desc", "created_asc", "downloads_desc", "downloads_asc", "rating_desc", "rating_asc"]).optional().describe("Sort order (default: score)"),
      fields: z.string().optional().describe("Comma-separated fields to return"),
      page: z.number().optional().describe("Page number (1-based)"),
      page_size: z.number().optional().describe("Results per page (default: 20, max: 150)"),
      group_by_pack: z.boolean().optional().describe("Collapse results by pack"),
    },
    async (args) => runTool("assets.search_freesound", args)
  );

  regTool(
    "assets.preview_freesound",
    "Download a Freesound HQ preview (MP3/OGG ~128kbps). No OAuth needed, just API key.",
    {
      sound_id: z.number().describe("Sound ID from search results"),
      format: z.enum(["mp3", "ogg"]).optional().describe("Preview format (default: mp3)"),
      target_dir: z.string().optional().describe("Target directory (default: assets/audio/freesound)"),
    },
    async (args) => runTool("assets.preview_freesound", args)
  );

  regTool(
    "assets.download_freesound",
    "Download original Freesound file (requires OAuth2 token). For easier access, use assets.preview_freesound instead.",
    {
      sound_id: z.number().describe("Sound ID from search results"),
      oauth_token: z.string().optional().describe("OAuth2 Bearer token (required for original download)"),
      target_dir: z.string().optional().describe("Target directory (default: assets/audio/freesound)"),
    },
    async (args) => runTool("assets.download_freesound", args)
  );

  // ==================== jsfxr ====================

  regTool(
    "assets.generate_sfx",
    "Generate retro 8-bit sound effects locally using jsfxr. No API key needed, runs offline.",
    {
      preset: z.enum(["pickupCoin", "laserShoot", "explosion", "powerUp", "hitHurt", "jump", "blipSelect", "synth", "tone", "click", "random"]).describe("Sound effect preset category"),
      filename: z.string().optional().describe("Output filename (default: {preset}_{timestamp}.wav)"),
      wave_type: z.number().optional().describe("Waveform: 0=Square, 1=Sawtooth, 2=Sine, 3=Noise"),
      p_env_attack: z.number().optional().describe("Attack time [0,1]"),
      p_env_sustain: z.number().optional().describe("Sustain time [0,1]"),
      p_env_punch: z.number().optional().describe("Sustain punch [0,1]"),
      p_env_decay: z.number().optional().describe("Decay time [0,1]"),
      p_base_freq: z.number().optional().describe("Start frequency [0,1]"),
      p_freq_limit: z.number().optional().describe("Min frequency cutoff [0,1]"),
      p_freq_ramp: z.number().optional().describe("Frequency slide [-1,1]"),
      p_freq_dramp: z.number().optional().describe("Frequency delta slide [-1,1]"),
      p_vib_strength: z.number().optional().describe("Vibrato depth [0,1]"),
      p_vib_speed: z.number().optional().describe("Vibrato speed [0,1]"),
      p_arp_mod: z.number().optional().describe("Arpeggio change amount [-1,1]"),
      p_arp_speed: z.number().optional().describe("Arpeggio change speed [0,1]"),
      p_duty: z.number().optional().describe("Square duty cycle [0,1]"),
      p_duty_ramp: z.number().optional().describe("Duty sweep [-1,1]"),
      p_repeat_speed: z.number().optional().describe("Retrigger speed [0,1]"),
      p_pha_offset: z.number().optional().describe("Flanger offset [-1,1]"),
      p_pha_ramp: z.number().optional().describe("Flanger sweep [-1,1]"),
      p_lpf_freq: z.number().optional().describe("Low-pass filter cutoff [0,1]"),
      p_lpf_ramp: z.number().optional().describe("Low-pass filter sweep [-1,1]"),
      p_lpf_resonance: z.number().optional().describe("Low-pass resonance [0,1]"),
      p_hpf_freq: z.number().optional().describe("High-pass filter cutoff [0,1]"),
      p_hpf_ramp: z.number().optional().describe("High-pass filter sweep [-1,1]"),
      sound_vol: z.number().optional().describe("Master volume (default: 0.5)"),
      sample_rate: z.number().optional().describe("Sample rate: 44100, 22050, 11025, or 8000"),
      sample_size: z.number().optional().describe("Bit depth: 8 or 16"),
      target_dir: z.string().optional().describe("Target directory (default: assets/audio/sfx)"),
    },
    async (args) => runTool("assets.generate_sfx", args)
  );
}
