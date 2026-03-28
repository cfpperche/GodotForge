# GodotForge V2 — Product Requirements Document

> **Version**: 2.0.0 | **Date**: 2026-03-28 | **Status**: In Development
>
> **Visão**: O hub central de desenvolvimento de jogos com IA — orquestra Godot, Blender, e serviços criativos numa pipeline unificada.

---

## 1. Visão do Produto

GodotForge V2 evolui de um copilot para Godot para uma **plataforma de orquestração de game dev com IA**. Um único MCP server coordena:

- **Godot Engine** — cenas, scripts, gameplay, runtime
- **Blender** — modelagem 3D, materiais, animação, rigging
- **Serviços de IA** — geração de modelos 3D, texturas, sprites, sons, música
- **Asset Libraries** — Poly Haven, Sketchfab, OpenGameArt
- **Pipeline automático** — Blender cria → exporta GLTF → Godot importa → cena pronta

O dev fala com UM copilot (via Godot, Blender, Web, ou CLI) e ele coordena tudo.

---

## 2. Arquitetura V2

```
Web Copilot (React :5173) ──────────┐
Claude Code / Cursor ──► MCP (stdio)──┤
Godot Chat Panel ──► MCP (HTTP :6980)──┤──► Godot Plugin HTTP :6970
Blender Chat Panel ──► MCP (HTTP :6980)──┤──► Blender Addon TCP :8400
                                         │
                                         ├── Claude API / Claude CLI (LLM)
                                         ├── Docs Engine (SQLite FTS5, 912 classes)
                                         ├── Memory Engine (FTS5 + markdown, 50KB cap)
                                         ├── Context Builder (token-budgeted, 8K tokens)
                                         ├── ConfigManager (API keys: env + config.json)
                                         ├── Asset Services (Poly Haven, Sketchfab, OpenGameArt)
                                         ├── Pipeline (Blender → Godot asset flow)
                                         └── Web Dashboard (/dashboard)
```

---

## 3. Interfaces (4)

| Interface | Tecnologia | Status |
|-----------|-----------|--------|
| **Claude Code / Cursor** | MCP stdio transport | ✅ 83 tools via MCP protocol |
| **Godot Chat Panel** | GDScript → MCP HTTP :6980 | ✅ Claude CLI executa tools via MCP |
| **Blender Chat Panel** | Python sidebar → MCP HTTP :6980 | ✅ View3D > GodotForge |
| **Web Copilot** | React + Tailwind + shadcn :5173 | ✅ Chat + sidebar + API keys |

Todas as interfaces compartilham a mesma memória, contexto e 83 tools.

---

## 4. Módulos e Tools (83 total)

### 4.1 Godot Module (32 tools — ✅ Completo)

**Editor Tools (24)**: create_scene, open_scene, get_scene_tree, add_node, remove_node, rename_node, duplicate_node, move_node, set_property, create_script, read_script, edit_script, run_scene, stop_scene, get_game_status, take_screenshot, execute_editor_script, add_resource, add_scene_instance, save_scene, get_node_properties, connect_signal, set_project_setting, get_editor_errors

**Local Tools (8)**: get_project_context, read_file, list_files, search_docs, get_class_reference, save_memory, search_memory, get_project_memory

### 4.2 Blender Module (39 tools — ✅ Completo)

**Modeling (11)**: create_mesh, delete_object, duplicate_object, transform, modify, boolean, join_objects, extrude, subdivide, set_origin, separate_mesh

**Materials (6)**: create_material, assign_material, set_material_texture, bake_textures, delete_material, list_materials

**Animation (8)**: create_armature, add_bone, parent_to_armature, insert_keyframe, create_animation, set_animation_range, auto_weight_paint, list_animations

**Scene & Render (7)**: set_camera, set_light, render_image, set_render_settings, get_scene_objects, get_object_properties, get_blender_info

**Export (4)**: export_gltf, export_for_godot, export_with_animations, export_fbx

**UV (1)**: unwrap_uv

**Collision (1)**: generate_collision_hints

