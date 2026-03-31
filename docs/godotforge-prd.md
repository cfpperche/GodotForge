# GodotForge — Product Requirements Document (PRD)

> **Version**: 1.0.0 | **Date**: 2026-03-31 | **Status**: In Development
>
> **Docs relacionados**: [Concept Brief](./godotforge-concept-brief.md) · [Opportunity Map](./godotforge-opportunity-map.md) · [Handoff](./godotforge-handoff.md) · [ADRs](./decisions/)

---

## 1. Visao do Produto

GodotForge e um **AI Game Development Hub** que orquestra Godot Engine, Blender e 10+ servicos de IA (geradores de imagem, 3D, audio, musica) atraves de um MCP server unificado com 154+ tools. 4 interfaces (Claude Code, Godot chat, Blender chat, Web copilot) compartilham as mesmas ferramentas, memoria e contexto.

### 1.1 Proposta de Valor

- **Para indie devs**: crie jogos completos com assistencia de IA dentro do Godot
- **Para usuarios Max/Pro**: aproveite sua assinatura Claude via Claude Code ou Cursor
- **Para estudios pequenos**: contexto de projeto compartilhado, memoria persistente e docs version-aware

---

## 2. Arquitetura

### 2.1 Componentes

```
Web Copilot (React :5173) ──────────┐
Claude Code / Cursor ──► MCP (stdio)──┤
Godot Chat Panel ──► MCP (HTTP :6980)──┤──► Godot Plugin HTTP :6970
Blender Chat Panel ──► MCP (HTTP :6980)──┤──► Blender Addon TCP :8400
                                         │
                                         ├── Claude API / Claude CLI (LLM)
                                         ├── Docs Engine (SQLite FTS5, 912 Godot + 3800 Blender classes)
                                         ├── Memory Engine (FTS5 + markdown, 50KB cap)
                                         ├── Context Builder (8K token budget)
                                         ├── ConfigManager (env vars + config.json, 14 services)
                                         ├── Asset Services (Poly Haven, Sketchfab, OpenGameArt, ambientCG, Freesound, Godot AL)
                                         ├── AI Generators (10 services + fal.ai gateway, 55 tools)
                                         ├── Pipeline (Blender → Godot asset flow)
                                         ├── Guardrails (4 risk levels, 3 permission modes)
                                         ├── Event Log (JSONL audit + webhooks)
                                         ├── File Browser API (tree, preview, edit, WebSocket live updates)
                                         └── Web Dashboard (/dashboard)
```

### 2.2 Modos de Autenticacao

| Modo | Mecanismo | Custo para o usuario |
|------|-----------|---------------------|
| Claude Code (Max/Pro) | MCP server — Claude Code gerencia auth | Assinatura existente |
| Cursor | MCP server — Cursor gerencia auth | Assinatura Cursor |
| Chat nativo | API key direto no plugin | Pay-per-token |

**Regra**: GodotForge nunca toca em tokens OAuth. E apenas um tool provider.

---

## 3. Requisitos Funcionais

### 3.1 Plugin Godot (GDScript)

#### 3.1.1 HTTP Server Bridge
- **RF-01**: TCPServer em `127.0.0.1:6970` (fallback: +1 ate 6979)
- **RF-02**: Port file em `.godot/godotforge.port` (auto-cleanup no exit)
- **RF-03**: Endpoints REST: `/health`, `/tools`, `/tools/{name}`, `/context/scene`, `/context/project`
- **RF-04**: CORS headers para clientes browser-based
- **RF-05**: Timeout de 2s por request, Connection: close

#### 3.1.2 Editor Tools (28)
| Tool | Descricao | API Godot |
|------|-----------|-----------|
| `create_scene` | Cria .tscn com root node | `PackedScene`, `ResourceSaver` |
| `get_scene_tree` | Retorna hierarquia da cena | `EditorInterface.get_edited_scene_root()` |
| `add_node` | Adiciona no filho | `node.add_child()`, `owner = root` |
| `set_property` | Seta propriedade de no | `node.set()` com conversao de tipos |
| `create_script` | Cria .gd e opcionalmente anexa | `FileAccess`, `node.set_script()` |
| `read_script` | Le conteudo de .gd | `FileAccess.open()` |
| + 22 mais | remove, rename, duplicate, move, edit_script, run/stop scene, screenshot, etc. | |

