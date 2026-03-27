# GodotForge — Product Requirements Document (PRD)

> **Version**: 0.2.0 | **Date**: 2026-03-27 | **Status**: In Development
>
> **Docs relacionados**: [Concept Brief](./godotforge-concept-brief.md) · [Opportunity Map](./godotforge-opportunity-map.md) · [Handoff](./godotforge-handoff.md)

---

## 1. Visão do Produto

GodotForge é um **AI Copilot para Godot** que combina um plugin nativo do editor com um MCP server, permitindo que desenvolvedores criem jogos com assistência de IA sem sair do Godot. É o único produto que oferece docs-aware (sem alucinações), manipulação direta do editor, e suporte a assinaturas Max/Pro via MCP.

### 1.1 Proposta de Valor

- **Para indie devs**: crie jogos completos com assistência de IA dentro do Godot
- **Para usuários Max/Pro**: aproveite sua assinatura Claude via Claude Code ou Cursor
- **Para estúdios pequenos**: contexto de projeto compartilhado e docs version-aware

---

## 2. Arquitetura Híbrida

### 2.1 Componentes

```
MCP Clients (Claude Code / Cursor / qualquer MCP client)
        │ stdio / SSE
        ▼
MCP Server (TypeScript, npx godotforge-mcp)
  - 10 MCP tools (6 delegados + 4 locais)
  - Docs engine (SQLite FTS5)
  - Context engine
        │ HTTP localhost:6970
        ▼
Godot Plugin (GDScript, addons/godotforge/)
  - HTTP server (TCPServer)
  - Tool registry (6 editor tools)
  - Chat panel nativo (API key mode)
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

#### 3.1.2 Editor Tools (6 implementados)
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

#### 3.2.2 Tools (10 total)
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
| `search_docs` | Local (futuro) | Busca docs Godot FTS5 |

#### 3.2.3 Degradação Graciosa
- **RF-18**: Editor tools retornam erro claro quando Godot não está aberto
- **RF-19**: Tools locais (read_file, list_files, get_project_context) funcionam sem Godot
- **RF-20**: `get_project_context` faz fallback lendo `project.godot` diretamente

#### 3.2.4 Segurança
- **RF-21**: Path traversal prevention — todos os paths devem estar dentro do project root
- **RF-22**: HTTP server bind apenas em 127.0.0.1 (nunca 0.0.0.0)

### 3.3 Docs Engine (Futuro — Fase 3)

- **RF-23**: Parse XML class docs do Godot → SQLite FTS5
- **RF-24**: Suporte a versões 4.1, 4.2, 4.3, 4.4
- **RF-25**: DB em `~/.godotforge/docs-{version}.db`
- **RF-26**: Build automático no primeiro uso
- **RF-27**: Tool `search_docs` com query por classe, método, sinal

---

## 4. Requisitos Não-Funcionais

| Requisito | Especificação |
|-----------|---------------|
| **Latência** | Tool execution < 500ms (exceto create_scene com filesystem scan) |
| **Compatibilidade** | Godot 4.1, 4.2, 4.3, 4.4 |
| **Distribuição Plugin** | Copy `addons/godotforge/` ou Asset Library |
| **Distribuição MCP** | `npx godotforge-mcp@latest` |
| **Dependências Plugin** | Zero (GDScript puro) |
| **Dependências MCP** | Node.js 22+, `@modelcontextprotocol/sdk`, `zod` |
| **Segurança** | Localhost-only, sem secrets no wire, port file em .godot (gitignored) |
| **Plataformas** | Windows, macOS, Linux (onde Godot 4.x roda) |

---

## 5. Estrutura de Arquivos

```
GodotForge/
├── addons/godotforge/          # Plugin Godot (GDScript)
│   ├── plugin.cfg
│   ├── plugin.gd               # Entry point — registra UI + HTTP server
│   ├── api/
│   │   ├── http_server.gd      # TCPServer REST bridge
│   │   ├── claude_client.gd    # HTTP client → Claude API (chat nativo)
│   │   ├── claude_tools.gd     # Definições JSON dos tools
│   │   ├── conversation.gd     # Histórico de mensagens
│   │   └── api_key_manager.gd  # Gerenciamento da API key
│   ├── tools/
│   │   ├── tool_registry.gd    # Dispatch de tool calls
│   │   ├── tool_base.gd        # Base class
│   │   ├── scene_tools.gd      # create_scene, get_scene_tree
│   │   ├── node_tools.gd       # add_node, set_property
│   │   └── script_tools.gd     # create_script, read_script
│   ├── ui/
│   │   ├── chat_panel.gd       # Bottom panel chat
│   │   └── message_bubble.gd   # Renderização de mensagens
│   ├── context/                # (Futuro) Scanner de projeto
│   └── docs/                   # (Futuro) SQLite FTS5
│
├── mcp-server/                 # MCP Server (TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # CLI entry point
│       ├── server.ts           # MCP server com 10 tools
│       ├── bridge.ts           # HTTP client → plugin Godot
│       └── tools.ts            # Definições de tools + constantes
│
└── docs/                       # Documentação do projeto
    ├── godotforge-concept-brief.md
    ├── godotforge-opportunity-map.md
    ├── godotforge-handoff.md
    └── godotforge-prd.md       # (este documento)