**Script (1)**: execute_python

### 4.3 Pipeline Module (4 tools — ✅ Completo)

| Tool | Descrição |
|------|-----------|
| `pipeline.blender_to_godot` | Export Blender → GLB → Godot project + rescan |
| `pipeline.blender_to_godot_animated` | Export com animações + armatures |
| `pipeline.sync_collision` | Gerar collision hints (-col/-colonly/-trimesh) |
| `pipeline.batch_import` | Importar múltiplos assets de uma vez |

### 4.4 Asset Services Module (7 tools — ✅ Completo)

| Tool | Descrição | API |
|------|-----------|-----|
| `assets.search_polyhaven` | Buscar texturas/modelos/HDRIs (750+) | polyhaven.com (público) |
| `assets.download_polyhaven` | Baixar com resolução/formato + auto-import | polyhaven.com (público) |
| `assets.search_sketchfab` | Buscar modelos 3D | Sketchfab (público) |
| `assets.download_sketchfab` | Baixar modelo GLTF | Sketchfab (token required) |
| `assets.search_opengameart` | Buscar sprites/sounds/music | OpenGameArt (público) |
| `assets.download_asset` | Download genérico + auto-import | Qualquer URL |
| `assets.list_local` | Listar assets locais por tipo/tamanho | Local filesystem |

### 4.5 Config Module (1 tool — ✅ Completo)

| Tool | Descrição |
|------|-----------|
| `get_service_status` | Verificar quais serviços têm API key configurada |

### 4.6 AI Generators Module (Pendente — Phase D)

| Tool | Descrição | Provider |
|------|-----------|----------|
| `ai.generate_3d_model` | Gerar modelo 3D a partir de prompt | Rodin, Meshy, Tripo |
| `ai.generate_texture` | Gerar textura PBR | Stability, DALL-E |
| `ai.generate_sprite` | Gerar sprite 2D | Stability, DALL-E |
| `ai.generate_spritesheet` | Gerar spritesheet animado | Stability |
| `ai.generate_sound` | Gerar efeito sonoro | ElevenLabs |
| `ai.generate_music` | Gerar música de fundo | Suno |
| `ai.generate_skybox` | Gerar skybox/HDRI | Blockade Labs |
| `ai.upscale_texture` | Upscale de textura | Real-ESRGAN |
| `ai.remove_background` | Remover fundo de imagem | rembg |

---

## 5. Infraestrutura

### 5.1 API Key Management (✅ Completo)
- `ConfigManager`: env vars (primário) + `.godotforge/config.json` (fallback)
- 12 serviços suportados: Anthropic, Sketchfab, Poly Haven, Rodin, Meshy, Tripo, Stability, OpenAI, ElevenLabs, Suno, Blockade Labs, HuggingFace
- HTTP endpoints: GET/POST/DELETE `/keys`
- Web Dashboard: `http://localhost:6980/dashboard`
- Keys nunca expostas em respostas — só status (configured/source)

### 5.2 Memory Engine (✅ Completo)
- Persistente em `.godotforge/memory.md` (categorias: Conventions, Patterns, Decisions, Architecture)
- FTS5 search em `.godotforge/memory.db`
- Session logs em `.godotforge/sessions/YYYY-MM-DD.md`
- **50KB cap** com auto-archive para `.godotforge/archive/`
- Context builder: 8000 tokens (memory 3000 + structure 2000 + scene 1500 + session 1500)

### 5.3 Conversation Compaction (✅ Completo)
- Quando sessão > 20 mensagens, sumariza antigas, mantém 6 recentes
- Funciona tanto no modo API key quanto Claude CLI

### 5.4 Claude CLI Tool Execution (✅ Completo)
- `claude --print --output-format json --mcp-config` executa tools via MCP protocol
- Chat nativo (Godot/Blender/Web) usa Claude CLI como LLM com tool loop completo
- JSON output parseado para extrair num_turns e reportar tool execution

---

## 6. Roadmap V2