#### 3.1.3 Chat Panel Nativo
- **RF-06**: Bottom panel com input, mensagens, botao enviar
- **RF-07**: Suporte a Ctrl+Enter para enviar
- **RF-08**: Loop completo de tool_use: enviar → tool calls → executar → tool results → resposta
- **RF-09**: Auth via MCP server (API key ou Claude CLI)
- **RF-10**: Status de "Thinking..." durante requests
- **RF-11**: Mensagens com BBCode (user, assistant, tool, error)

#### 3.1.4 Conversao de Tipos
- **RF-12**: `{x, y}` → `Vector2`, `{x, y, z}` → `Vector3`
- **RF-13**: `{r, g, b, a}` → `Color`
- **RF-14**: Strings `res://...` → `ResourceLoader.load()`

### 3.2 MCP Server (TypeScript)

#### 3.2.1 Transporte
- **RF-15**: stdio transport (padrao) para Claude Code e Cursor
- **RF-16**: HTTP transport (:6980) para chat nativo + web copilot
- **RF-17**: Flag `--project-root` para especificar diretorio do projeto
- **RF-18**: Discovery automatica do project root via `project.godot`
- **RF-19**: SSE streaming via POST `/chat/stream`

#### 3.2.2 Tools (154+)
| Categoria | Count | Descricao |
|-----------|-------|-----------|
| Editor | 28 | Godot scene/node/script manipulation via plugin bridge |
| Local | 10 | Project context, file ops, docs search, memory |
| Blender | 39 | Modeling, materials, animation, render, export |
| Pipeline | 4 | Blender → Godot asset flow |
| Assets | 15 | Poly Haven, Sketchfab, OpenGameArt, ambientCG, Freesound, Godot AL, jsfxr |
| AI Generators | 55 | 10 services + fal.ai gateway |
| Config | 1 | Service status check |
| Blender Docs | 2 | bpy API search + class reference |

#### 3.2.3 Degradacao Graciosa
- **RF-20**: Editor tools retornam erro claro quando Godot nao esta aberto
- **RF-21**: Tools locais funcionam sem Godot (read_file, list_files, search_docs, memory)
- **RF-22**: `get_project_context` faz fallback lendo `project.godot` diretamente

#### 3.2.4 Seguranca
- **RF-23**: Path traversal prevention — todos os paths devem estar dentro do project root
- **RF-24**: HTTP server bind apenas em 127.0.0.1 (nunca 0.0.0.0)
- **RF-25**: Guardrails com 4 niveis de risco (safe/moderate/destructive/critical)
- **RF-26**: 3 modos de permissao (yolo/normal/strict)

### 3.3 Docs Engine

- **RF-27**: Parse XML class docs do Godot → SQLite FTS5 (912 classes indexadas)
- **RF-28**: Blender bpy API extraction (3800 classes, 106K members)
- **RF-29**: Suporte a versoes 4.1-4.6 via download automatico do GitHub
- **RF-30**: Auto-RAG: context builder detecta classes mencionadas na conversa e pre-carrega docs

### 3.4 Memory & Context Engine

- **RF-31**: Memoria persistente em `.godotforge/memory.md` com categorias
- **RF-32**: FTS5 search em `.godotforge/memory.db`
- **RF-33**: 50KB cap com auto-archive para `.godotforge/archive/`
- **RF-34**: Context builder: 8000 tokens (memory 3000 + structure 2000 + scene 1500 + session 1500)
- **RF-35**: Compaction: quando sessao > 20 mensagens, sumariza antigas, mantem 6 recentes

### 3.5 AI Generators (55 tools)

| Servico | Tools | Descricao |
|---------|-------|-----------|
| Meshy | 8 | text/image-to-3D, refine, remesh, retexture |
| Stability AI | 13 | SD3, Ultra, Core, inpaint, outpaint, erase, recolor, sketch, style, upscale |
| ElevenLabs | 4 | TTS, SFX, voices, models |
| Tripo AI | 7 | text/image-to-3D, refine, animate, stylize |
| Suno | 4 | music gen, lyrics, check, credits |
| DALL-E | 3 | generate, edit, variation |
| Blockade Labs | 3 | skybox, styles, check |
| Rodin / Hyper3D | 2 | generate, check |
| Hugging Face | 1 | text-to-image |
| fal.ai Gateway | 12 | FLUX, SD3.5, SDXL, Rodin, Tripo, Trellis, Hunyuan3D, Stable Audio, Kokoro TTS, upscale, remove_bg |

### 3.6 Asset Services (15 tools)

