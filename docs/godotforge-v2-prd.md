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

## 4. Módulos e Tools (85 total)

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

### 4.5 Blender Docs Module (2 tools — ✅ Completo)

| Tool | Descrição |
|------|-----------|
| `search_blender_docs` | Busca FTS5 sobre 3800 classes bpy (106K members) |
| `get_blender_class` | Referência completa de classe bpy.types |

Auto-RAG: context builder detecta classes bpy mencionadas na conversa e injeta docs automaticamente.

### 4.6 Config Module (1 tool — ✅ Completo)

| Tool | Descrição |
|------|-----------|
| `get_service_status` | Verificar quais serviços têm API key configurada |

### 4.7 AI Generators Module (Pendente — Phase D)

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

### 4.8 Asset Library Expansion Module (Pendente — Phase D2)

Expansão das integrações com bibliotecas de assets gratuitas e pagas, complementando os 3 serviços já integrados (Poly Haven, Sketchfab, OpenGameArt).

#### 4.8.1 Free Asset Libraries (com API)

| Tool | Descrição | Provider | Licença | API |
|------|-----------|----------|---------|-----|
| `assets.search_kenney` | Buscar assets CC0 (40K+ sprites, 3D, UI, tilesets) | Kenney.nl | CC0 | GitHub/scraping |
| `assets.download_kenney` | Baixar pack Kenney + auto-import Godot | Kenney.nl | CC0 | GitHub releases |
| `assets.search_ambientcg` | Buscar texturas PBR CC0 (2000+ materiais, até 8K) | ambientCG | CC0 | REST API |
| `assets.download_ambientcg` | Baixar textura PBR + auto-import Godot | ambientCG | CC0 | REST API |
| `assets.search_freesound` | Buscar efeitos sonoros (500K+ sons) | Freesound.org | CC (varia) | REST API (OAuth2) |
| `assets.download_freesound` | Baixar SFX + auto-import Godot | Freesound.org | CC (varia) | REST API (OAuth2) |
| `assets.search_godot_assets` | Buscar plugins/templates na Godot Asset Library oficial | Godot Asset Library | MIT/varia | REST API |
| `assets.install_godot_addon` | Instalar addon da Godot Asset Library no projeto | Godot Asset Library | MIT/varia | REST API |

#### 4.8.2 Free Asset Libraries (sem API — scraping/download direto)

| Tool | Descrição | Provider | Licença |
|------|-----------|----------|---------|
| `assets.search_quaternius` | Buscar modelos 3D low-poly CC0 | Quaternius.com | CC0 |
| `assets.search_sonniss` | Buscar SFX profissionais do GameAudioGDC bundle | Sonniss.com | Royalty-free |
| `assets.search_gameicons` | Buscar ícones SVG para RPG/UI (4000+) | Game-Icons.net | CC-BY 3.0 |

#### 4.8.3 Procedural Generation Tools (local)

| Tool | Descrição | Provider | Licença |
|------|-----------|----------|---------|
| `assets.generate_sfx` | Gerar SFX retro procedural (tipo jsfxr) | Local (jsfxr lib) | Gerado (usuário é dono) |
| `assets.generate_palette` | Gerar paleta de cores para game art | Local | Gerado |

#### 4.8.4 Paid/Freemium Aggregators (API key required)

| Tool | Descrição | Provider | Preço | API |
|------|-----------|----------|-------|-----|
| `assets.search_itch` | Buscar game assets no itch.io | itch.io | Free/Paid | REST API |

#### 4.8.5 Character Animation (free)

| Tool | Descrição | Provider | Licença |
|------|-----------|----------|---------|
| `assets.search_mixamo` | Buscar animações de personagem (2500+ anims) | Mixamo (Adobe) | Royalty-free |
| `assets.download_mixamo` | Baixar animação FBX + pipeline Blender → Godot | Mixamo (Adobe) | Royalty-free |
| `assets.auto_rig_mixamo` | Upload mesh → auto-rigging → download rigged | Mixamo (Adobe) | Royalty-free |

**Total Phase D2: +14 tools (assets.* namespace)**

**Prioridade de implementação:**
1. **Kenney** — CC0, 40K assets, mais popular, GitHub-based (fácil)
2. **ambientCG** — CC0, REST API oficial, complementa Poly Haven
3. **Freesound** — REST API, maior biblioteca de SFX do mundo
4. **Godot Asset Library** — API oficial, instala plugins direto no projeto
5. **Mixamo** — Auto-rigging + 2500 animações, pipeline com Blender existente
6. **jsfxr (local)** — Zero dependência externa, útil para prototipagem
7. **Quaternius + Game-Icons** — Scraping simples, CC0
8. **itch.io** — API existente, maior marketplace indie

**ConfigManager expansion:** +4 serviços (Freesound, Mixamo/Adobe, itch.io, Kenney)

### 4.9 Game Dev Toolchain Module (Pendente — Phase D3, Tier 1+2)

Integração com ferramentas indispensáveis do pipeline de game dev além de Godot e Blender. Tier 1 (alto valor, fácil) e Tier 2 (alto valor, médio) implementados juntos.

#### 4.9.1 Audio Pipeline (Tier 1)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `audio.generate_sfx` | Gerar SFX procedural (retro/arcade) a partir de parâmetros ou descrição | jsfxr (npm lib, roda no MCP server) | Local — zero dependência externa |
| `audio.convert` | Converter formato, normalizar volume, trim silêncio, ajustar sample rate | FFmpeg CLI | CLI — `ffmpeg -i input -af loudnorm output.ogg` |
| `audio.batch_convert` | Converter todos os áudio do projeto para formato Godot-otimizado (.ogg) | FFmpeg CLI | CLI — batch sobre `res://` |
| `audio.trim` | Cortar áudio por timestamps | FFmpeg CLI | CLI |
| `audio.concat` | Concatenar múltiplos áudios em sequência | FFmpeg CLI | CLI |
| `audio.analyze` | Analisar áudio: duração, volume, sample rate, formato | FFmpeg/ffprobe CLI | CLI — `ffprobe -show_format` |

#### 4.9.2 Narrative / Dialogue Engine (Tier 1)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `narrative.create_ink` | Gerar arquivo .ink (branching dialogue) a partir de descrição | ink format (texto puro) | Write file + `inklecate` CLI compile |
| `narrative.compile_ink` | Compilar .ink → .json para runtime Godot | inklecate CLI | CLI — `inklecate story.ink -o story.json` |
| `narrative.create_yarn` | Gerar arquivo .yarn (Yarn Spinner dialogue) | Yarn format (texto puro) | Write file + `ysc` CLI compile |
| `narrative.compile_yarn` | Compilar .yarn para runtime | ysc CLI | CLI — `ysc compile story.yarn` |
| `narrative.validate` | Validar estrutura de diálogo: branches mortos, loops infinitos, variáveis undefined | Parser local | Análise estática do texto |

