# GodotForge — Product Requirements Document (PRD)

> **Version**: 0.3.0 | **Date**: 2026-03-27 | **Status**: In Development
>
> **Docs relacionados**: [Concept Brief](./godotforge-concept-brief.md) · [Opportunity Map](./godotforge-opportunity-map.md) · [Handoff](./godotforge-handoff.md) · [ADRs](./decisions/)

---

## 1. Visão do Produto

GodotForge é um **AI Copilot para Godot** que combina um plugin nativo do editor com um MCP server, permitindo que desenvolvedores criem jogos com assistência de IA sem sair do Godot. É o único produto que oferece docs-aware (sem alucinações), memória persistente de projeto, manipulação direta do editor, e suporte a assinaturas Max/Pro via MCP.

### 1.1 Proposta de Valor

- **Para indie devs**: crie jogos completos com assistência de IA dentro do Godot
- **Para usuários Max/Pro**: aproveite sua assinatura Claude via Claude Code ou Cursor
- **Para estúdios pequenos**: contexto de projeto compartilhado, memória persistente e docs version-aware

---

## 2. Arquitetura Híbrida

### 2.1 Componentes

```
MCP Clients (Claude Code / Cursor / qualquer MCP client)
        │ stdio / SSE
        ▼
MCP Server (TypeScript, npx godotforge-mcp)
  - 14 MCP tools (6 editor + 5 local + 2 docs + 3 memory)  [target Fase 4]
  - Docs engine (SQLite FTS5, 912 classes Godot 4.x)
  - Memory engine (project memory + session logs)
  - Context builder (project scanner + token-budgeted injection)
        │ HTTP localhost:6970
        ▼
Godot Plugin (GDScript, addons/godotforge/)
  - HTTP server (TCPServer)
  - Tool registry (6 editor tools)
  - Chat panel nativo (API key mode)
  - Conversation compaction (memory flush)
```

### 2.2 Modos de Autenticação

| Modo | Mecanismo | Custo para o usuário |
|------|-----------|---------------------|
| Claude Code (Max/Pro) | MCP server — Claude Code gerencia auth | Assinatura existente |
| Cursor | MCP server — Cursor gerencia auth | Assinatura Cursor |
| Chat nativo | API key direto no plugin | Pay-per-token |

**Regra**: GodotForge nunca toca em tokens OAuth. É apenas um tool provider.

---

## 3. Requisitos Funcionais

### 3.1 Plugin Godot (GDScript)

#### 3.1.1 HTTP Server Bridge
- **RF-01**: TCPServer em `127.0.0.1:6970` (fallback: +1 até 6979)
- **RF-02**: Port file em `.godot/godotforge.port` (auto-cleanup no exit)
- **RF-03**: Endpoints REST: `/health`, `/tools`, `/tools/{name}`, `/context/scene`, `/context/project`
- **RF-04**: CORS headers para clientes browser-based
- **RF-05**: Timeout de 2s por request, Connection: close

#### 3.1.2 Editor Tools (6 implementados ✅)
| Tool | Descrição | API Godot |
|------|-----------|-----------|
| `create_scene` | Cria .tscn com root node | `PackedScene`, `ResourceSaver` |
| `get_scene_tree` | Retorna hierarquia da cena | `EditorInterface.get_edited_scene_root()` |
| `add_node` | Adiciona nó filho | `node.add_child()`, `owner = root` |
| `set_property` | Seta propriedade de nó | `node.set()` com conversão de tipos |
| `create_script` | Cria .gd e opcionalmente anexa | `FileAccess`, `node.set_script()` |
| `read_script` | Lê conteúdo de .gd | `FileAccess.open()` |