| Servico | Tools | Descricao |
|---------|-------|-----------|
| Poly Haven | 2 | search + download (750+ textures/models/HDRIs) |
| Sketchfab | 2 | search + download (GLTF, token required) |
| OpenGameArt | 1 | search sprites/sounds/music |
| ambientCG | 2 | search + download (2000+ PBR materials CC0) |
| Godot Asset Library | 2 | search + download (official addons) |
| Freesound | 3 | search + preview + download (500K+ sounds) |
| jsfxr | 1 | local retro SFX generation |
| Generic | 2 | download any URL + list local assets |

### 3.7 Web Copilot (React)

- **RF-36**: Chat com SSE streaming + scroll virtualization (@tanstack/react-virtual)
- **RF-37**: File browser (tree + preview + CodeMirror 6 editor + WebSocket live updates)
- **RF-38**: Settings (API keys para 13+ servicos, guardrail modes)
- **RF-39**: Project switcher + onboarding wizard
- **RF-40**: Per-project chat context isolation

### 3.8 Infraestrutura

- **RF-41**: Event log JSONL (.godotforge/events.jsonl) — 10MB rotation x 3
- **RF-42**: Webhooks async — Telegram + Custom JSON, 3 retries com backoff
- **RF-43**: Auto-provision — plugin + addon auto-install + version update
- **RF-44**: Active project sync via `~/.godotforge/active-project`
- **RF-45**: Agent isolation — POST `/chat/agent` com system prompt dedicado

### 3.9 Studio Integration

- **RF-46**: 18 rules em `.claude/rules/` (engineering + game dev)
- **RF-47**: 30+ skills (game dev + production + team orchestration)
- **RF-48**: 20 specialized agents em `.claude/agents/`
- **RF-49**: 25 doc templates em `.claude/templates/`
- **RF-50**: MCP reads `.claude/` — parity with Claude Code CLI

---

## 4. Requisitos Nao-Funcionais

| Requisito | Especificacao |
|-----------|---------------|
| **Latencia** | Tool execution < 500ms (exceto create_scene e docs indexing) |
| **Compatibilidade** | Godot 4.1-4.6 |
| **Distribuicao Plugin** | Copy `addons/godotforge/` ou Asset Library |
| **Distribuicao MCP** | `npx godotforge-mcp@latest` |
| **Dependencias Plugin** | Zero (GDScript puro) |
| **Dependencias MCP** | Node.js 22+, `@modelcontextprotocol/sdk`, `zod`, `better-sqlite3`, `fast-xml-parser` |
| **Seguranca** | Localhost-only, sem secrets no wire, port file em .godot (gitignored) |
| **Plataformas** | Windows, macOS, Linux (onde Godot 4.x roda) |
| **Memory cap** | `memory.md` max 50KB; archive automatico quando exceder |
| **Blender → Godot pipeline** | < 30s (atual ~5s) |
| **Asset download → in-game** | < 1 min (atual ~15s) |

---

## 5. Roadmap

### Fases Concluidas

| Fase | Escopo | Tools | Status |
|------|--------|-------|--------|
| **1-3. Fundacao** | Plugin + MCP + Docs Engine | 13 | Done |
| **4. Memory** | Memory engine, context builder, compaction | 16 | Done |
| **5-9. Tools** | Advanced editor tools, runtime, polish, refactoring | 32 | Done |
| **A-B. Blender** | Addon + 39 tools + 4 pipeline tools | 78 | Done |
| **C. Assets** | Poly Haven, Sketchfab, OpenGameArt + config | 86 | Done |
| **D. AI Generators** | 10 services + fal.ai gateway (55 AI tools) | 146 | Done |
| **D2. Asset Expansion** | ambientCG, Godot AL, Freesound, jsfxr | 154+ | Done |
| **E-K. Studio** | Rules, skills, agents, templates, hooks, teams, production | 154+ | Done |
| **Web Copilot** | React + Tailwind + shadcn/ui, file browser, settings | — | Done |
| **Blender Copilot** | Python sidebar chat panel | — | Done |
| **Infra** | SSE streaming, agent isolation, guardrails, events, webhooks | — | Done |

### E2E Validacoes
- Flappy Bird (2D game, 32 Godot tools)
- Red metallic cube (Blender → GLB → Godot 3D scene)
- Rigged robot character (armature + walk animation + collision → Godot)
- Poly Haven textured scene (PBR textures + Blender rocks → Godot)
- Phase D AI Generators — 6 services E2E, 3 auth-only, 3 require paid
- Dungeon of Echoes — top-down 2D RPG (player, slimes AI, NPC dialogue, pickups, HUD)

### Proximas Fases

