# GodotForge V2 — Product Requirements Document

> **Version**: 2.0.0 | **Date**: 2026-03-28 | **Status**: Planning
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

O dev fala com UM copilot e ele coordena tudo.

---

## 2. Arquitetura V2

```
Claude Code / Cursor / Chat Nativo (Godot)
                    │
                    ▼
    ┌──────────────────────────────────┐
    │   GodotForge Hub (TypeScript)    │
    │   MCP Server + HTTP API          │
    │                                  │
    │   ┌────────────────────────────┐ │
    │   │     Tool Router            │ │
    │   │  godot.* → Godot Plugin    │ │
    │   │  blender.* → Blender Addon │ │
    │   │  asset.* → Asset Services  │ │
    │   │  ai.* → AI Generators      │ │
    │   └────────────────────────────┘ │
    │                                  │
    │   ┌──────────┐ ┌──────────────┐ │
    │   │ Docs     │ │ Memory       │ │
    │   │ Engine   │ │ Engine       │ │
    │   └──────────┘ └──────────────┘ │
    │   ┌──────────┐ ┌──────────────┐ │
    │   │ Context  │ │ Pipeline     │ │
    │   │ Builder  │ │ Manager      │ │
    │   └──────────┘ └──────────────┘ │
    └─────┬──────┬──────┬──────┬──────┘
          │      │      │      │
          ▼      ▼      ▼      ▼
    ┌────────┐┌────────┐┌────────┐┌──────────┐
    │ Godot  ││Blender ││ Asset  ││   AI     │
    │ Plugin ││ Addon  ││Services││Generators│
    │ :6970  ││ :8400  ││ APIs   ││  APIs    │
    │        ││        ││        ││          │
    │ 32     ││ 50+    ││ Poly   ││ Rodin    │
    │ tools  ││ tools  ││ Haven  ││ Hunyuan  │
    │ GDScrip││ bpy    ││ Sketch ││ Meshy    │
    │        ││ Python ││ fab    ││ Tripo    │
    │ Scenes ││ Models ││ OpenGA ││ StableDif│
    │ Nodes  ││ Materi ││        ││ DALL-E   │
    │ Script ││ Anim   ││        ││ ElevenLab│
    │ Runtime││ Export  ││        ││ Suno     │
    └────────┘└────────┘└────────┘└──────────┘
```

---

## 3. Módulos

### 3.1 Godot Module (V1 — ✅ Completo)

32 tools existentes: cenas, nós, scripts, runtime, editor, docs, memory.

### 3.2 Blender Module (V2 — Novo)

#### 3.2.1 Blender Addon (Python)

Plugin Python para Blender que expõe socket server (:8400):
- Recebe comandos JSON do Hub
- Executa via `bpy` API
- Retorna resultados

#### 3.2.2 Blender Tools (~50 tools)

**Modelagem (12)**
| Tool | Descrição |
|------|-----------|
| `blender.create_mesh` | Criar mesh primitivo (cube, sphere, cylinder, plane) |
| `blender.extrude` | Extrudar faces/edges |
| `blender.subdivide` | Subdividir mesh |
| `blender.boolean` | Operação booleana (union, difference, intersect) |
| `blender.modify` | Aplicar modifier (mirror, array, solidify, bevel) |
| `blender.sculpt` | Operação de sculpt (grab, smooth, inflate) |
| `blender.delete_object` | Deletar objeto |
| `blender.duplicate_object` | Duplicar objeto |
| `blender.transform` | Mover/rotacionar/escalar objeto |
| `blender.set_origin` | Definir origin do objeto |
| `blender.join_objects` | Juntar objetos em um |
| `blender.separate_mesh` | Separar mesh por material/loose parts |

**Materiais (8)**
| Tool | Descrição |
|------|-----------|
| `blender.create_material` | Criar material PBR |
| `blender.set_material_color` | Definir cor base |
| `blender.set_material_texture` | Atribuir textura a canal (albedo, normal, roughness) |
| `blender.assign_material` | Atribuir material a objeto/face |
| `blender.create_shader_nodes` | Criar node tree de shader |
| `blender.bake_textures` | Bake de texturas (diffuse, normal, AO) |
| `blender.list_materials` | Listar materiais da cena |
| `blender.delete_material` | Remover material |

**Animação (8)**
| Tool | Descrição |
|------|-----------|
| `blender.create_armature` | Criar esqueleto |
| `blender.add_bone` | Adicionar bone ao armature |
| `blender.parent_to_armature` | Parentear mesh ao armature (with weights) |
| `blender.insert_keyframe` | Inserir keyframe (location, rotation, scale) |
| `blender.create_animation` | Criar action/animation clip |
| `blender.set_animation_range` | Definir frame range |
| `blender.auto_weight_paint` | Auto weight paint |
| `blender.list_animations` | Listar animations/actions |