#### 3.1.3 Chat Panel Nativo
- **RF-06**: Bottom panel com input, mensagens, botão enviar
- **RF-07**: Suporte a Ctrl+Enter para enviar
- **RF-08**: Loop completo de tool_use: enviar → tool calls → executar → tool results → resposta
- **RF-09**: Dialog de API key com persistência em `.api_key` ou env `ANTHROPIC_API_KEY`
- **RF-10**: Status de "Thinking..." durante requests
- **RF-11**: Mensagens com BBCode (user, assistant, tool, error)

#### 3.1.4 Conversão de Tipos
- **RF-12**: `{x, y}` → `Vector2`, `{x, y, z}` → `Vector3`
- **RF-13**: `{r, g, b, a}` → `Color`
- **RF-14**: Strings `res://...` → `ResourceLoader.load()`

### 3.2 MCP Server (TypeScript)

#### 3.2.1 Transporte
- **RF-15**: stdio transport (padrão) para Claude Code e Cursor
- **RF-16**: Flag `--project-root` para especificar diretório do projeto
- **RF-17**: Discovery automática do project root via `project.godot`

#### 3.2.2 Tools (11 implementados ✅)
| Tool | Tipo | Descrição |
|------|------|-----------|
| `create_scene` | Editor (delegado) | Cria cena no Godot |
| `get_scene_tree` | Editor (delegado) | Árvore da cena atual |
| `add_node` | Editor (delegado) | Adiciona nó |
| `set_property` | Editor (delegado) | Seta propriedade |
| `create_script` | Editor (delegado) | Cria GDScript |
| `read_script` | Editor (delegado) | Lê GDScript |
| `get_project_context` | Local | Metadata do projeto |
| `read_file` | Local | Lê qualquer arquivo |
| `list_files` | Local | Lista diretórios |
| `search_docs` | Local (docs) | Busca FTS5 nos docs Godot |
| `get_class_reference` | Local (docs) | Referência completa de uma classe |

#### 3.2.3 Degradação Graciosa
- **RF-18**: Editor tools retornam erro claro quando Godot não está aberto
- **RF-19**: Tools locais funcionam sem Godot (read_file, list_files, search_docs, memory)
- **RF-20**: `get_project_context` faz fallback lendo `project.godot` diretamente

#### 3.2.4 Segurança
- **RF-21**: Path traversal prevention — todos os paths devem estar dentro do project root
- **RF-22**: HTTP server bind apenas em 127.0.0.1 (nunca 0.0.0.0)

### 3.3 Docs Engine (✅ Completo)

- **RF-23**: Parse XML class docs do Godot → SQLite FTS5 (912 classes indexadas)
- **RF-24**: Suporte a versões 4.1-4.6 via download automático do GitHub
- **RF-25**: DB em `~/.godotforge/docs-{version}.db`
- **RF-26**: Build automático no primeiro uso (~30s download + index)
- **RF-27**: Tools `search_docs` (FTS5 ranked) + `get_class_reference` (lookup completo)

### 3.4 Memory & Context Engine (Fase 4 — Próximo)

#### 3.4.1 Project Memory
- **RF-28**: Memória persistente em `res://.godotforge/memory.md` — armazena convenções, padrões, decisões como markdown estruturado com categorias
- **RF-29**: Session logs em `res://.godotforge/sessions/YYYY-MM-DD.md` — append-only, um por dia
- **RF-30**: Memória carregada no system prompt ao iniciar sessão (chat nativo) e via MCP resource (modo MCP)
- **RF-31**: Cap de 8000 tokens para injeção de contexto; prioridade: memória recente > estrutura do projeto > memória antiga

#### 3.4.2 Project Scanner
- **RF-32**: Scanner que constrói mapa estrutural do projeto: cenas, scripts, recursos, dependências
- **RF-33**: Cache do mapa em `res://.godotforge/project-map.json`, atualizado sob demanda

#### 3.4.3 Memory MCP Tools (+3 tools, total: 14)
- **RF-34**: `save_memory(category, content)` — persiste fato/padrão/decisão com timestamp ISO
- **RF-35**: `search_memory(query)` — busca FTS5 sobre entradas de memória (reutiliza infra SQLite)
- **RF-36**: `get_project_memory()` — retorna conteúdo completo da memória do projeto