| Fase | Escopo | Tools | Status |
|------|--------|-------|--------|
| **L. Agent Teams** | Claude Code native multi-agent (parallel team skills) | — | Planejado |
| **M. Launch** | npm publish, README, Godot Asset Library | — | Planejado |

### Roadmap Futuro (D3-D6)

Expansoes planejadas para transformar GodotForge de ferramenta de desenvolvimento em plataforma completa de producao de jogos.

#### D3. Game Dev Toolchain (+52 tools)

| Categoria | Tools | Tecnologia |
|-----------|-------|-----------|
| Audio Pipeline | 6 | jsfxr (local) + FFmpeg CLI (convert, batch, trim, concat, analyze) |
| Narrative Engine | 5 | ink format + Yarn Spinner (create, compile, validate) |
| Level Design | 5 | LDtk + Tiled (create, import, procedural dungeon gen) |
| Sprite Pipeline | 5 | Aseprite CLI (export sheet, resize, palette swap, split layers, atlas) |
| Distribution | 5 | Godot export + itch.io Butler + GitHub Actions + Steam + version bump |
| Media Capture | 2 | FFmpeg (GIF, gameplay recording) |
| Audio Middleware | 3 | FMOD Studio (build banks, create/list events) |
| Image Processing | 4 | ImageMagick + Krita + GIMP (batch, atlas, export) |
| Localization | 5 | Extract strings, generate CSV, validate, auto-translate, Crowdin sync |
| Testing/QA | 4 | GdUnit4 (generate, run tests), screenshot diff, automated playtest |
| Procedural Materials | 2 | Material Maker (create graph, export .tres) |
| OBS Recording | 3 | OBS WebSocket v5 (start, stop, screenshot) |

#### D4. Game Studio Systems (+53 tools)

| Categoria | Tools | Descricao |
|-----------|-------|-----------|
| Genre Templates | 10 | Platformer, RPG, Roguelike, FPS, Visual Novel, Card Game, Racing, Tower Defense, Metroidvania, Puzzle |
| Store/Marketing | 6 | Store description, tags, presskit, itch.io update, devlog, public changelog |
| Save System | 4 | SaveManager, settings menu, migration, autosave |
| Accessibility | 5 | Audit, options menu, input check, colorblind shader, screen reader |
| Runtime AI NPCs | 5 | NPC brain, dialogue runtime, behavior tree, narrator, quest gen |
| Playtesting Loop | 5 | Feedback UI, telemetry, survey, Discord webhook, session analysis |
| Multiplayer Backend | 6 | Nakama, Supabase, PlayFab, netcode, lobby, dedicated server |
| Monetization | 4 | IAP, ads, economy design, shop UI |

#### D5. Game Polish & Intelligence (+37 tools)

| Categoria | Tools | Descricao |
|-----------|-------|-----------|
| VFX Presets & Juice | 4 | Particle presets, screen effects, trails, auto-juice |
| Design Tokens / Theme | 4 | Theme gen, UI kit, palette, reference extraction |
| Audio System Gen | 4 | AudioManager, adaptive music, footsteps, auto-assign |
| Tutorial Generator | 3 | Tutorial framework, tooltips, hint system |
| Performance Budgets | 5 | Set/check budgets, optimize textures/scenes, mobile audit |
| Cross-Project Intel | 4 | Export/import patterns, global memory, benchmarks |
| VCS Inteligente | 4 | Git LFS setup, conflict detection, smart branch, .gitignore |
| Addon Packaging | 3 | Package, publish, extract from scene |

#### D6. Game Systems Generator (+48 tools)

| Categoria | Tools | Referencia |
|-----------|-------|-----------|
| Inventory | 4 | Grid (Diablo), List (Skyrim), Hotbar (Minecraft), Item DB |
| Combat | 5 | Action (Hollow Knight), Turn-based (FF), Tactics (XCOM), Health, Loot tables |
| State Machines | 3 | Generic, AnimationTree, AI states |
| Camera | 4 | Follow, Orbit, Cutscene, Shake profiles |
| Navigation | 3 | Setup, Waypoints, Minimap |
| Progression | 5 | XP/leveling, Skill tree, Quests, Achievements, Currency/shop |
| World Systems | 4 | Day/night, Weather, Spawn, Destructibles |
| Debug Tools | 4 | In-game console, FPS counter, Cheats, Collision visualizer |
| Cutscene | 3 | Framework, Sequence from description, Letterbox |
| Input/Controls | 3 | Rebind menu, Dynamic icons, Combo system |
| Modding | 3 | Mod API, Loader, Auto-docs |
| Replay | 3 | Input recorder, Playback, Killcam |