**UV & Textura (4)**
| Tool | Descrição |
|------|-----------|
| `blender.unwrap_uv` | Fazer UV unwrap |
| `blender.smart_uv_project` | Smart UV projection |
| `blender.pack_uv_islands` | Pack UV islands |
| `blender.set_uv_map` | Selecionar UV map ativo |

**Cena & Render (6)**
| Tool | Descrição |
|------|-----------|
| `blender.set_camera` | Posicionar/configurar câmera |
| `blender.set_light` | Adicionar/configurar luz |
| `blender.render_image` | Renderizar imagem |
| `blender.set_render_settings` | Configurar resolution, samples, engine |
| `blender.get_scene_objects` | Listar objetos da cena |
| `blender.get_object_properties` | Ler propriedades de objeto |

**Export (4)**
| Tool | Descrição |
|------|-----------|
| `blender.export_gltf` | Exportar como GLTF/GLB |
| `blender.export_fbx` | Exportar como FBX |
| `blender.export_obj` | Exportar como OBJ |
| `blender.export_for_godot` | Export otimizado para Godot (GLTF + collision hints) |

**Script (2)**
| Tool | Descrição |
|------|-----------|
| `blender.execute_python` | Executar Python/bpy arbitrário (escape hatch) |
| `blender.get_blender_info` | Versão, cena atual, objetos |

### 3.3 Pipeline Module (V2 — Novo)

Orquestra o fluxo de assets entre Blender e Godot.

| Tool | Descrição |
|------|-----------|
| `pipeline.blender_to_godot` | Export Blender → GLTF → Import Godot (completo) |
| `pipeline.sync_materials` | Converter materiais Blender → Godot materials |
| `pipeline.sync_animations` | Converter animations → Godot AnimationPlayer |
| `pipeline.sync_collision` | Gerar collision shapes a partir da mesh Blender |
| `pipeline.watch_changes` | Watch Blender file → auto-reimport no Godot |
| `pipeline.batch_import` | Importar múltiplos assets de uma vez |

### 3.4 Asset Services Module (V2 — Novo)

Integração com bibliotecas de assets gratuitas e pagas.

| Tool | Descrição | API |
|------|-----------|-----|
| `assets.search_polyhaven` | Buscar texturas/modelos/HDRIs | polyhaven.com API |
| `assets.download_polyhaven` | Baixar asset do Poly Haven | polyhaven.com API |
| `assets.search_sketchfab` | Buscar modelos 3D | Sketchfab API |
| `assets.download_sketchfab` | Baixar modelo do Sketchfab | Sketchfab API |
| `assets.search_opengameart` | Buscar sprites/sounds/music | OpenGameArt |
| `assets.download_asset` | Download genérico + import no projeto |
| `assets.list_local_assets` | Listar assets já baixados |

### 3.5 AI Generators Module (V2 — Novo)

Geração de assets via IA.

| Tool | Descrição | Provider |
|------|-----------|----------|
| `ai.generate_3d_model` | Gerar modelo 3D a partir de prompt | Rodin, Hunyuan, Meshy, Tripo |
| `ai.generate_texture` | Gerar textura PBR a partir de prompt | Stable Diffusion, DALL-E |
| `ai.generate_sprite` | Gerar sprite 2D a partir de prompt | Stable Diffusion, DALL-E |
| `ai.generate_spritesheet` | Gerar spritesheet animado | Stable Diffusion |
| `ai.generate_sound` | Gerar efeito sonoro a partir de prompt | ElevenLabs, Bark |
| `ai.generate_music` | Gerar música de fundo | Suno, MusicGen |
| `ai.generate_skybox` | Gerar skybox/HDRI panorâmico | Blockade Labs |
| `ai.upscale_texture` | Upscale de textura com AI | Real-ESRGAN |
| `ai.remove_background` | Remover fundo de imagem | rembg |

---

## 4. Roadmap V2

### Fase A: Blender Integration Base (2-3 semanas)
1. Blender addon Python (socket server :8400)
2. Hub router no MCP server (godot.* / blender.* / pipeline.*)
3. 15 Blender tools essenciais (create_mesh, material, export_gltf, execute_python)
4. `pipeline.blender_to_godot` (export GLTF → import Godot)
5. Teste E2E: "Crie um cubo no Blender e importe no Godot"

