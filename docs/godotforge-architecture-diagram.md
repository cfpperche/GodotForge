# GodotForge — Architecture & Flow Diagrams

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER                                     │
│                                                                 │
│   Escolhe um dos 3 modos:                                       │
│   [A] Claude Code (Max/Pro)  [B] Cursor  [C] Chat Nativo Godot │
└──────┬──────────────────────────┬───────────────┬───────────────┘
       │                          │               │
       ▼                          ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│ Claude Code  │  │   Cursor     │  │   Godot Editor           │
│ CLI Terminal │  │   IDE        │  │   ┌────────────────────┐ │
│              │  │              │  │   │ GodotForge Plugin  │ │
│ Auth: Max/   │  │ Auth: Cursor │  │   │ Chat Panel         │ │
│ Pro plan     │  │ subscription │  │   │ Auth: API Key ou   │ │
│              │  │              │  │   │ Claude Code CLI     │ │
└──────┬───────┘  └──────┬───────┘  │   └─────────┬──────────┘ │
       │                  │         └──────────────┼────────────┘
       │ stdio            │ stdio                  │
       ▼                  ▼                        │
┌─────────────────────────────────┐                │
│     GodotForge MCP Server       │                │
│     (TypeScript / Node.js)      │                │
│                                 │                │
│  ┌───────────┐ ┌─────────────┐ │                │
│  │ Docs      │ │ Memory      │ │                │
│  │ Engine    │ │ Engine      │ │                │
│  │ SQLite    │ │ SQLite FTS5 │ │                │
│  │ FTS5      │ │ + markdown  │ │                │
│  └───────────┘ └─────────────┘ │                │
│  ┌───────────┐ ┌─────────────┐ │                │
│  │ Context   │ │ File Tools  │ │                │
│  │ Builder   │ │ read/list   │ │                │
│  └───────────┘ └─────────────┘ │                │
│                                 │                │
│  ┌─────────────────────────────┐│                │
│  │ Bridge (HTTP Client)        ││                │
│  │ → localhost:6970            ││                │
│  └──────────────┬──────────────┘│                │
└─────────────────┼───────────────┘                │
                  │ HTTP                            │
                  ▼                                 │
┌─────────────────────────────────────────────────────────────┐
│                  Godot Editor Process                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              GodotForge Plugin (GDScript)              │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ HTTP Server │  │ Tool         │  │ Chat Panel  │  │  │
│  │  │ TCPServer   │  │ Registry     │  │ (Bottom     │  │  │
│  │  │ :6970       │◄─┤ 16 tools     │  │  Panel)     │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │  │
│  │         │                │                  │         │  │
│  │         ▼                ▼                  ▼         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │           EditorInterface (Singleton)            │  │  │
│  │  │  - get_edited_scene_root()                       │  │  │
│  │  │  - open_scene_from_path()                        │  │  │
│  │  │  - play_main_scene() / stop_playing_scene()      │  │  │
│  │  │  - get_resource_filesystem().scan()              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Modo A — Claude Code (Max/Pro plan)

```
Usuário digita no terminal:
  "Crie uma cena de player com CharacterBody2D e um script de movimento"

       │
       ▼
┌─ Claude Code ──────────────────────────────────────────────┐
│  1. Recebe prompt do usuário                               │
│  2. Auth: usa assinatura Max/Pro (OAuth interno)           │
│  3. Envia para Claude API com tools do MCP server          │
│  4. Claude responde com tool_use blocks                    │
└──────┬─────────────────────────────────────────────────────┘
       │ stdio (JSON-RPC)
       ▼
┌─ MCP Server ───────────────────────────────────────────────┐
│  5. Recebe tool_use: create_scene                          │
│  6. Bridge faz HTTP POST → localhost:6970/tools/create_scene│
│  7. Recebe resultado do plugin                             │
│  8. Retorna tool_result para Claude via stdio              │
│                                                            │
│  9. Claude pede mais tools: create_script, add_node, etc.  │
│  10. Ciclo repete até Claude responder com texto final     │
└──────┬─────────────────────────────────────────────────────┘
       │ HTTP localhost:6970
       ▼
┌─ Godot Plugin ─────────────────────────────────────────────┐
│  11. HTTP server recebe POST /tools/create_scene           │
│  12. tool_registry.execute("create_scene", input)          │
│  13. scene_tools.gd → PackedScene.new() → ResourceSaver   │
│  14. EditorInterface.get_resource_filesystem().scan()       │
│  15. Retorna {"result": "Scene created at res://..."}      │
│                                                            │
│  → Cena aparece no FileSystem dock do Godot                │
│  → Script aparece no FileSystem dock                       │
│  → Nós aparecem na Scene tree                              │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Modo C — Chat Nativo dentro do Godot

```
Usuário digita no Chat Panel do GodotForge (bottom panel):
  "Adicione um Sprite2D ao Player"

       │
       ▼