#### 3.4.4 Conversation Compaction (Chat Nativo)
- **RF-37**: Quando mensagens > N (ex: 20), compactar mensagens antigas via summarização
- **RF-38**: Flush de decisões/padrões para `memory.md` antes da compactação
- **RF-39**: Manter as M mensagens mais recentes intactas (ex: 6)

---

## 4. Requisitos Não-Funcionais

| Requisito | Especificação |
|-----------|---------------|
| **Latência** | Tool execution < 500ms (exceto create_scene e docs indexing) |
| **Compatibilidade** | Godot 4.1-4.6 |
| **Distribuição Plugin** | Copy `addons/godotforge/` ou Asset Library |
| **Distribuição MCP** | `npx godotforge-mcp@latest` |
| **Dependências Plugin** | Zero (GDScript puro) |
| **Dependências MCP** | Node.js 22+, `@modelcontextprotocol/sdk`, `zod`, `better-sqlite3`, `fast-xml-parser` |
| **Segurança** | Localhost-only, sem secrets no wire, port file em .godot (gitignored) |
| **Plataformas** | Windows, macOS, Linux (onde Godot 4.x roda) |
| **Memory cap** | `memory.md` max 50KB; archive automático quando exceder |

---

## 5. Estrutura de Arquivos

```
GodotForge/
├── addons/godotforge/              # Plugin Godot (GDScript)
│   ├── plugin.cfg / plugin.gd      # Entry point
│   ├── api/
│   │   ├── http_server.gd          # TCPServer REST bridge
│   │   ├── claude_client.gd        # Claude API client (chat nativo)
│   │   ├── claude_tools.gd         # Tool definitions JSON
│   │   ├── conversation.gd         # Histórico + compaction
│   │   └── api_key_manager.gd      # API key persistence
│   ├── tools/
│   │   ├── tool_registry.gd        # Dispatch
│   │   ├── tool_base.gd            # Base class
│   │   ├── scene_tools.gd          # create_scene, get_scene_tree
│   │   ├── node_tools.gd           # add_node, set_property
│   │   └── script_tools.gd         # create_script, read_script
│   └── ui/
│       ├── chat_panel.gd           # Bottom panel chat
│       └── message_bubble.gd       # Message rendering
│
├── mcp-server/                     # MCP Server (TypeScript)
│   ├── package.json / tsconfig.json
│   └── src/
│       ├── index.ts                # CLI entry
│       ├── server.ts               # MCP server (14 tools target)
│       ├── bridge.ts               # HTTP client → plugin
│       ├── tools.ts                # Tool definitions
│       ├── docs/                   # Docs engine ✅
│       │   ├── types.ts / db.ts / parser.ts
│       │   ├── downloader.ts / indexer.ts / search.ts
│       ├── memory/                 # Memory engine (Fase 4)
│       │   ├── store.ts            # Read/write memory.md + sessions
│       │   └── search.ts           # FTS5 over memory entries
│       └── context/                # Context builder (Fase 4)
│           ├── builder.ts          # Token-budgeted context assembly
│           └── scanner.ts          # Project structure scanner
│
└── docs/                           # Documentação
    ├── godotforge-prd.md           # (este documento)
    ├── godotforge-concept-brief.md
    ├── godotforge-opportunity-map.md
    └── decisions/                  # ADRs
```

---

## 6. Fluxos de Uso

### 6.1 MCP Mode (Claude Code + Max plan)

```
1. Instala plugin no Godot + abre projeto
2. claude mcp add godotforge -- npx godotforge-mcp@latest
3. "Crie uma cena de player com CharacterBody2D"
4. Claude Code → MCP → bridge → plugin executa no editor
5. "Salve que este projeto usa tile-based movement"
6. Claude Code → MCP → save_memory → memory.md atualizado
7. Próxima sessão: contexto do projeto carregado automaticamente
```