| Fase | Escopo | Tools | Status |
|------|--------|-------|--------|
| **A. Blender Integration Base** | Addon + bridge + 17 tools + pipeline | 17 + 1 | ✅ |
| **B. Pipeline Completo** | +22 Blender tools (anim, render, collision) + 3 pipeline | +22 + 3 | ✅ |
| **C. Asset Services** | Poly Haven + Sketchfab + OpenGameArt + download + list | +7 | ✅ |
| **Config & Dashboard** | ConfigManager + Web Dashboard + API keys | +1 | ✅ |
| **Web Copilot** | React + Tailwind + shadcn chat interface | — | ✅ |
| **Blender Copilot** | Python sidebar chat panel | — | ✅ |
| **CLI Fix** | Claude CLI tool execution via MCP | — | ✅ |
| **D. AI Generators** | 3D gen, textures, sprites, audio, music | +9 | Pendente |
| **E. Polish & Launch** | npm publish, README, Asset Library, docs | — | Pendente |

### E2E Tests Validados
- ✅ **Phase A**: Cubo metálico Blender → GLB → Godot cena 3D
- ✅ **Phase B**: Personagem rigged + walk animation + collision → Godot com AnimationPlayer + CollisionShape3D
- ✅ **Phase C**: Textura Poly Haven (coast_sand_rocks_02) + Rock Blender → Godot cena com PBR (diffuse + normal + roughness + AO)
- ✅ **Flappy Bird**: Jogo 2D completo criado inteiramente via tools (demo/)

---

## 7. Tech Stack V2

| Componente | Tecnologia |
|-----------|-----------|
| Hub MCP Server | TypeScript (Node.js 22+) |
| Godot Plugin | GDScript (@tool, EditorInterface) |
| Blender Addon | Python (bpy API, socket server :8400) |
| Web Copilot | React 19 + Vite + Tailwind v4 + shadcn/ui |
| Comunicação Godot | HTTP REST (:6970) |
| Comunicação Blender | TCP Socket JSON (:8400) |
| Comunicação Web | HTTP REST (:6980) |
| Pipeline | TypeScript (GLB export via Windows temp, file copy) |
| Asset APIs | REST (Poly Haven, Sketchfab, OpenGameArt) |
| AI APIs | REST (Rodin, Stability, ElevenLabs — Phase D) |
| Storage | SQLite FTS5 (docs, memory) + filesystem (assets) |
| Config | env vars + .godotforge/config.json (gitignored) |

---

## 8. Métricas V2

| Métrica | Target | Atual |
|---------|--------|-------|
| Total tools | 100+ | 83 (faltam 9 AI tools) |
| Interfaces | 4 | 4 ✅ (CLI, Godot, Blender, Web) |
| Blender → Godot pipeline time | < 30s | ~5s ✅ |
| Asset download → in-game | < 1 min | ~15s ✅ |
| AI generation → in-game | < 2 min | Phase D |

---

## 9. Diferencial Competitivo

| Feature | GodotForge V2 | Concorrentes |
|---------|---------------|-------------|
| Godot MCP | ✅ 32 tools | Vários (parciais) |
| Blender MCP | ✅ 39 tools | ahujasid (22), poly-mcp (51) |
| Pipeline Blender→Godot | ✅ Automático (4 tools) | ❌ Ninguém |
| Asset Libraries | ✅ Poly Haven + Sketchfab + OGA | Blender MCP (só Poly Haven) |
| AI Generation | Phase D | ❌ Ninguém integrado |
| Hub unificado (4 interfaces) | ✅ CLI + Godot + Blender + Web | ❌ Ninguém |
| Memory persistente | ✅ FTS5 + 50KB cap + archive | ❌ Ninguém |
| Docs-aware | ✅ 912 classes FTS5 | ❌ Ninguém |
| Web Copilot | ✅ React + shadcn | ❌ Ninguém |
| API Key Manager | ✅ 12 serviços + dashboard | ❌ Ninguém |

**GodotForge V2 é o primeiro hub de desenvolvimento de jogos com IA que orquestra engine + DCC + assets numa pipeline unificada com 4 interfaces.**