┌─ Chat Panel (chat_panel.gd) ───────────────────────────────┐
│  1. _on_send_pressed() → pega texto do input               │
│  2. _add_bubble(USER, texto)                               │
│  3. _claude_client.send_message(texto)                     │
└──────┬─────────────────────────────────────────────────────┘
       │
       ▼
┌─ Claude Client (claude_client.gd) ─────────────────────────┐
│                                                            │
│  Se Auth = API Key:                                        │
│    4a. _send_api_request()                                 │
│    5a. HTTP POST → api.anthropic.com/v1/messages           │
│        body: {model, max_tokens, messages, system, tools}  │
│        system prompt inclui project memory (.godotforge/)  │
│    6a. _on_request_completed() → parse JSON response       │
│                                                            │
│  Se Auth = Claude Code:                                    │
│    4b. _send_claude_cli_request()                          │
│    5b. Thread → OS.execute("claude", ["--print",           │
│           "--model", model, "--system-prompt", prompt,     │
│           mensagem])                                       │
│    6b. _on_cli_completed() → parse text response           │
│                                                            │
│  7. Emite signal: response_received(content)               │
└──────┬─────────────────────────────────────────────────────┘
       │
       ▼
┌─ Chat Panel — Tool Execution Loop ─────────────────────────┐
│  8. _on_response_received(content)                         │
│  9. Para cada block no content:                            │
│     - type "text" → _add_bubble(ASSISTANT, texto)          │
│     - type "tool_use" →                                    │
│       10. _add_bubble(TOOL, "Running: add_node")           │
│       11. tool_registry.execute("add_node", input)         │
│       12. Resultado → _add_bubble(TOOL, resultado)         │
│       13. conversation.add_tool_result(id, resultado)      │
│                                                            │
│  14. Se houve tool_use → claude_client.send_tool_results() │
│      → Volta ao passo 4 (Claude vê resultados e continua) │
│                                                            │
│  15. Se não houve tool_use → conversa completa             │
│      → _set_busy(false)                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Fluxo de Dados — Memory & Context