#### 4.9.3 Level Design / Map Generation (Tier 1)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `level.create_ldtk` | Gerar level 2D no formato LDtk JSON a partir de descrição | LDtk JSON schema | Write JSON file |
| `level.create_tiled` | Gerar tilemap no formato Tiled JSON/TMX | Tiled JSON/TMX schema | Write JSON/XML file |
| `level.import_ldtk` | Importar LDtk → Godot TileMap (via addon importer) | LDtk Godot importer | File copy + Godot rescan |
| `level.import_tiled` | Importar Tiled TMX → Godot TileMap | Tiled Godot importer | File copy + Godot rescan |
| `level.generate_dungeon` | Gerar dungeon procedural (BSP/drunkard walk/WFC) → LDtk ou Godot TileMap | Algoritmo local (TS) | Geração + write |

#### 4.9.4 Sprite Pipeline (Tier 1)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `sprite.export_sheet` | Exportar .ase/.aseprite → sprite sheet PNG + JSON atlas | Aseprite CLI (`-b`) | CLI — `aseprite -b input.ase --sheet output.png --data output.json` |
| `sprite.resize` | Redimensionar sprite/textura (batch ou individual) | Aseprite CLI ou ImageMagick | CLI |
| `sprite.palette_swap` | Trocar paleta de cores de sprites | Aseprite CLI (`--palette`) | CLI |
| `sprite.split_layers` | Separar layers de .ase em PNGs individuais | Aseprite CLI (`--split-layers`) | CLI |
| `sprite.atlas_pack` | Empacotar múltiplos PNGs em atlas otimizado | Aseprite CLI ou ImageMagick | CLI |

#### 4.9.5 Distribution / CI-CD (Tier 1)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `dist.export_game` | Exportar projeto Godot para plataforma (Windows/Linux/Mac/Web/Android) | Godot CLI (`--export-release`) | CLI headless |
| `dist.push_itch` | Push build para itch.io com versionamento | itch.io Butler CLI | CLI — `butler push folder user/game:channel` |
| `dist.generate_ci` | Gerar workflow GitHub Actions para build + deploy Godot | YAML generation | Write file `.github/workflows/` |
| `dist.push_steam` | Upload build para Steam via SteamCMD | SteamCMD CLI + VDF config | CLI |
| `dist.version_bump` | Incrementar versão no project.godot + export_presets.cfg | File edit | Read + edit config files |

#### 4.9.6 Video / Media Capture (Tier 1)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `media.create_gif` | Criar GIF de gameplay a partir de screenshots ou vídeo | FFmpeg + gifski CLI | CLI — frames → GIF |
| `media.record_gameplay` | Gravar sessão de gameplay como vídeo | FFmpeg screen capture | CLI — `ffmpeg -f gdigrab` (Win) |

#### 4.9.7 Audio Middleware (Tier 2)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `audio.fmod_build_banks` | Compilar sound banks FMOD Studio | fmodstudiocl CLI | CLI — `fmodstudiocl build` |
| `audio.fmod_create_event` | Criar evento FMOD Studio via scripting | FMOD Studio JavaScript API | Script injection |
| `audio.fmod_list_events` | Listar eventos e buses do projeto FMOD | FMOD Studio API | Script query |

#### 4.9.8 Image Processing (Tier 2)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `image.batch_process` | Batch resize, convert, optimize imagens do projeto | ImageMagick CLI | CLI — `magick convert` |
| `image.create_atlas` | Gerar texture atlas otimizado a partir de múltiplos PNGs | ImageMagick montage | CLI — `magick montage` |
| `image.krita_export` | Exportar .kra (Krita) → PNG/atlas com layers | Krita CLI | CLI — `krita --export` |
| `image.gimp_batch` | Processamento batch via GIMP Script-Fu | GIMP CLI (`-i -b`) | CLI + Script-Fu |

#### 4.9.9 Localization (Tier 2)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `l10n.extract_strings` | Extrair strings traduzíveis de scenes (.tscn) e scripts (.gd) | Parser local (TS) | Read + regex extraction |
| `l10n.generate_csv` | Gerar CSV de tradução para Godot Translation Server | CSV generation | Write file |
| `l10n.validate` | Validar completude de traduções (missing keys, placeholders quebrados) | CSV parser | Read + validate |
| `l10n.auto_translate` | Traduzir placeholder text via LLM para prototipagem | Claude API / LLM | API call |
| `l10n.sync_crowdin` | Sincronizar traduções com Crowdin/POEditor | Crowdin REST API | HTTP API |

#### 4.9.10 Testing / QA Automation (Tier 2)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `test.generate_unit` | Gerar unit tests GDScript para scripts do projeto | GdUnit4 / GUT format | Write .gd test files |
| `test.run_tests` | Executar suite de testes headless e reportar resultados | Godot `--headless --script` + GdUnit4 CLI | CLI + JUnit XML parse |
| `test.screenshot_diff` | Comparar screenshots para detectar regressão visual | ImageMagick `compare` | CLI — `magick compare` |
| `test.run_playtest` | Executar sequência de inputs automatizada + capturar resultado | GodotForge `run_scene` + `simulate_input` + `take_game_screenshot` | Tools existentes combinadas |

#### 4.9.11 Procedural Material Generation (Tier 2)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `material.create_maker` | Gerar grafo Material Maker (procedural texture) a partir de descrição | Material Maker JSON format | Write JSON graph |
| `material.export_tres` | Exportar Material Maker graph → .tres para Godot | Material Maker CLI | CLI export |

#### 4.9.12 OBS Recording (Tier 2)

| Tool | Descrição | Tecnologia | Integração |
|------|-----------|-----------|------------|
| `media.obs_start_recording` | Iniciar gravação OBS programaticamente | OBS WebSocket API v5 | WebSocket client |
| `media.obs_stop_recording` | Parar gravação e retornar path do vídeo | OBS WebSocket API v5 | WebSocket client |
| `media.obs_screenshot` | Capturar screenshot via OBS (alta qualidade) | OBS WebSocket API v5 | WebSocket client |

### 4.10 Game Dev Toolchain — Tier 3 (Futuro, pós-D3)

Ferramentas de valor médio ou integração difícil, planejadas para fases posteriores.

#### 4.10.1 2D Skeletal Animation