### 6.2 Chat Nativo (API key)

```
1. Ativa plugin, cola API key
2. Chat injeta memory.md + project map no system prompt
3. "Adicione Sprite2D ao Player" → tool executa
4. Após 20+ mensagens → compaction automática
5. Decisões importantes salvas em memory.md antes de compactar
```

### 6.3 Degradação (Godot fechado)

```
1. "Liste os scripts" → list_files funciona
2. "Busque move_and_slide nos docs" → search_docs funciona
3. "Salve que usamos singletons para game state" → save_memory funciona
4. "Crie uma cena" → erro gracioso
```

---

## 7. Roadmap de Implementação

| Fase | Escopo | Tools | Status |
|------|--------|-------|--------|
| **1. Fundação** | Plugin 6 tools + chat + HTTP server | 6 | ✅ |
| **2. MCP Server** | TypeScript MCP + bridge + local tools | 11 | ✅ |
| **3. Docs Engine** | SQLite FTS5, 912 classes, version-aware | 11 | ✅ |
| **4. Memory & Context** | Project memory, context builder, compaction | 14 | ⬜ Próximo |
| **5. Tools Avançados** | remove_node, edit_script, rename, move, duplicate | 19 | ⬜ |
| **6. Runtime** | run_game, stop_game, screenshot, input sim | 23 | ⬜ |
| **7. Polish** | Streaming, command palette, settings UI, Asset Library | 23 | ⬜ |

### Fase 4 — Memory & Context (detalhe)

**4a. Project Memory (filesystem)**
- `res://.godotforge/memory.md` com seções: `## Conventions`, `## Patterns`, `## Decisions`, `## Architecture`
- `res://.godotforge/sessions/YYYY-MM-DD.md` append-only
- `.godotforge/` no `.gitignore` recomendado

**4b. Memory MCP Tools (+3 tools)**
- `save_memory(category, content)` — append com timestamp
- `search_memory(query)` — FTS5 search, reutiliza infra do docs engine
- `get_project_memory()` — retorna raw markdown

**4c. Context Builder**
- `mcp-server/src/context/scanner.ts` — walk project, build map
- `mcp-server/src/context/builder.ts` — assemble context payload, 8000 token cap
- Expor como MCP resource `godotforge://context`
- Chat nativo: injetar no system prompt

**4d. Conversation Compaction**
- `conversation.gd`: quando `messages.size() > 20`, summarize via Claude API
- Flush decisions para `save_memory` antes de compactar
- Manter 6 mensagens recentes intactas

---

## 8. Métricas de Sucesso

| Métrica | Target (30 dias pós-lançamento) |
|---------|-------------------------------|
| Instalações do plugin | 500 |
| MCP server downloads (npm) | 300 |
| Usuários ativos semanais | 100 |
| Conversão Free → Pro | 6% (30 users) |
| Tool executions/dia/user | 20+ |
| NPS | > 40 |
| Memory entries/projeto | 15+ após 1 semana de uso |
| Context hit rate | 80% das sessões carregam memória |

---

## 9. Riscos Técnicos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| GDScript TCPServer instável | Médio | Localhost-only, 1 request por vez, Connection: close |
| MCP SDK breaking changes | Baixo | Pin versão, testes de integração |
| Godot 4.7+ muda EditorInterface API | Médio | Abstração em tool_base.gd |
| Port conflict | Baixo | Auto-increment 6970-6979, port file |
| Claude API latência alta | Médio | Spinner na UI, timeout configurável |
| Memory file cresce sem limite | Médio | Cap 50KB, archive automático, compaction periódica |
| FTS5 memory index dessincroniza | Baixo | Re-index no startup, memory.md é source of truth |
| Context injection estoura token budget | Médio | Hard cap 8000 tokens, truncar por prioridade |
| Compaction perde contexto importante | Alto | Flush decisions antes de compactar, manter 6 msgs recentes |