```
┌─ Ao iniciar sessão ────────────────────────────────────────┐
│                                                            │
│  claude_client._build_enhanced_prompt():                   │
│    1. Lê _system_prompt base (quem é o GodotForge)         │
│    2. Lê res://.godotforge/memory.md                       │
│    3. Injeta como <project-memory>...</project-memory>     │
│    4. Cap: 32000 chars (~8000 tokens)                      │
│                                                            │
│  MCP context builder (builder.ts):                         │
│    1. Lê memory.md → até 3000 tokens                       │
│    2. Escaneia projeto (scanner.ts) → até 2000 tokens      │
│    3. Pega scene tree via bridge → até 1500 tokens         │
│    4. Lê session log do dia → até 1500 tokens              │
│    5. Total: max 8000 tokens injetados                     │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Durante a conversa ───────────────────────────────────────┐
│                                                            │
│  save_memory("Conventions", "Usamos snake_case"):          │
│    1. Append em .godotforge/memory.md sob ## Conventions   │
│    2. Index em .godotforge/memory.db (FTS5)                │
│    3. Próximas sessões carregam automaticamente            │
│                                                            │
│  search_memory("snake_case"):                              │
│    1. FTS5 MATCH em memory.db                              │
│    2. Retorna entries rankeadas por relevância              │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Compaction (chat nativo, >20 mensagens) ──────────────────┐
│                                                            │
│  conversation.gd detecta messages.size() > 20:             │
│    1. Emite signal compaction_needed(old_messages)          │
│    2. Mensagens antigas são summarizadas                   │
│    3. Decisões/padrões salvos em memory.md                 │
│    4. Mensagens antigas substituídas por resumo            │
│    5. 6 mensagens recentes mantidas intactas               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Fluxo de Dados — Docs Engine

```
┌─ Primeira busca (ex: search_docs("CharacterBody2D")) ─────┐
│                                                            │
│  1. ensureDocsReady("4.6")                                 │
│  2. DB ~/.godotforge/docs-4.6.db não existe                │
│  3. downloadDocs("4.6"):                                   │
│     a. GitHub API → resolve tag "4.6.1-stable"             │
│     b. Download tarball (~15MB)                            │
│     c. tar extract → 912 XML files                         │
│     d. Cache em ~/.godotforge/xml-cache/4.6/               │
│  4. Para cada XML:                                         │
│     a. fast-xml-parser → ParsedClass                       │
│     b. INSERT INTO classes, methods, properties, signals   │
│     c. INSERT INTO docs_fts (FTS5 index)                   │
│  5. DB pronto (~2 segundos para indexar)                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Buscas subsequentes (instantâneas) ──────────────────────┐
│                                                            │
│  1. ensureDocsReady("4.6") → DB já existe, retorna cache   │
│  2. searchDocs(db, "CharacterBody2D"):                     │
│     SELECT symbol_name, class_name, kind,                  │
│            snippet(docs_fts, ...) as description            │
│     FROM docs_fts                                          │
│     WHERE docs_fts MATCH '"CharacterBody2D"'               │
│     ORDER BY rank LIMIT 10                                 │
│  3. Retorna resultados rankeados por BM25                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Port Discovery — Como MCP encontra o Plugin

```
┌─ Godot inicia ─────────────────────────────────────────────┐
│                                                            │
│  plugin.gd._enter_tree():                                  │
│    1. http_server.start()                                  │
│    2. TCPServer.listen(6970, "127.0.0.1")                  │
│       Se porta ocupada: tenta 6971, 6972... até 6979       │
│    3. Escreve porta em .godot/godotforge.port              │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ MCP Server inicia ───────────────────────────────────────┐
│                                                            │
│  bridge.ts.getBaseUrl():                                   │
│    1. Lê {projectRoot}/.godot/godotforge.port              │
│    2. Extrai número da porta (ex: 6971)                    │
│    3. baseUrl = "http://127.0.0.1:6971"                    │
│    4. Se arquivo não existe → erro gracioso:               │
│       "Godot editor is not running..."                     │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Godot fecha ─────────────────────────────────────────────┐
│                                                            │
│  plugin.gd._exit_tree():                                   │
│    1. http_server.stop()                                   │
│    2. Remove .godot/godotforge.port                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 7. Lista Completa de Tools (32)

```
┌─ Scene Tools (3) ── plugin via HTTP ───────────────────────┐
│  create_scene    open_scene       get_scene_tree            │
├─ Node Tools (6) ── plugin via HTTP ────────────────────────┤
│  add_node        remove_node      rename_node               │
│  duplicate_node  move_node        set_property              │
├─ Script Tools (3) ── plugin via HTTP ──────────────────────┤
│  create_script   read_script      edit_script               │
├─ Runtime Tools (4) ── plugin via HTTP ─────────────────────┤
│  run_scene       stop_scene       get_game_status           │
│  take_screenshot                                            │
├─ Advanced Editor Tools (8) ── plugin via HTTP ─────────────┤
│  execute_editor_script    add_resource                      │
│  add_scene_instance       save_scene                        │
│  get_node_properties      connect_signal                    │
│  set_project_setting      get_editor_errors                 │
├─ Docs Tools (2) ── locais no MCP server ───────────────────┤
│  search_docs     get_class_reference                        │
├─ Memory Tools (3) ── locais no MCP server ─────────────────┤
│  save_memory     search_memory    get_project_memory        │
├─ Utility Tools (3) ── locais no MCP server ────────────────┤
│  get_project_context  read_file   list_files                │
└────────────────────────────────────────────────────────────┘
```