| Tool | Descrição | Tecnologia | Dificuldade |
|------|-----------|-----------|-------------|
| `anim2d.create_spine` | Gerar projeto Spine JSON (bones, slots, skins) | Spine JSON format | Média — formato complexo (hierarchies, weights) |
| `anim2d.export_spine` | Exportar Spine → atlas + runtime para Godot | Spine CLI | Média |
| `anim2d.create_dragonbones` | Gerar projeto DragonBones JSON | DragonBones JSON | Média |

#### 4.10.2 Advanced Audio (Wwise)

| Tool | Descrição | Tecnologia | Dificuldade |
|------|-----------|-----------|-------------|
| `audio.wwise_create_event` | Criar evento Wwise via WAAPI | Wwise Authoring API (JSON-RPC) | Difícil — setup pesado |
| `audio.wwise_build_banks` | Compilar soundbanks Wwise | Wwise CLI | Difícil |
| `audio.wwise_import_audio` | Importar áudio no Wwise com metadata | WAAPI | Difícil |

#### 4.10.3 Texture Painting (Substance)

| Tool | Descrição | Tecnologia | Dificuldade |
|------|-----------|-----------|-------------|
| `texture.substance_bake` | Bake textures PBR via Substance Automation | Substance CLI (`sbsrender`) | Difícil — licença $20/mo |
| `texture.substance_export` | Exportar texturas Substance → Godot StandardMaterial3D | Substance CLI (`sbscooker`) | Difícil |

#### 4.10.4 GPU Profiling

| Tool | Descrição | Tecnologia | Dificuldade |
|------|-----------|-----------|-------------|
| `perf.renderdoc_capture` | Capturar frame GPU para análise | RenderDoc CLI (`renderdoccmd`) | Média |
| `perf.renderdoc_analyze` | Extrair métricas de frame capture | RenderDoc replay API | Difícil |

#### 4.10.5 Project Management

| Tool | Descrição | Tecnologia | Dificuldade |
|------|-----------|-----------|-------------|
| `pm.create_issue` | Criar issue GitHub/Linear a partir de TODO no código | GitHub/Linear REST API | Fácil |
| `pm.sync_tasks` | Sincronizar TODOs do código com issue tracker | GitHub/Linear API | Média |
| `pm.sprint_report` | Gerar relatório de sprint a partir de issues fechadas | GitHub/Linear API | Fácil |

**Total Phase D3 (Tier 1+2): +52 tools**
**Total Tier 3 (futuro): +14 tools**
**Total geral toolchain: +66 tools**

### 4.11 Game Studio Systems Module (Pendente — Phase D4)

Sistemas de alto nível que transformam GodotForge de ferramenta de desenvolvimento em plataforma completa de produção de jogos.

#### 4.11.1 Genre Starter Templates

Templates completos com best practices, prontos para game jams e prototipagem rápida. Cada template gera projeto funcional com scenes, scripts, assets placeholder e UI.

| Tool | Descrição | Gera |
|------|-----------|------|
| `template.platformer_2d` | Platformer 2D completo | CharacterBody2D + camera + tilemap + coins + enemies + UI + main menu + death/respawn |
| `template.topdown_rpg` | RPG top-down | Player + inventory + dialogue system + save/load + NPCs + quests + day/night |
| `template.roguelike` | Roguelike/Roguelite | Dungeon gen (BSP) + permadeath + items + procedural rooms + minimap |
| `template.fps_3d` | FPS 3D | FPS controller + weapons + enemies + health + ammo + crosshair + level |
| `template.visual_novel` | Visual Novel | Dialogue system (ink/Yarn) + characters + choices + backgrounds + save + gallery |
| `template.card_game` | Card Game | Deck + hand + board + card effects + turn system + AI opponent |
| `template.racing` | Racing | Vehicle physics + track + checkpoints + timer + AI opponents + boost |
| `template.tower_defense` | Tower Defense | Grid + towers + enemies + waves + economy + upgrade system |
| `template.metroidvania` | Metroidvania | Map system + abilities + locked areas + backtracking + boss rooms |
| `template.puzzle` | Puzzle Game | Grid/tile mechanics + undo + level select + star rating + hints |

#### 4.11.2 Save System Generation

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `save.generate_system` | Analisar scene tree → gerar autoload SaveManager com serialização automática de nós relevantes | Code gen (GDScript) |
| `save.generate_settings` | Gerar menu Settings completo (audio, vídeo, controles, acessibilidade) com persistência ConfigFile | Code gen (GDScript + scene) |
| `save.generate_migration` | Gerar script de migração quando formato de save muda entre versões | Code gen (GDScript) |
| `save.generate_autosave` | Gerar sistema de autosave com slots + quicksave/quickload | Code gen (GDScript) |

#### 4.11.3 Store Page / Marketing Automation

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `store.generate_description` | Gerar descrição de loja (itch.io/Steam) a partir do GDD + screenshots + gameplay | LLM (Claude API) |
| `store.generate_tags` | Sugerir tags/categorias baseado no gameplay, gênero e mecânicas | LLM analysis |
| `store.generate_presskit` | Gerar presskit completo (HTML): screenshots, descrição, trailer link, contato, features | Template + LLM |
| `store.itch_update_page` | Atualizar página itch.io (descrição, screenshots, downloads) via API | itch.io API |
| `store.generate_devlog` | Gerar devlog post a partir do git history + screenshots recentes | LLM + git log |
| `store.generate_changelog_public` | Gerar changelog player-facing (sem jargão técnico) a partir do changelog técnico | LLM |

#### 4.11.4 Runtime AI / LLM NPCs

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `runtime_ai.create_npc_brain` | Gerar script GDScript de NPC com system prompt + personality + memória de conversa | Code gen + Claude API |
| `runtime_ai.create_dialogue_runtime` | Setup de chamada LLM em runtime para diálogo dinâmico (com rate limiting e cache) | Code gen (GDScript + HTTP) |
| `runtime_ai.create_behavior_tree` | Gerar behavior tree com nós de decisão LLM-assisted | Code gen (GDScript) |
| `runtime_ai.create_narrator` | Gerar narrador dinâmico que reage a ações do jogador | Code gen + Claude API |
| `runtime_ai.create_quest_generator` | Gerar sistema de quests procedurais via LLM em runtime | Code gen + Claude API |

#### 4.11.5 Accessibility Audit & Generation

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `a11y.audit` | Analisar projeto: contraste, tamanho de fontes, input alternatives, colorblind simulation, subtitles | Análise estática (scenes + scripts + project settings) |
| `a11y.generate_options_menu` | Gerar menu de acessibilidade completo (subtitles, font size, colorblind mode, screen reader, remap) | Code gen (GDScript + scene) |
| `a11y.check_input` | Verificar se todas as ações têm bindings teclado + gamepad + touch | Project settings analysis |
| `a11y.generate_colorblind_shader` | Gerar shader de simulação/correção de daltonismo (protanopia, deuteranopia, tritanopia) | Shader gen (.gdshader) |
| `a11y.generate_screen_reader` | Gerar sistema de screen reader para UI (TTS via OS APIs) | Code gen (GDScript) |