### Fase B: Pipeline Completo (2-3 semanas)
1. +20 Blender tools (animação, UV, render)
2. Material sync (Blender PBR → Godot material)
3. Animation sync (Blender actions → Godot AnimationPlayer)
4. Collision generation (mesh → collision shapes)
5. Teste E2E: "Crie um personagem no Blender, anime, importe no Godot com collision"

### Fase C: Asset Services (1-2 semanas)
1. Poly Haven integration (texturas, modelos, HDRIs)
2. Sketchfab integration (modelos 3D)
3. Download + auto-import pipeline
4. Teste E2E: "Baixe uma textura de pedra do Poly Haven e aplique no chão"

### Fase D: AI Generators (2-3 semanas)
1. AI 3D model generation (Rodin/Meshy)
2. AI texture generation (Stable Diffusion)
3. AI sprite generation
4. AI sound effects
5. Teste E2E: "Gere um modelo 3D de espada e importe no Godot"

### Fase E: Polish & Launch
1. Documentation
2. npm publish
3. Asset Library
4. Landing page
5. Video demo

---

## 5. Exemplos de Uso V2

### Exemplo 1: Criar jogo 3D do zero
```
"Crie um jogo de plataforma 3D"

1. Hub → Blender: criar level blockout (cubo escalado como chão + rampas)
2. Hub → Blender: export GLTF
3. Hub → Pipeline: import no Godot
4. Hub → Godot: criar player CharacterBody3D com script de movimento
5. Hub → Godot: configurar câmera 3D
6. Hub → AI: gerar textura de grama para o chão
7. Hub → Pipeline: aplicar textura no Godot
8. Hub → Godot: rodar o jogo
```

### Exemplo 2: Criar personagem
```
"Crie um personagem guerreiro"

1. Hub → AI: gerar modelo 3D "low-poly warrior character"
2. Hub → Blender: importar modelo, limpar mesh, criar armature
3. Hub → Blender: auto weight paint
4. Hub → Blender: criar animações (idle, walk, attack)
5. Hub → Pipeline: export para Godot com animações
6. Hub → Godot: configurar AnimationPlayer + state machine
```

### Exemplo 3: Criar item com textura
```
"Crie uma espada com textura metálica"

1. Hub → Blender: modelar espada (cilindro + cubo + scale)
2. Hub → Blender: UV unwrap
3. Hub → AI: gerar textura "metal sword blade worn battle"
4. Hub → Blender: aplicar textura ao material
5. Hub → Blender: bake normal map
6. Hub → Pipeline: export para Godot
```

---

## 6. Tech Stack V2

| Componente | Tecnologia |
|-----------|-----------|
| Hub MCP Server | TypeScript (Node.js 22+) — extensão do V1 |
| Godot Plugin | GDScript (V1, mantido) |
| Blender Addon | Python (bpy API) |
| Comunicação Blender | Socket JSON (:8400) |
| Comunicação Godot | HTTP REST (:6970) |
| Pipeline | TypeScript (GLTF processing, file copying) |
| Asset APIs | REST (Poly Haven, Sketchfab, OpenGameArt) |
| AI APIs | REST (Rodin, Stable Diffusion, ElevenLabs) |
| Storage | SQLite (docs, memory) + filesystem (assets) |

---

## 7. Métricas V2

| Métrica | Target |
|---------|--------|
| Total tools | 100+ (32 Godot + 50 Blender + 6 Pipeline + 7 Assets + 9 AI) |
| Blender → Godot pipeline time | < 30s para modelo simples |
| AI generation → in-game | < 2 min |
| Installs | 1000 em 60 dias |
| Games created with V2 | 10 community showcases |

---

## 8. Diferencial Competitivo

| Feature | GodotForge V2 | Concorrentes |
|---------|---------------|-------------|
| Godot MCP | ✅ 32 tools | Vários (parciais) |
| Blender MCP | ✅ 50 tools | ahujasid (22), poly-mcp (51) |
| Pipeline Blender→Godot | ✅ Automático | ❌ Ninguém |
| Asset Libraries | ✅ Poly Haven, Sketchfab | Blender MCP (só Poly Haven) |
| AI Generation | ✅ 3D, textura, sprite, som | ❌ Ninguém integrado |
| Hub unificado | ✅ Um MCP para tudo | ❌ Ninguém |
| Memory persistente | ✅ FTS5 | ❌ Ninguém |
| Docs-aware | ✅ 912 classes FTS5 | ❌ Ninguém |

**GodotForge V2 é o primeiro hub de desenvolvimento de jogos com IA que orquestra engine + DCC + assets + AI numa pipeline unificada.**
