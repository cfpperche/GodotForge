# Blender MCP Servers & Godot Integration Research

**Date**: 2026-03-27

---

## 1. All Existing Blender MCP Servers

### A. ahujasid/blender-mcp (The Original)
- **GitHub**: https://github.com/ahujasid/blender-mcp
- **Stars**: Most popular Blender MCP, the de facto standard
- **Architecture**: Blender addon (socket server on port 9876) + Python MCP server (stdio)
- **Communication**: TCP socket JSON between addon and MCP server; stdio for MCP client communication
- **22 MCP Tools**:
  1. `get_scene_info` - Scene details
  2. `get_object_info` - Specific object info
  3. `get_viewport_screenshot` - Viewport capture
  4. `execute_blender_code` - Run arbitrary Python/bpy code in Blender
  5. `get_polyhaven_categories` - PolyHaven asset categories
  6. `search_polyhaven_assets` - Search PolyHaven
  7. `download_polyhaven_asset` - Download/import PolyHaven assets
  8. `set_texture` - Apply texture to object
  9. `get_polyhaven_status` - PolyHaven integration status
  10. `get_hyper3d_status` - Hyper3D status
  11. `get_sketchfab_status` - Sketchfab status
  12. `search_sketchfab_models` - Search Sketchfab
  13. `get_sketchfab_model_preview` - Sketchfab thumbnail
  14. `download_sketchfab_model` - Download Sketchfab model
  15. `generate_hyper3d_model_via_text` - Text-to-3D via Hyper3D Rodin
  16. `generate_hyper3d_model_via_images` - Image-to-3D via Hyper3D
  17. `poll_rodin_job_status` - Check Hyper3D job
  18. `import_generated_asset` - Import Hyper3D asset
  19. `get_hunyuan3d_status` - Hunyuan3D status
  20. `generate_hunyuan3d_model` - Generate via Hunyuan3D
  21. `poll_hunyuan_job_status` - Check Hunyuan3D job
  22. `import_generated_asset_hunyuan` - Import Hunyuan3D asset
- **Key insight**: The `execute_blender_code` tool is the most powerful -- it runs arbitrary bpy Python, meaning ANY Blender operation is possible. The other tools are convenience wrappers + AI service integrations.

### B. poly-mcp/Blender-MCP-Server (also ICClearly/blender-mcp-server)
- **GitHub**: https://github.com/poly-mcp/Blender-MCP-Server
- **Also at**: https://github.com/ICClearly/blender-mcp-server
- **Tools**: 51+ tools
- **Communication**: HTTP/REST via FastAPI on localhost:8000
- **13 Tool Categories**:
  1. **Object Operations** - Create, delete, duplicate, select objects
  2. **Transformations** - Move, rotate, scale, apply transforms
  3. **Materials & Shading** - Create materials, add textures, shader nodes
  4. **Modeling** - Add modifiers, boolean operations, mesh editing
  5. **Animation** - Keyframes, timeline control, NLA editor
  6. **Camera & Lighting** - Camera setup, light creation, HDRI
  7. **Rendering** - Render settings, output configuration, rendering
  8. **Physics** - Rigid body, cloth, fluid simulations
  9. **Geometry Nodes** - Procedural generation, node trees
  10. **File Operations** - Import/export (FBX, OBJ, USD, GLTF, etc.)
  11. **Scene Management** - Scene info, cleanup, optimization
  12. **Batch Operations** - Multi-object manipulation
  13. **Advanced** - Particle systems, force fields, grease pencil
- **Key difference**: Much more granular tool set than ahujasid's version. Uses HTTP instead of stdio. Designed for PolyMCP orchestration.

### C. CommonSenseMachines/blender-mcp
- **GitHub**: https://github.com/CommonSenseMachines/blender-mcp
- **Focus**: Text/image to 4D worlds via CSM.ai integration
- **Specialty**: AI-generated 3D content creation, not general Blender control

### D. dhakalnirajan/blender-open-mcp
- **GitHub**: https://github.com/dhakalnirajan/blender-open-mcp
- **Focus**: Local AI models via Ollama (not cloud-dependent)
- **Use case**: Privacy-focused Blender MCP with local LLMs

### E. patrykiti/blender-ai-mcp
- **GitHub**: https://github.com/patrykiti/blender-ai-mcp
- **Architecture**: FastMCP server + Blender addon via bpy