#### 4.11.6 Multiplayer Backend Integration

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `multiplayer.setup_nakama` | Gerar integração Nakama: auth, matchmaking, leaderboards, chat | Code gen + Nakama REST API |
| `multiplayer.setup_supabase` | Gerar integração Supabase: auth, DB, realtime, storage | Code gen + Supabase REST API |
| `multiplayer.setup_playfab` | Gerar integração PlayFab: leaderboards, economy, analytics | Code gen + PlayFab REST API |
| `multiplayer.generate_netcode` | Gerar scaffolding de netcode Godot (MultiplayerSpawner, MultiplayerSynchronizer, RPCs) | Code gen (GDScript) |
| `multiplayer.generate_lobby` | Gerar sistema de lobby: create/join/list rooms, ready check | Code gen (GDScript) |
| `multiplayer.generate_server` | Gerar servidor dedicado headless (Godot `--headless` com server authority) | Code gen + export config |

#### 4.11.7 Playtesting & Analytics Loop

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `playtest.inject_feedback_ui` | Adicionar botão in-game "Report Bug" que captura screenshot + game state + log | Code gen (GDScript + scene) |
| `playtest.generate_telemetry` | Gerar sistema de telemetria leve: heatmaps, deaths, session time, funnel events | Code gen (GDScript + HTTP) |
| `playtest.generate_survey` | Gerar formulário pós-playtest com perguntas baseadas no GDD | Template generation |
| `playtest.discord_webhook` | Enviar builds + changelogs para canal Discord automaticamente | Discord Webhook API |
| `playtest.analyze_session` | Analisar dados de playtest e gerar relatório com insights | LLM analysis |

#### 4.11.8 Monetization Scaffolding

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `monetize.generate_iap` | Scaffold de In-App Purchase (GodotGooglePlayBilling / iOS StoreKit) | Code gen (GDScript) |
| `monetize.generate_ads` | Integração de ads (AdMob via GDExtension) com GDPR consent | Code gen (GDScript) |
| `monetize.design_economy` | Gerar economia in-game balanceada (faucets/sinks/soft-hard currency/gacha rates) | LLM + spreadsheet gen |
| `monetize.generate_shop_ui` | Gerar UI de shop in-game com categorias, moedas, confirmação de compra | Code gen (GDScript + scene) |

**Total Phase D4: +53 tools**

**Prioridade de implementação (dentro da Phase D4):**
1. **Genre Templates** (10 tools) — valor imediato, usa tools existentes, killer para game jams
2. **Store/Marketing** (6 tools) — fecha o loop dev→publish, tudo é texto (LLM excels)
3. **Save System** (4 tools) — pain universal, code gen puro
4. **Accessibility** (5 tools) — diferenciador moral + legal, tendência crescente EU
5. **Runtime AI NPCs** (5 tools) — trending topic, usa Claude API existente
6. **Playtesting Loop** (5 tools) — fecha feedback loop
7. **Multiplayer Backend** (6 tools) — maior dor, mas integração complexa
8. **Monetization** (4 tools) — nicho mobile, menos relevante para PC indie

**ConfigManager expansion:** +4 serviços (Nakama, Supabase, PlayFab, Discord Webhook)

### 4.12 Game Polish & Intelligence Module (Pendente — Phase D5)

Sistemas de polimento, inteligência cross-project e automação de boilerplate que todo jogo precisa.

#### 4.12.1 VFX Presets & Juice

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `vfx.create_preset` | Gerar GPUParticles2D/3D preset por tipo: explosion, smoke, fire, rain, snow, dust, magic, heal, blood, sparks | Code gen (scene + .tres) |
| `vfx.create_screen_effect` | Gerar screen effects: shake, flash, vignette, chromatic aberration, damage overlay | Code gen (GDScript + shader) |
| `vfx.create_trail` | Gerar trail effect (Line2D/MeshInstance3D) para projéteis/movement | Code gen (GDScript + scene) |
| `vfx.juice_scene` | Analisar scene e adicionar juice automático: tweens em buttons, particles em impactos, screen shake em hits | Analysis + code gen |

#### 4.12.2 Design Token / Theme System

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `theme.create_system` | Gerar Godot Theme (.tres) a partir de design tokens (cores, fontes, margins, spacing) | Resource gen (.tres) |
| `theme.generate_ui_kit` | Gerar UI kit completo: buttons, panels, labels, sliders, progress bars, dialogs, tabs | Scene + Theme gen |
| `theme.apply_palette` | Aplicar paleta de cores consistente em todas as scenes do projeto | Batch scene edit |
| `theme.generate_from_reference` | Analisar screenshot de referência → extrair paleta + estilo → gerar Theme | AI vision + Theme gen |

#### 4.12.3 Audio System Generation

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `audio_sys.generate_manager` | Gerar AudioManager autoload: buses, pools, crossfade, spatial, volume persistence | Code gen (GDScript) |
| `audio_sys.generate_music_system` | Gerar sistema de música adaptativa: layers, transitions por intensidade, crossfade entre tracks | Code gen (GDScript) |
| `audio_sys.generate_footsteps` | Gerar sistema de footsteps por surface type (detecta PhysicsMaterial → som correspondente) | Code gen (GDScript) |
| `audio_sys.assign_sounds` | Auto-atribuir SFX a nós por convenção: Button→click, enemy→hit, coin→pickup, door→open | Analysis + scene edit |

#### 4.12.4 Tutorial / Onboarding Generator

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `tutorial.generate_system` | Gerar framework de tutorial: steps, highlights, input prompts, progression, skip | Code gen (GDScript + scene) |
| `tutorial.create_tooltip` | Gerar sistema de tooltips context-sensitive com anchoring e dismiss | Code gen (GDScript + scene) |
| `tutorial.create_hint_system` | Gerar sistema de dicas progressivas (detect player idle/struggle → show hint after delay) | Code gen (GDScript) |

#### 4.12.5 Performance Budget System

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `perf.set_budget` | Definir budgets: max draw calls, max nodes, max texture memory, max script time, max physics bodies | Config file (.godotforge/perf-budget.json) |
| `perf.check_budget` | Auditar projeto contra budgets: contar nodes, medir texturas, estimar draw calls | Static analysis |
| `perf.optimize_textures` | Redimensionar/comprimir texturas que excedem budget (com preview antes/depois) | ImageMagick + Godot import settings |
| `perf.optimize_scenes` | Detectar: nós desnecessários, physics em objetos estáticos, signals desconectados, _process vazio | Static analysis |
| `perf.mobile_audit` | Audit específico mobile: shader complexity, texture sizes, overdraw, touch targets, battery impact | Static analysis + heuristics |