```

---

## 6. Fluxos de Uso

### 6.1 MCP Mode (Claude Code + Max plan)

```
1. Usuário instala plugin no Godot (addons/godotforge/)
2. Abre projeto no Godot → plugin inicia HTTP server na porta 6970
3. No terminal: claude mcp add godotforge -- npx godotforge-mcp@latest
4. Usa Claude Code normalmente: "Crie uma cena de player com CharacterBody2D"
5. Claude Code → MCP server → HTTP bridge → plugin executa no editor
6. Cena aparece no Godot instantaneamente
```

### 6.2 Chat Nativo (API key)

```
1. Ativa plugin no Godot
2. Clica "API Key" no bottom panel, cola sk-ant-...
3. Digita no chat: "Adicione um Sprite2D ao nó Player"
4. Plugin chama Claude API direto → executa tool → mostra resultado
5. Nó aparece na scene tree do Godot
```

### 6.3 Degradação (Godot fechado)

```
1. Claude Code com MCP: "Liste os scripts do projeto"
2. MCP server → list_files local (sem HTTP) → retorna lista de .gd
3. "Crie uma cena" → erro: "Godot editor is not running..."
```

---

## 7. Roadmap de Implementação

| Fase | Escopo | Status |
|------|--------|--------|
| **1. Fundação** | Plugin com 6 tools + chat nativo + HTTP server | ✅ Completo |
| **2. MCP Server** | TypeScript MCP com bridge + 10 tools + stdio | ✅ Completo |
| **3. Docs Engine** | SQLite FTS5, search_docs tool, version-aware | ⬜ Pendente |
| **4. Context Engine** | Project scanner, context builder, persistent cache | ⬜ Pendente |
| **5. Tools Avançados** | remove_node, edit_script, rename, move, duplicate | ⬜ Pendente |
| **6. Runtime** | run_game, stop_game, screenshot, input simulation | ⬜ Pendente |
| **7. Polish** | Streaming, command palette, settings UI, Asset Library | ⬜ Pendente |

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

---

## 9. Riscos Técnicos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| GDScript TCPServer instável com muitas requests | Médio | Localhost-only, 1 request por vez, Connection: close |
| MCP SDK breaking changes | Baixo | Pin versão, testes de integração |
| Godot 4.5+ muda EditorInterface API | Médio | Abstração em tool_base.gd, testes por versão |
| Port conflict com outras ferramentas | Baixo | Auto-increment 6970-6979, port file discovery |
| Claude API latência alta | Médio | Spinner na UI, timeout configurável |
