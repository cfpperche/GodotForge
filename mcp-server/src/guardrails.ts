export type RiskLevel = "safe" | "moderate" | "destructive" | "critical";

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  risk: RiskLevel;
}

const RISK_MAP: Record<string, RiskLevel> = {
  // Safe — read-only or non-destructive queries
  get_scene_tree: "safe",
  get_node_properties: "safe",
  get_game_status: "safe",
  get_project_context: "safe",
  get_editor_errors: "safe",
  get_runtime_state: "safe",
  read_script: "safe",
  read_file: "safe",
  list_files: "safe",
  search_docs: "safe",
  get_class_reference: "safe",
  search_blender_docs: "safe",
  get_blender_class: "safe",
  search_memory: "safe",
  get_project_memory: "safe",
  get_service_status: "safe",
  take_screenshot: "safe",
  take_game_screenshot: "safe",
  open_scene: "safe",
  "assets.search_polyhaven": "safe",
  "assets.search_sketchfab": "safe",
  "assets.search_opengameart": "safe",
  "assets.list_local": "safe",
  blender_get_scene_objects: "safe",
  blender_get_object_properties: "safe",
  blender_get_blender_info: "safe",
  blender_list_materials: "safe",
  blender_list_animations: "safe",

  // Moderate — creates or modifies content
  create_scene: "moderate",
  add_node: "moderate",
  rename_node: "moderate",
  duplicate_node: "moderate",
  move_node: "moderate",
  set_property: "moderate",
  create_script: "moderate",
  edit_script: "moderate",
  save_scene: "moderate",
  add_resource: "moderate",
  add_scene_instance: "moderate",
  connect_signal: "moderate",
  save_memory: "moderate",
  run_scene: "moderate",
  stop_scene: "moderate",
  simulate_input: "moderate",
  simulate_input_sequence: "moderate",
  blender_create_mesh: "moderate",
  blender_create_material: "moderate",
  blender_assign_material: "moderate",
  blender_transform: "moderate",
  blender_modify: "moderate",
  blender_create_armature: "moderate",
  blender_add_bone: "moderate",
  blender_insert_keyframe: "moderate",
  blender_set_camera: "moderate",
  blender_set_light: "moderate",
  blender_export_gltf: "moderate",
  blender_export_for_godot: "moderate",
  blender_export_with_animations: "moderate",
  blender_export_fbx: "moderate",
  blender_unwrap_uv: "moderate",
  blender_render_image: "moderate",
  "pipeline.blender_to_godot": "moderate",
  "pipeline.blender_to_godot_animated": "moderate",
  "pipeline.sync_collision": "moderate",
  "pipeline.batch_import": "moderate",
  "assets.download_polyhaven": "moderate",
  "assets.download_sketchfab": "moderate",
  "assets.download_asset": "moderate",

  // Destructive — removes content or changes critical state
  remove_node: "destructive",
  blender_delete_object: "destructive",
  blender_delete_material: "destructive",
  blender_boolean: "destructive",
  blender_join_objects: "destructive",
  blender_separate_mesh: "destructive",

  // AI generation — moderate (costs credits, creates content)
  "ai.meshy_text_to_3d": "moderate",
  "ai.meshy_refine": "moderate",
  "ai.meshy_image_to_3d": "moderate",
  "ai.meshy_multi_image_to_3d": "moderate",
  "ai.meshy_remesh": "moderate",
  "ai.meshy_retexture": "moderate",
  "ai.meshy_check_task": "safe",
  "ai.meshy_balance": "safe",

  // Critical — arbitrary code execution or project-wide settings
  execute_editor_script: "critical",
  blender_execute_python: "critical",
  set_project_setting: "moderate",
};

const BLOCKED_GD_PATTERNS = [
  /OS\.execute/i,
  /DirAccess\.remove/i,
  /FileAccess\.open.*WRITE/i,
  /\.queue_free\(\)/,
];

const BLOCKED_PY_PATTERNS = [
  /os\.system/,
  /subprocess\./,
  /shutil\.rmtree/,
  /os\.remove/,
  /eval\s*\(/,
  /exec\s*\(/,
];

export function checkGuardrails(toolName: string, args: Record<string, unknown>): GuardrailResult {
  const risk = RISK_MAP[toolName] || "moderate";

  // Safe tools always pass
  if (risk === "safe") {
    return { allowed: true, risk };
  }

  // Critical tools: content validation
  if (toolName === "execute_editor_script") {
    const code = (args.code as string) || "";
    for (const pattern of BLOCKED_GD_PATTERNS) {
      if (pattern.test(code)) {
        return { allowed: false, risk, reason: `Blocked: script contains dangerous pattern: ${pattern.source}` };
      }
    }
  }

  if (toolName === "blender_execute_python") {
    const code = (args.code as string) || (args.script as string) || "";
    for (const pattern of BLOCKED_PY_PATTERNS) {
      if (pattern.test(code)) {
        return { allowed: false, risk, reason: `Blocked: Python script contains dangerous pattern: ${pattern.source}` };
      }
    }
  }

  // remove_node: prevent removing root
  if (toolName === "remove_node") {
    const nodePath = (args.node_path as string) || "";
    if (nodePath === "/" || nodePath === "." || !nodePath.includes("/")) {
      return { allowed: false, risk, reason: "Cannot remove root node" };
    }
  }

  return { allowed: true, risk };
}