#### 4.12.6 Version Control Inteligente

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `vcs.setup_lfs` | Configurar Git LFS com patterns corretos para Godot (.png, .ogg, .glb, .tres, .import, .wav, .mp3) | Git CLI + .gitattributes |
| `vcs.detect_conflicts` | Detectar scenes/resources com conflito potencial antes de merge (files changed on both branches) | Git CLI analysis |
| `vcs.smart_branch` | Criar branch com naming convention (feature/, fix/, art/) + listar cenas em edição | Git CLI |
| `vcs.generate_gitignore` | Gerar .gitignore otimizado: Godot (.godot/, *.import) + Blender (*.blend1) + GodotForge (.godotforge/) + OS | Write file |

#### 4.12.7 Addon Packaging & Publishing

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `addon.package` | Empacotar código gerado como addon reutilizável: plugin.cfg, structure, README, LICENSE | File generation |
| `addon.publish` | Publicar addon no Godot Asset Library via API | Godot Asset Library API |
| `addon.create_from_scene` | Extrair scene + scripts dependentes em addon independente (resolve dependências) | Dependency analysis + file copy |

#### 4.12.8 Cross-Project Intelligence

| Tool | Descrição | Tecnologia |
|------|-----------|-----------|
| `intel.export_patterns` | Exportar patterns/conventions de um projeto como template reutilizável (.godotforge/patterns.json) | Memory + analysis → JSON |
| `intel.import_patterns` | Importar patterns de outro projeto GodotForge para o projeto atual | JSON → memory import |
| `intel.global_memory` | Memória global cross-project: preferências do dev, patterns favoritos, snippets, lições aprendidas | ~/.godotforge/global-memory.md |
| `intel.benchmark_project` | Comparar métricas do projeto (scenes, scripts, tools usadas, complexidade) contra benchmarks por gênero | Analysis + heuristics |

**Total Phase D5: +37 tools**

**Prioridade de implementação (dentro da Phase D5):**
1. **VFX Presets & Juice** (4 tools) — impacto visual imediato, diferencia amador de polido
2. **Design Tokens / Theme** (4 tools) — consistência visual sem designer, solo devs precisam muito
3. **Audio System Gen** (4 tools) — AudioManager é boilerplate universal
4. **Tutorial Generator** (3 tools) — todo jogo precisa, todo dev odeia fazer
5. **Performance Budgets** (5 tools) — prevenção > debugging, essencial para mobile
6. **Cross-Project Intel** (4 tools) — **moat definitivo**, quanto mais projetos mais inteligente
7. **VCS Inteligente** (4 tools) — .tscn conflicts são pesadelo, LFS setup é confuso
8. **Addon Packaging** (3 tools) — fecha loop: gera → empacota → publica

### 4.13 Game Systems Generator Module (Pendente — Phase D6)

Geração automatizada dos sistemas de gameplay mais comuns que todo dev reimplementa do zero. Cada tool gera código GDScript funcional + scenes prontas para uso.

#### 4.13.1 Inventory System

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `system.inventory_grid` | Inventário grid-based: slots, drag-drop, stack, weight limit | Resident Evil, Diablo |
| `system.inventory_list` | Inventário list-based: categorias, sort, filter, equip/unequip | Skyrim, Witcher |
| `system.inventory_hotbar` | Hotbar com slots + keybinds + swap + cooldown overlay | Minecraft, Terraria |
| `system.item_database` | Sistema de items Resource-based: JSON data, rarity, stats, icons, tooltips | Universal |

#### 4.13.2 Combat Systems

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `system.combat_action` | Combat action: attack, combo chains, cooldown, hitbox/hurtbox, i-frames, knockback | Hollow Knight, Celeste |
| `system.combat_turnbased` | Combat turn-based: turn order (speed), actions menu, targeting, party management | Final Fantasy, Persona |
| `system.combat_tactics` | Combat tactics: grid movement, attack range, cover, flanking, elevation | Fire Emblem, XCOM |
| `system.health_system` | Health/damage: HP, armor, resistances, damage types, death, respawn, regen | Universal |
| `system.loot_table` | Loot tables: weighted random, rarity tiers, guaranteed drops, pity counter | Diablo, Borderlands |

#### 4.13.3 State Machines

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `system.state_machine` | State machine genérica: estados, transições, condições (enum+match ou node-based) | Universal |
| `system.animation_state` | AnimationTree state machine: idle, walk, run, jump, fall, attack com blend transitions | Universal |
| `system.ai_state` | AI state machine para NPCs: patrol, chase, attack, flee, idle com detection ranges | Universal |

#### 4.13.4 Camera Systems

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `system.camera_follow` | Camera follow 2D/3D: smooth follow, lookahead, dead zone, limits, snap | Celeste, Mario |
| `system.camera_orbit` | Camera orbit 3D: rotation, zoom, collision, spring arm, auto-center | Dark Souls, Zelda |
| `system.camera_cutscene` | Câmera cinemática: paths, transitions, letterbox, DOF, slow-mo | Universal |
| `system.camera_shake_profiles` | Shake profiles: light (step), medium (hit), heavy (explosion), custom curves | Universal |

#### 4.13.5 Navigation & Pathfinding

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `system.navigation_setup` | NavigationRegion2D/3D + agents + bake settings automático para o level | Universal |
| `system.waypoint_system` | Waypoints para NPCs: patrol routes, random wander, follow paths, wait points | Universal |
| `system.minimap` | Minimap automático: icons (player, enemies, objectives), fog of war, zoom | Zelda, Metroid |

#### 4.13.6 Progression & Economy

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `system.xp_leveling` | XP/level: curvas (linear, exponential, custom), stat growth, level-up VFX | RPGs |
| `system.skill_tree` | Skill tree: nodes, connections, prerequisites, point allocation, respec option | Path of Exile, Diablo |
| `system.quest_system` | Quest system: objectives, tracking, journal UI, rewards, chains, branching | Skyrim, Witcher |
| `system.achievement_system` | Achievements: conditions, tracking, unlock popup, persistence, Steam stub | Universal |
| `system.currency_shop` | Economia: moedas, preços, shop UI, buy/sell, balanceamento automático | Universal |