### F. chiman45/Blender-MCP
- **GitHub**: https://github.com/chiman45/Blender-MCP
- **Focus**: Universal MCP client + specialized Blender integration

### G. tahooki/unreal-blender-mcp (Multi-Engine)
- **GitHub**: https://github.com/tahooki/unreal-blender-mcp
- **Key relevance**: Unified MCP controlling BOTH Blender and Unreal Engine
- **Architecture pattern** (see Section 5 below)

**Total**: At least 17 Blender MCP servers exist according to PulseMCP directory (https://www.pulsemcp.com/servers?q=blender)

---

## 2. Tools Blender MCPs Expose (Comprehensive)

### Core Blender Operations (via bpy)

| Category | Operations | Exposed By |
|----------|-----------|------------|
| **3D Modeling** | Create primitives, extrude, subdivide, boolean ops, mesh editing, modifiers | poly-mcp (dedicated tools), ahujasid (via execute_blender_code) |
| **Materials/Shaders** | Create materials, shader nodes, texture application, PBR setup | Both |
| **UV Mapping** | UV unwrap, UV editing | poly-mcp (via modeling tools), ahujasid (via code execution) |
| **Animation** | Keyframes, timeline, NLA editor, armatures | poly-mcp (dedicated), ahujasid (via code) |
| **Rigging** | Armature creation, bone setup, weight painting | Via code execution |
| **Rendering** | Render image, camera setup, render settings, output config | Both |
| **Scene Management** | Scene info, object listing, cleanup, optimization | Both |
| **Export** | GLTF, FBX, OBJ, USD export | poly-mcp (dedicated), ahujasid (via code) |
| **Texture Baking** | Bake textures to images | Via code execution |
| **Sculpting** | Sculpt mode operations | Via code execution |
| **Particle Systems** | Particle emitters, force fields | poly-mcp (dedicated) |
| **Physics** | Rigid body, cloth, fluid | poly-mcp (dedicated) |
| **Geometry Nodes** | Procedural generation, node trees | poly-mcp (dedicated) |
| **Camera & Lighting** | Camera placement, light creation, HDRI | Both |
| **Asset Libraries** | PolyHaven, Sketchfab, Hyper3D, Hunyuan3D | ahujasid (dedicated integrations) |

### Key Insight
The ahujasid/blender-mcp approach is minimalist: a few structured tools + `execute_blender_code` for everything else. The poly-mcp approach provides 51+ granular tools. For a Godot integration, the `execute_blender_code` pattern is actually more flexible since it allows any bpy operation without needing a dedicated tool.

---

## 3. Communication Patterns

### Pattern A: Socket + stdio (ahujasid/blender-mcp)
```
Claude/AI <--stdio--> MCP Server (Python) <--TCP socket (port 9876)--> Blender Addon
```
- Blender addon runs a socket server inside Blender
- MCP server connects to that socket, sends JSON commands
- Commands include `type` field (e.g., "execute_code", "get_scene_info")
- Responses are JSON with `status`, `result`, `message`

### Pattern B: HTTP/REST (poly-mcp/Blender-MCP-Server)
```
Claude/AI <--HTTP--> FastAPI MCP Server (port 8000) <--bpy--> Blender
```
- Server runs inside Blender as an addon
- Exposes HTTP endpoints directly from within Blender
- Tools invoked via `POST /mcp/invoke/{tool_name}`
- Tool list at `GET /mcp/list_tools`

### Pattern C: Hub-and-Spoke (tahooki/unreal-blender-mcp)
```
Claude/AI <--SSE--> Central MCP Server (port 8000)
                        |
                        +--socket--> Blender Addon (ports 8400/8401)
                        +--HTTP----> Unreal Plugin (port 8500)
```
- Central server coordinates multiple applications
- Each app has its own local server
- AI agents only talk to the central server

### bpy Usage
All Blender MCPs ultimately use Blender's Python API (`bpy`) to execute operations. The addon runs inside Blender's Python environment, giving full access to:
- `bpy.ops.*` - Blender operators
- `bpy.data.*` - Blender data (meshes, materials, objects)
- `bpy.context.*` - Current context (selected objects, active scene)

---

## 4. Blender to Godot Pipeline (Current State)

### Standard Workflow Today
1. **Create assets in Blender** (models, materials, animations, rigs)
2. **Export as GLTF/GLB** (the standard interchange format)
3. **Import in Godot** (automatic or manual)
4. **Set up game logic in Godot** (scripts, collisions, signals)

### Existing Pipeline Tools

#### Blender-Godot Pipeline Addon
- **GitHub**: https://github.com/indiedevcasts/blender-godot-pipeline
- **Godot Asset Library**: https://godotengine.org/asset-library/asset/2562
- **Version**: 2.5.5 (updated Jan 2026)
- **Features**:
  - Collision shape setup in Blender
  - MultiMesh support
  - Script assignment
  - Custom materials
  - NavMesh generation
  - PBR material transfer
  - Animation transfer
  - Leverages GLTF standard for data encoding

#### Blender to Godot 4 Pipeline Addon (michaeljared)
- **itch.io**: https://michaeljared.itch.io/blender-to-godot-4-pipeline-addon
- **Features**: Collisions, multimesh, scripts, custom materials, NavMeshes

#### ACT: Game Asset Creation Toolset
- **URL**: https://visualstorms.com/shop/act-game-asset-creation-toolset-2025-2-1/
- **Features**: Batch export FBX/GLTF for Godot, origin alignment

### Godot Proposal for Official Pipeline
- **Issue**: https://github.com/godotengine/godot-proposals/issues/6883
- Proposal to create an official Blender add-on for Godot asset pipeline
- Status: Under discussion

### Key Pipeline Patterns
- `.tscn` files reference GLTF exports, auto-updating on re-export
- Blender export collections map to individual Godot assets
- GLTF extras/custom properties carry metadata (collision types, script paths)
- Geometry Node instances can transfer to Godot 4.5+ as MultiMesh

### Current Pain Points
- Material conversion is lossy (Blender Principled BSDF != Godot StandardMaterial3D)
- Animation retargeting requires manual setup
- No live sync between editors
- Export/import cycle is manual and repetitive

---

## 5. Unified Blender+Godot MCP Architecture

### Reference Architecture: unreal-blender-mcp
The `tahooki/unreal-blender-mcp` project provides a proven pattern for multi-application MCP coordination:

- **Central MCP server** (hub) coordinates both applications
- **Blender addon** runs socket server for receiving commands
- **Game engine plugin** runs HTTP server for receiving commands
- **AI agents** only interact with the central server
- **SSE** (Server-Sent Events) for real-time communication with AI

### Proposed Blender+Godot MCP Architecture

```
Claude/AI Client
      |
      | stdio or SSE
      v
+---------------------------+
| Unified MCP Server        |
| (GodotForge Orchestrator) |
+---------------------------+
      |                |
      | TCP socket     | HTTP/WebSocket
      v                v
+----------+    +-----------+
| Blender  |    | Godot     |
| Addon    |    | Plugin    |
| (bpy)    |    | (GDScript)|
+----------+    +-----------+
```

### Automated Workflow Examples

#### 1. Create 3D Model in Blender -> Auto-Export -> Auto-Import in Godot
```
AI: "Create a low-poly tree and add it to the Godot scene"
1. MCP -> Blender: Create mesh, apply materials
2. MCP -> Blender: Export as GLTF to Godot project path
3. MCP -> Godot: Reimport asset, add to scene tree
```

#### 2. Material Pipeline
```
AI: "Create a brick material and apply it to the wall"
1. MCP -> Blender: Create Principled BSDF material with brick texture
2. MCP -> Blender: Bake textures (albedo, normal, roughness)
3. MCP -> Blender: Export GLTF with embedded textures
4. MCP -> Godot: Import, material auto-converts to StandardMaterial3D
```

#### 3. Animation Pipeline
```
AI: "Rig this character and create a walk animation"
1. MCP -> Blender: Create armature, assign weights
2. MCP -> Blender: Create walk cycle keyframes
3. MCP -> Blender: Export GLTF with animations
4. MCP -> Godot: Import, animations appear in AnimationPlayer
```

#### 4. Render-to-Texture Pipeline
```
AI: "Render a skybox from this Blender scene for Godot"
1. MCP -> Blender: Set up panoramic camera
2. MCP -> Blender: Render equirectangular image
3. MCP -> Blender: Save to Godot project textures folder
4. MCP -> Godot: Create WorldEnvironment with panorama sky
```

#### 5. Scene Layout Pipeline
```
AI: "Layout the village scene in Blender and transfer to Godot"
1. MCP -> Blender: Arrange objects in scene
2. MCP -> Blender: Export each object as GLTF + scene as GLTF
3. MCP -> Godot: Import all assets
4. MCP -> Godot: Recreate node hierarchy matching Blender scene
5. MCP -> Godot: Add collision shapes, scripts
```

---

## 6. Competitive Landscape

### Does Anyone Offer Unified Blender+Godot AI Tool?

**No.** As of March 2026, there is NO unified Blender+Godot MCP server or AI tool. Here is what exists:

| Project | Blender | Godot | Unified? |
|---------|---------|-------|----------|
| ahujasid/blender-mcp | Yes | No | No |
| poly-mcp/Blender-MCP-Server | Yes | No | No |
| tahooki/unreal-blender-mcp | Yes | Unreal only | No (wrong engine) |
| Coding-Solo/godot-mcp | No | Yes | No |
| ee0pdt/Godot-MCP | No | Yes | No |
| bradypp/godot-mcp | No | Yes | No |
| n24q02m/better-godot-mcp | No | Yes | No |
| Agency-Agents Framework | Both (separate agents) | Both (separate agents) | Multi-agent, not unified MCP |

### Existing Godot MCP Servers (for reference)

| Server | GitHub | Tools | Protocol |
|--------|--------|-------|----------|
| Coding-Solo/godot-mcp | https://github.com/Coding-Solo/godot-mcp | Launch, run, debug | stdio |
| Dokujaa/Godot-MCP | https://github.com/Dokujaa/Godot-MCP | Claude Desktop integration | stdio |
| bradypp/godot-mcp | https://github.com/bradypp/godot-mcp | Comprehensive Godot control | stdio |
| ee0pdt/Godot-MCP | https://github.com/ee0pdt/Godot-MCP | Scene editing, scripting | stdio |
| LeeSinLiang/godot-mcp | https://github.com/LeeSinLiang/godot-mcp | Error capture, scene mgmt, remote debug | WebSocket |
| tomyud1/godot-mcp | https://github.com/tomyud1/godot-mcp | AI-assisted dev | WebSocket |
| n24q02m/better-godot-mcp | https://github.com/n24q02m/better-godot-mcp | 18 composite mega-tools | stdio |
| matula/godot-mcp-server | https://github.com/matula/godot-mcp-server | Basic CLI-based | stdio |
| GoPeak (antigravity.codes) | https://antigravity.codes/mcp/godot | 95+ tools | - |

### The Opportunity

A unified Blender+Godot MCP server would be **first-of-its-kind** for this engine combination. The closest analog is `tahooki/unreal-blender-mcp` for Unreal Engine. GodotForge is uniquely positioned to:

1. Be the first unified Blender+Godot MCP
2. Automate the GLTF asset pipeline that every Blender+Godot developer uses manually
3. Enable AI-driven game development spanning both tools
4. Leverage the proven hub-and-spoke architecture from unreal-blender-mcp

### Multi-Tool MCP Trend

The Shyft.ai article (https://shyft.ai/blog/mcp-servers-creative-tools) notes: "Running Blender, After Effects, and FFmpeg from one conversation already works. The next step is AI agents that plan and execute multi-tool pipelines without manual prompting." This is exactly the direction GodotForge could pioneer for game development.

---

## Summary of Key Findings

1. **17+ Blender MCP servers exist**, but ahujasid/blender-mcp (22 tools, socket+stdio) and poly-mcp/Blender-MCP-Server (51+ tools, HTTP) are the two major ones
2. **The `execute_blender_code` pattern** is the most powerful approach -- one tool that runs any bpy code covers all Blender operations
3. **Hub-and-spoke architecture** (proven by unreal-blender-mcp) is the right pattern for multi-app coordination
4. **GLTF is the standard** interchange format for Blender-to-Godot
5. **No unified Blender+Godot MCP exists** -- this is a clear market gap
6. **8+ Godot MCP servers exist** but none integrate with Blender
7. **The pipeline is well-understood** but manual -- automation via MCP is the obvious next step