**Total futuro: +190 tools → 344+ total**

---

## 6. Fase L — Agent Teams (Claude Code Native Multi-Agent)

> **Dependencia**: Requer `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` (Claude Code v2.1.32+).

### L.1 Motivacao

O GodotForge ja possui 20 agents e 7 team skills (`/team-*`) que orquestram pipelines multi-agent. A execucao atual e **sequencial** via `chatAsAgent()`. Agent Teams nativo oferece **paralelismo real**: teammates sao sessoes independentes com task list compartilhada.

### L.2 Abordagem Hibrida (recomendada)

```
Claude Code CLI (Lead)
  Tarefas rapidas/isoladas:
    → Subagents (.claude/agents/) via Agent tool
  Tarefas complexas/paralelas:
    → Agent Teams (teammates nativos, 154+ MCP tools cada)
  MCP chatAsAgent() (Web/Godot/Blender copilots):
    → Mantem como esta (interfaces nao-CLI)
```

### L.3 Composicoes de Team

| Cenario | Teammates | Dependencias |
|---------|-----------|-------------|
| Combat System | systems-designer, gameplay-programmer, technical-artist, sound-designer, qa-tester | design → [impl + vfx + audio] → qa |
| New Level | level-designer, technical-artist, sound-designer, qa-tester | layout → [art + audio] → qa |
| Narrative Arc | narrative-director, world-builder, writer, audio-director | narrative → [world + writing] → audio |
| UI Feature | systems-designer, gameplay-programmer, technical-artist, accessibility-specialist | design → impl → [polish + a11y] |
| Release | qa-lead, performance-analyst, tools-programmer | [qa + perf] → build |

### L.4 Metricas

| Metrica | Target |
|---------|--------|
| Tempo team skill (paralelo vs. sequencial) | -40% |
| Conflitos de arquivo entre teammates | < 5% |
| Quality gate pass rate | > 80% first try |

---

## 7. Metricas de Sucesso

| Metrica | Target (30 dias pos-lancamento) |
|---------|-------------------------------|
| Instalacoes do plugin | 500 |
| MCP server downloads (npm) | 300 |
| Usuarios ativos semanais | 100 |
| Tool executions/dia/user | 20+ |
| NPS | > 40 |
| Memory entries/projeto | 15+ apos 1 semana |
| Interfaces | 4 (CLI, Godot, Blender, Web) |
| Total tools (atual) | 154+ |
| Total tools (futuro) | 344+ |
| Rules | 18 |
| Skills | 30+ |
| Agents | 20 |
| Doc templates | 25 |

---

## 8. Riscos Tecnicos

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| GDScript TCPServer instavel | Medio | Localhost-only, 1 request por vez, Connection: close |
| MCP SDK breaking changes | Baixo | Pin versao, testes de integracao |
| Godot 4.7+ muda EditorInterface API | Medio | Abstracao em tool_base.gd |
| Port conflict | Baixo | Auto-increment 6970-6979, port file |
| Memory file cresce sem limite | Medio | Cap 50KB, archive automatico, compaction periodica |
| Agent Teams feature removida/mudada | Alto | Manter `chatAsAgent()` como fallback |
| Teammates conflitam no filesystem | Medio | Ownership maps por skill, particionamento de arquivos |
| Custo de tokens com teams | Medio | Limitar 3-5 teammates, usar Sonnet para teammates |

---

## 9. Diferencial Competitivo

| Feature | GodotForge | Concorrentes |
|---------|------------|-------------|
| Godot MCP (28 editor + 10 local) | Done | Varios (parciais) |
| Blender MCP (39 tools) | Done | ahujasid (22), poly-mcp (51) |
| Pipeline Blender→Godot | Done (4 tools) | Ninguem |
| Asset Libraries (6 servicos) | Done (15 tools) | Blender MCP (so Poly Haven) |
| AI Generation (10 servicos + fal.ai) | Done (55 tools) | Ninguem integrado |
| Hub unificado (4 interfaces) | Done | Ninguem |
| Memory persistente (FTS5) | Done | Ninguem |
| Docs-aware (912 Godot + 3800 Blender) | Done | Ninguem |
| Game studio (rules, skills, agents, templates) | Done | Claude-Code-Game-Studios (sem tools) |
| Game dev toolchain (D3-D6) | Planejado (+190 tools) | Ninguem |

**GodotForge e o primeiro hub de desenvolvimento de jogos com IA que orquestra engine + DCC + assets + AI generators numa pipeline unificada com 4 interfaces.**