#### 4.13.7 World Systems

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `system.day_night_cycle` | Ciclo dia/noite: DirectionalLight, environment transitions, time scale, clock UI | Stardew Valley, Zelda |
| `system.weather` | Sistema de clima: rain, snow, fog, wind (particles + audio + shader + gameplay effect) | RDR2, Zelda BOTW |
| `system.spawn_system` | Spawn system: waves, difficulty scaling, spawn points, max count, cooldowns | Tower Defense, Horde |
| `system.destructible` | Objetos destrutíveis: health, break stages, debris particles, loot drop on destroy | Zelda, Minecraft |

#### 4.13.8 Debug & Dev Tools

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `debug.ingame_console` | Console in-game: command input, registry, output log, toggle com ~ key | Quake, Source engine |
| `debug.fps_counter` | Performance overlay: FPS, frame time, memory, draw calls, physics bodies | Universal |
| `debug.cheat_system` | Cheats (dev build only): god mode, noclip, teleport, give item, set level, time scale | Universal |
| `debug.collision_visualizer` | Toggle visual de collision shapes + raycasts + navigation meshes em runtime | Universal |

#### 4.13.9 Cutscene & Cinematic

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `cutscene.create_system` | Framework de cutscene: timeline, camera moves, dialogue sync, animations, skip button | Universal |
| `cutscene.create_sequence` | Sequência cinemática a partir de descrição: "camera pan left, NPC walks in, dialogue starts" | Universal |
| `cutscene.letterbox` | Letterbox effect: animated bars, aspect ratio transition, cinematic mode toggle | Universal |

#### 4.13.10 Input & Controls

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `input.generate_rebind_menu` | Menu de rebind: keyboard + gamepad + mouse, persistência ConfigFile, conflict detection | Universal |
| `input.generate_input_icons` | Ícones dinâmicos: mostra Xbox/PS/KB icons conforme device ativo, auto-switch | Universal |
| `input.generate_combo_system` | Combo inputs: sequence detection, timing windows, input buffer, cancel windows | Fighting games, Action |

#### 4.13.11 Modding Support

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `mod.generate_api` | Mod API: hooks, events, data overrides, sandbox, version compatibility | Factorio, Minecraft |
| `mod.generate_loader` | Mod loader: scan directory, validate, load PCK/ZIP, dependency resolution, load order | Universal |
| `mod.generate_docs` | Documentação de modding auto-gerada a partir do mod API | Universal |

#### 4.13.12 Replay System

| Tool | Descrição | Referência |
|------|-----------|-----------|
| `replay.generate_recorder` | Input recording: timestamped inputs, deterministic, serialize/deserialize, file size cap | Rocket League |
| `replay.generate_playback` | Playback: reproduzir inputs, speed control (0.25x-4x), timeline scrub, free camera | Universal |
| `replay.generate_killcam` | Killcam: circular buffer últimos N segundos, camera override, slow motion, replay | CoD, Overwatch |

**Total Phase D6: +48 tools**

**Prioridade de implementação (dentro da Phase D6):**
1. **State Machines** (3) — fundação que todo sistema usa
2. **Combat Systems** (5) — core da maioria dos jogos
3. **Camera Systems** (4) — todo jogo precisa, sempre refeito do zero
4. **Inventory** (4) — RPG, survival, action — ubíquo
5. **Debug Tools** (4) — dev precisa desde o dia 1
6. **Progression/Economy** (5) — retention loop, monetização depende
7. **Navigation** (3) — AI/NPC depende disso
8. **World Systems** (4) — polish que diferencia amador de pro
9. **Input/Controls** (3) — UX essencial para publicação
10. **Cutscene** (3) — narrativa precisa
11. **Modding** (3) — longevidade do jogo
12. **Replay** (3) — marketing + debugging + esports

---

## 5. Infraestrutura

### 5.1 API Key Management (✅ Completo)
- `ConfigManager`: env vars (primário) + `.godotforge/config.json` (fallback)
- 12 serviços suportados (atual): Anthropic, Sketchfab, Poly Haven, Rodin, Meshy, Tripo, Stability, OpenAI, ElevenLabs, Suno, Blockade Labs, HuggingFace
- +4 serviços planejados (Phase D2): Freesound, Mixamo/Adobe, itch.io, Kenney
- +5 serviços planejados (Phase D3): FMOD, Crowdin/POEditor, Steam (SteamCMD), OBS, itch.io Butler
- +3 serviços planejados (Tier 3): Wwise, Substance, Linear
- +4 serviços planejados (Phase D4): Nakama, Supabase, PlayFab, Discord Webhook
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

### 5.5 Auto-Provision & Version Management (✅ Completo)
- Godot plugin auto-copied to project `addons/godotforge/` on create/switch
- Blender addon auto-installed to `AppData/.../addons/godotforge/` on startup
- Version comparison (semver): auto-updates when bundled > installed
- `GET /version` endpoint: bundled vs installed versions + outdated flags
- `GET /connections` endpoint: real-time health check (MCP :6980, Godot :6970, Blender :8400)

### 5.6 Web Settings & Config (✅ Completo)
- Config JSON editor (GET/PUT `/config`) with raw JSON editing
- 12 services in 6 tabbed categories (LLM, Assets, 3D Gen, Image, Audio, Other)
- Cross-component sync (config editor auto-refreshes on settings change)
- Connection status in sidebar (green/yellow/red dots with outdated indicator)

---

## 6. Game Studio Expansion (Phases E-K)

### 6.1 Phase E — Game Studio Rules

Rules for game development domains not yet covered:

| Rule | Domain | Key Points |
|------|--------|------------|
| `ai-code.md` | AI behavior | 2ms/frame budget, behavior trees, data-driven params, debug visualization |
| `network-code.md` | Multiplayer | Server-authoritative, client prediction + rollback, bandwidth budgets |
| `ui-code.md` | Game UI | UI never owns state, localization, dual input (KB+gamepad), accessibility |
| `prototype-code.md` | Prototyping | Relaxed standards, mandatory README with hypothesis, no prod imports |
| `test-standards.md` | Testing | `test_[system]_[scenario]_[expected]`, arrange/act/assert, regression tests |
| `data-files.md` | Game data | JSON schema validation, versioned formats, migration scripts |
| `narrative.md` | Dialogue/story | Branching structure, localization-ready, variable interpolation |

### 6.2 Phase F — Game Studio Skills

Skills for game development workflows:

| Skill | Description |
|-------|-------------|
| `/balance-check` | Analyze game balance: DPS, TTK, economy faucets/sinks, progression curves, outlier detection |
| `/brainstorm [genre]` | 6-phase concept generation: discovery → 3 concepts → core loop → pillars → player types → scope |
| `/perf-profile [system\|full]` | Performance analysis: CPU/memory/rendering/I-O budgets, top-3 bottlenecks |
| `/tech-debt [scan\|prioritize]` | Scan TODO/FIXME, duplication, oversized files; score by `(impact × frequency) / effort` |
| `/sprint-plan [new\|status]` | Sprint planning: must/should/nice-to-have with 20% buffer, carryover, risks |
| `/playtest-report [new\|analyze]` | Structured playtest template, cross-reference findings against design docs |
| `/design-system` | Design a new game system from scratch (8-section GDD) |
| `/reverse-document` | Generate design docs from existing code |

### 6.3 Phase G — Studio Hooks

Session lifecycle and validation hooks:

| Hook | Trigger | Purpose |
|------|---------|---------|
| `session-start.sh` | SessionStart | Show branch, last commits, active sprint, TODO count, recover session state |
| `session-stop.sh` | Stop | Archive active session, record uncommitted changes |
| `pre-compact.sh` | PreCompact | Dump session state before context compression |
| `detect-gaps.sh` | SessionStart | Detect missing docs, undocumented prototypes, missing ADRs |
| `validate-assets.sh` | PostToolUse (Write) | Enforce lowercase_underscore naming, validate JSON data files |

### 6.4 Phase H — Document Templates (27)

Standardized templates for game development documentation:

**Pre-production**: game-concept.md, game-pillars.md, pitch-document.md
**Design**: game-design-document.md, technical-design-document.md, level-design-document.md, economy-model.md, balance-sheet.md
**Art & Audio**: art-bible.md, sound-bible.md
**Narrative**: narrative-character-sheet.md, faction-design.md
**Production**: sprint-plan.md, milestone-definition.md, architecture-decision-record.md
**QA**: test-plan.md, playtest-report.md, bug-report.md
**Release**: changelog-template.md, release-notes.md, patch-notes.md, post-mortem.md
**Operations**: incident-response.md, risk-register-entry.md, onboarding-guide.md

### 6.5 Phase I — Specialized Agents

Sub-agents with defined roles, collaboration protocols, and escalation paths:

**Engineering**: godot-specialist, gdscript-specialist, shader-specialist, gdextension-specialist, gameplay-programmer, engine-programmer, tools-programmer, performance-analyst
**Design**: economy-designer, level-designer, systems-designer, prototyper
**Art**: technical-artist (Blender↔Godot pipeline bridge)
**Narrative**: narrative-director, writer, world-builder
**Audio**: sound-designer, audio-director
**QA**: qa-lead, qa-tester, accessibility-specialist

### 6.6 Phase J — Team Orchestration Skills

Multi-agent pipeline skills with user approval gates:

| Skill | Agents Orchestrated |
|-------|-------------------|
| `/team-combat` | game-designer, gameplay-programmer, ai-programmer, technical-artist, sound-designer, qa-tester |
| `/team-narrative` | narrative-director, writer, world-builder, sound-designer |
| `/team-ui` | systems-designer, gameplay-programmer, technical-artist, accessibility-specialist |
| `/team-level` | level-designer, technical-artist, sound-designer, qa-tester |
| `/team-polish` | performance-analyst, technical-artist, sound-designer, qa-tester |
| `/team-audio` | audio-director, sound-designer, technical-artist |
| `/team-release` | qa-lead, tools-programmer, performance-analyst |

### 6.7 Phase K — Production Skills

Project management and production workflow skills:

| Skill | Description |
|-------|-------------|
| `/milestone-review` | Review milestone completion, flag blockers |
| `/retrospective` | Sprint retrospective: what worked, what didn't, action items |
| `/estimate` | Effort estimation for features/tasks |
| `/gate-check` | Verify milestone gate criteria before advancing |
| `/localize [scan\|extract\|validate]` | Detect hardcoded strings, extract for translation, validate placeholders |
| `/map-systems` | Generate systems dependency map |
| `/project-stage-detect` | Classify project stage (Concept→Release, 7 stages), identify gaps |
| `/onboard` | Generate new contributor onboarding guide |

---

## 7. Roadmap V2

| Fase | Escopo | Tools | Status |
|------|--------|-------|--------|
| **A. Blender Integration Base** | Addon + bridge + 17 tools + pipeline | 17 + 1 | ✅ |
| **B. Pipeline Completo** | +22 Blender tools (anim, render, collision) + 3 pipeline | +22 + 3 | ✅ |
| **C. Asset Services** | Poly Haven + Sketchfab + OpenGameArt + download + list | +7 | ✅ |
| **Config & Dashboard** | ConfigManager + Web Dashboard + API keys | +1 | ✅ |
| **Web Copilot** | React + Tailwind + shadcn chat interface | — | ✅ |
| **Blender Copilot** | Python sidebar chat panel | — | ✅ |
| **CLI Fix** | Claude CLI tool execution via MCP | — | ✅ |
| **Web Polish** | Config editor, connections status, service tabs, auto-provision | — | ✅ |
| **Auto-Provision** | Godot plugin + Blender addon auto-install + version update | — | ✅ |
| **Visual Validation** | Game screenshots, runtime state, input simulation via EditorDebuggerPlugin IPC | +3 | ✅ |
| **D. AI Generators** | 3D gen, textures, sprites, audio, music, skybox | +9 | Pendente |
| **D2. Asset Library Expansion** | Kenney, ambientCG, Freesound, Mixamo, itch.io, Sonniss, jsfxr, Godot Asset Library + paid aggregators | +14 | Pendente |
| **D3. Game Dev Toolchain** | Audio (jsfxr+FFmpeg), Narrative (ink+Yarn), Level (LDtk+Tiled), Sprite (Aseprite), Distribution (Butler+Steam+CI), Media (GIF+OBS), FMOD, Image (Krita+GIMP+ImageMagick), L10n, Testing (GdUnit4+screenshot diff), Material Maker | +52 | Pendente |
| **D4. Game Studio Systems** | Genre Templates (10), Store/Marketing (6), Save System (4), Accessibility (5), Runtime AI NPCs (5), Playtesting (5), Multiplayer Backend (6), Monetization (4) | +53 | Pendente |
| **D5. Game Polish & Intelligence** | VFX Presets (4), Theme System (4), Audio System Gen (4), Tutorial Gen (3), Perf Budgets (5), Cross-Project Intel (4), VCS Inteligente (4), Addon Packaging (3) | +37 | Pendente |
| **D6. Game Systems Generator** | Inventory (4), Combat (5), State Machines (3), Camera (4), Navigation (3), Progression (5), World (4), Debug (4), Cutscene (3), Input (3), Modding (3), Replay (3) | +48 | Pendente |
| **E. Game Studio Rules** | ai-code, network-code, ui-code, prototype-code, test-standards, data-files, narrative (7 rules) | — | ✅ |
| **F. Game Studio Skills** | /balance-check, /brainstorm, /perf-profile, /tech-debt, /sprint-plan, /playtest-report, /design-system, /reverse-document (8 skills) | — | ✅ |
| **G. Studio Hooks** | session-start, session-stop, pre-compact, detect-gaps, validate-assets (5 hooks) | — | ✅ |
| **H. Doc Templates** | GDD, ADR, sprint-plan, economy-model, art-bible, playtest-report (27 templates) | — | Pendente |
| **I. Specialized Agents** | godot-specialist, economy-designer, performance-analyst, technical-artist, narrative-director | — | Pendente |
| **J. Team Orchestration** | /team-combat, /team-narrative, /team-ui, /team-level, /team-polish, /team-audio | — | Pendente |
| **K. Production Skills** | /milestone-review, /retrospective, /estimate, /gate-check, /localize, /map-systems | — | Pendente |
| **L. Polish & Launch** | npm publish, README, Asset Library, docs | — | Pendente |

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
| Toolchain CLIs | Aseprite, FFmpeg, inklecate, ysc, Butler, SteamCMD, ImageMagick, Godot headless — Phase D3 |
| Toolchain APIs | FMOD Studio (JS), OBS (WebSocket v5), Crowdin (REST), Krita/GIMP (scripting) — Phase D3 |
| Toolchain Local | jsfxr (npm), WFC/dungeon gen (TS), Material Maker (JSON), CSV/PO parsers — Phase D3 |
| Studio Systems | Genre templates (code gen), Runtime AI (Claude API), Save/Settings gen, A11y audit — Phase D4 |
| Backend APIs | Nakama (REST), Supabase (REST), PlayFab (REST), Discord (Webhook) — Phase D4 |
| Store/Marketing | itch.io API, presskit gen (HTML), devlog gen (LLM + git) — Phase D4 |
| Polish & Intel | VFX presets (scene gen), Theme (.tres gen), perf budgets (static analysis), cross-project memory (~/.godotforge/) — Phase D5 |
| Storage | SQLite FTS5 (docs, memory) + filesystem (assets) |
| Config | env vars + .godotforge/config.json (gitignored) |

---

## 8. Métricas V2

| Métrica | Target | Atual |
|---------|--------|-------|
| Total tools | 315+ | 88 atual + 9 AI + 14 asset + 52 toolchain + 53 studio + 37 polish + 48 systems + 14 tier3 → 315 |
| Interfaces | 4 | 4 ✅ (CLI, Godot, Blender, Web) |
| Rules | 24 | 24 ✅ (17 engineering + 7 game studio) |
| Skills | 20+ | 17 ✅ (9 existing + 8 game studio) |
| Hooks | 8 | 8 ✅ (3 engineering + 5 studio) |
| Doc templates | 27 | 0 (Phase H) |
| Specialized agents | 20+ | 0 (Phase I) |
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
| Asset Libraries | ✅ 3 integradas + 14 planejadas (Kenney, ambientCG, Freesound, Mixamo, Godot AL, itch.io, jsfxr, etc.) | Blender MCP (só Poly Haven) |
| AI Generation | Phase D (+9 tools) | ❌ Ninguém integrado |
| Game Dev Toolchain | Phase D3 (+52 tools: audio, narrative, level, sprite, CI/CD, testing, l10n) | ❌ Ninguém |
| Genre Templates | Phase D4 (10 templates: platformer, RPG, roguelike, FPS, VN, card, racing, TD, metroidvania, puzzle) | ❌ Ninguém (automação completa) |
| Store/Marketing | Phase D4 (6 tools: store page, presskit, devlog, changelog) | ❌ Ninguém |
| Runtime AI NPCs | Phase D4 (5 tools: NPC brains, dynamic dialogue, behavior trees, quest gen) | ❌ Ninguém integrado |
| Multiplayer Backend | Phase D4 (6 tools: Nakama, Supabase, PlayFab, netcode, lobby, server) | ❌ Ninguém |
| Accessibility | Phase D4 (5 tools: audit, options menu, colorblind shader, screen reader) | ❌ Ninguém |
| Save System Gen | Phase D4 (4 tools: save manager, settings menu, migration, autosave) | ❌ Ninguém |
| VFX Presets & Juice | Phase D5 (4 tools: particles, screen effects, trails, auto-juice) | ❌ Ninguém (automação) |
| Design Token System | Phase D5 (4 tools: theme gen, UI kit, palette, reference extraction) | ❌ Ninguém |
| Audio System Gen | Phase D5 (4 tools: manager, adaptive music, footsteps, auto-assign) | ❌ Ninguém |
| Tutorial Generator | Phase D5 (3 tools: tutorial framework, tooltips, hint system) | ❌ Ninguém |
| Performance Budgets | Phase D5 (5 tools: set/check budgets, optimize textures/scenes, mobile audit) | ❌ Ninguém |
| Cross-Project Intel | Phase D5 (4 tools: export/import patterns, global memory, benchmarks) | ❌ Ninguém — **moat definitivo** |
| Addon Packaging | Phase D5 (3 tools: package, publish, extract from scene) | ❌ Ninguém (automação) |
| Game Systems Gen | Phase D6 (48 tools: inventory, combat, camera, state machines, quests, economy, weather, replay, modding, debug) | ❌ Ninguém — code gen completo |
| Hub unificado (4 interfaces) | ✅ CLI + Godot + Blender + Web | ❌ Ninguém |
| Memory persistente | ✅ FTS5 + 50KB cap + archive | ❌ Ninguém |
| Docs-aware | ✅ 912 classes FTS5 | ❌ Ninguém |
| Web Copilot | ✅ React + shadcn | ❌ Ninguém |
| API Key Manager | ✅ 12 serviços + dashboard | ❌ Ninguém |

| Game Studio Rules | Phase E (7 rules) | Claude-Code-Game-Studios (11 rules, 0 tools) |
| Game Studio Skills | Phase F-K (20+ skills) | Claude-Code-Game-Studios (37 skills, 0 tools) |
| Specialized Agents | Phase I (20+ agents) | Claude-Code-Game-Studios (48 agents, 0 tools) |
| Doc Templates | Phase H (27 templates) | Claude-Code-Game-Studios (27 templates) |
| Session Lifecycle | Phase G (5 hooks) | Claude-Code-Game-Studios (5 hooks) |
| Auto-Provision | ✅ Plugin + addon auto-install + version update | ❌ Ninguém |

**GodotForge V2 é o primeiro hub de desenvolvimento de jogos com IA que orquestra engine + DCC + assets numa pipeline unificada com 4 interfaces. Phases E-K expandem para um game studio completo com rules, skills, agents, templates e workflows de produção.**
