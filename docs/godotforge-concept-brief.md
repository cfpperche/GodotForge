# GodotForge

**Tagline:** O unico MCP Godot que voce vai precisar.
**Scale:** SMB SaaS (indie devs + pequenos studios)
**Model:** Freemium subscription
**AI-native:** Yes (remove AI = e apenas um plugin de editor sem inteligencia)
**Comparable(s):** "Cursor" meets "GDAI MCP" — a qualidade e subscription model do Cursor aplicada ao nicho Godot MCP

---

## The Hook (why they sign up)

Free tier com 15 tools + docs da versao exata do seu Godot. AI nunca sugere API deprecada. Install em 2 minutos, zero config. "O MCP que entende qual versao do Godot voce usa."

## The Retain (why they stay past month 3)

```
Month 1: Docs-aware + editor tools funcionam. Dev para de checar docs manualmente.
Month 3: Context engine acumulou scripts, scenes, naming conventions do projeto. AI entende a codebase.
Month 6: Historico de bugs fixados, patterns aprendidos, decisoes de arquitetura memorizadas. Trocar = perder tudo.
Month 12: GodotForge e a memoria do projeto. Nenhuma LLM generica chega perto.
```

## The Refer (why they tell others)

Quando a AI cria uma cena complexa usando a API correta do Godot 4.4 de primeira — sem hallucination, sem fix manual. "Olha isso, pedi um platformer e ele usou CharacterBody2D, nao KinematicBody2D como todo AI faz." Tweet natural. Video de demo e conteudo viral entre gamedevs.

---

## Target Persona(s)

### Persona 1: Indie Dev Solo

| Attribute | Detail |
|-----------|--------|
| Who | Dev solo, 18-35 anos, faz jogos como hobby ou side-project |
| Pain today | AI sugere codigo errado para versao do Godot. Perde 30-60min/dia corrigindo hallucinations |
| Budget | $0-20/mo (paga Cursor $20, joga $5-19 em tools) |
| Where they hang out | r/godot, Godot Discord (67K+85K members), itch.io, YouTube gamedev |
| Trigger to search | "AI gerou codigo que nao compila" ou "como fazer X no Godot 4.4" sem achar resposta boa |

### Persona 2: Pequeno Studio (2-5 devs)

| Attribute | Detail |
|-----------|--------|
| Who | Studio indie, faz jogos comerciais, precisa de produtividade |
| Pain today | Cada dev usa MCP diferente, sem padrao, sem context compartilhado |
| Budget | $50-200/mo total em tools |
| Where they hang out | Godot Discord, GDC, game jams, Twitter gamedev |
| Trigger to search | "Precisamos padronizar nossas ferramentas AI" ou "novo dev entrou e precisa entender o projeto" |

### Persona 3: Game Jam Participant

| Attribute | Detail |
|-----------|--------|
| Who | Dev que participa de jams (GMTK, Ludum Dare, Godot Wild Jam) |
| Pain today | Precisa prototipar rapido em 48-72h. AI lenta ou errada = tempo perdido |
| Budget | $0 (free tier user, potencial upgrade depois da jam) |
| Where they hang out | itch.io, jam Discords, YouTube, Twitter |
| Trigger to search | "Preciso de um AI que me ajude a terminar o jogo antes do deadline" |

## Mechanics Breakdown

### Layer 1 — Core Value
AI-assisted Godot development com zero hallucination. O "job to be done" e: escrever, testar e iterar codigo GDScript mais rapido, com confianca de que a AI entende a versao correta do Godot e o contexto do projeto.

### Layer 2 — Growth
PLG (Product-Led Growth): Free tier funcional atrai devs → devs usam em game jams → compartilham resultados → outros devs instalam. Inherent virality: cada projeto compartilhado que usa GodotForge e uma referencia implicita.

### Layer 3 — Moat
Context database por projeto. Apos 100+ interacoes, a AI conhece a codebase melhor que qualquer alternativa. Dados de uso agregados (anonimizados) refinam os system prompts internos. Quanto mais usuarios, melhores os prompts para todos.

---

## User Flow (first visit to power user)

### First Visit (< 2 minutes to value)
1. Dev instala via `npx godotforge init` ou baixa da Godot Asset Library
2. Configura MCP client (Cursor/Claude/VSCode) com uma linha de config
3. Pede: "Cria uma cena com CharacterBody2D e CollisionShape2D" → funciona de primeira, API correta

### First Week
1. Dev percebe que docs-aware evita 90% das hallucinations comuns
2. Usa editor tools para manipular scenes, criar scripts, debug errors
3. Context engine comeca a aprender o projeto — sugere nomes consistentes, patterns usados

### Power User (month 3+)
1. AI conhece toda a codebase: 50+ scripts, 30+ scenes, naming conventions
2. Closed-loop testing: AI cria → roda → screenshot → detecta erro → corrige
3. Dev convida colega de studio → compartilham context → team plan

---

## Growth Loop

```
Dev instala free tier → usa em game jam → compartilha resultado no Twitter/itch.io
→ outro dev vê → "que tool e essa?" → instala free tier
→ usa no proprio projeto → context acumula → upgrade para Pro
→ indica para studio → team plan → mais devs usando
→ mais dados de uso → melhores prompts → melhor produto → mais indicacoes
```

**Growth type:** PLG + Viral (inherent exposure via game jam submissions)
**Estimated viral coefficient:** 0.5-0.8 (organic supplement, not self-sustaining without content marketing)

---

## Monetization Sketch

| Plan | Price | What's included | Who buys this |
|------|-------|----------------|---------------|
| Free | $0 | 15 tools (editor basics + docs), 50 calls/dia, 1 projeto | Indie solo, game jammers, trial users |
| Pro | $12/mo | 45 tools (+ testing + screenshots + context), unlimited calls, 5 projetos | Indie dev serio, freelancer |
| Team | $29/mo (por seat) | Tudo do Pro + shared context, team prompts, priority support | Studios 2-10 devs |

**ARPU estimate:** $14/mo (Estimated — 60% free, 25% Pro, 15% Team)
**Expansion revenue:** Free → Pro (context limits), Pro → Team (collaboration), seat expansion

---

## Business Model

### Revenue Model Rationale

| Question | Answer |
|----------|--------|
| Why subscription? | Context engine e dados acumulados entregam valor crescente ao longo do tempo. One-time nao captura esse valor. TAM pequeno (estimado 100K-300K Godot devs ativos) exige recorrencia. |
| What triggers upgrade? | Free: 50 calls/dia atingido ou precisar de testing tools. Pro → Team: segundo dev no projeto. |
| What prevents downgrade? | Context acumulado. Meses de dados do projeto perdidos ao cancelar. |

### Unit Economics (Estimates)

| Metric | Value | Assumption |
|--------|-------|------------|
| ARPU | $14/mo | 60% free, 25% Pro ($12), 15% Team ($29) |
| Gross margin | 85% | Infra: MCP server e lightweight (sem AI compute — LLM roda no client). Custo principal e hosting docs index + context storage. |
| Estimated CAC | $8 | 70% organico (game jams, word-of-mouth, content), 20% content marketing, 10% paid |
| Target LTV | $252 | $14 ARPU x 18 meses retencao media |
| LTV:CAC ratio | 31:1 | Excelente — PLG com baixo CAC |
| Payback period | <1 mes | $8 CAC / $14 monthly gross profit |

**Disclaimer:** Estimates baseadas em comparaveis (Cursor, GDAI, Ziva) e benchmarks de PLG SaaS. Tratar como hipoteses, nao targets.

### Go-to-Market Strategy

| Phase | Channel | Motion | Target |
|-------|---------|--------|--------|
| Pre-launch (W1-2) | Twitter/X, r/godot | Build-in-public, teaser video | 500 waitlist signups |
| Launch (W8-10) | Product Hunt, Hacker News, Godot Discord | PLG — free tier, demo video | 200 installs, 20 Pro conversions |
| Growth (M3-6) | YouTube tutorials, game jam sponsorship, SEO | Content-led + community | $2K MRR, 500 active users |
| Scale (M6-12) | Godot Asset Library, MCP marketplaces, partnerships | Marketplace + referral | $8K MRR, 2000 active users |

### Key Metrics

| Type | Metric | Target | Why this metric |
|------|--------|--------|----------------|
| North Star | Weekly Active Projects (WAP) | 500 by M6 | Measures real usage, not vanity signups |
| Guardrail | Free-to-Pro conversion rate | >5% | Below 3% = free tier too generous or Pro not compelling |
| Leading | Day-7 retention | >40% | Predicts long-term retention and WTP |

---

## Technical Sketch

| Decision | Choice | Why |
|----------|--------|-----|
| Runtime | Node.js 22 LTS + TypeScript | Official MCP SDK e TypeScript. Built-in type stripping. Fastest path to MVP. |
| MCP SDK | @modelcontextprotocol/sdk | Official, maintained, stable. Zod for input validation. |
| Godot bridge | HTTP/WebSocket via GDScript plugin | Nao precisa de GDExtension. Plugin GDScript leve no editor que expoe API HTTP. Latencia ~50-200ms (irrelevante quando LLM leva 2-10s). |
| Docs index | SQLite FTS5 | Docs Godot parseadas por versao (4.1, 4.2, 4.3, 4.4). Full-text search local. Zero dependency externa. |
| Context storage | SQLite + JSON | Scripts, scenes, patterns, decisoes armazenados localmente. Synced via file no projeto. |
| Validation | Zod schemas | Input validation para todos os tools. Type-safe. |
| Distribution | npm (npx godotforge) + Godot Asset Library | Dual distribution: devs instalam server via npm, plugin via Asset Library. |
| Testing | Vitest | Unit tests para tools, integration tests com Godot headless. |

**MVP build estimate:** 8-10 semanas para 1 dev. Phase 1 (W1-5): 15 free tools + docs engine. Phase 2 (W5-8): 30 Pro tools + testing. Phase 3 (W8-10): context engine + subscription billing.

---

## 4-Layer Architecture

```
┌─────────────────────────────────────────────┐
│  MCP Client (Cursor / Claude / VSCode)      │
│  ← JSON-RPC over stdio →                    │
├─────────────────────────────────────────────┤
│  GodotForge MCP Server (Node.js/TS)         │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐ │
│  │ Editor  │ │  Docs   │ │   Testing     │ │
│  │ Tools   │ │ Engine  │ │   Tools       │ │
│  │ (15-45) │ │ (FTS5)  │ │ (screenshots, │ │
│  │         │ │         │ │  input sim)   │ │
│  └────┬────┘ └────┬────┘ └──────┬────────┘ │
│       │           │              │          │
│  ┌────┴───────────┴──────────────┴────────┐ │
│  │         Context Engine                 │ │
│  │  (project memory, patterns, history)   │ │
│  └────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  Godot Editor Plugin (GDScript)             │
│  HTTP bridge: scene tree, scripts, debug,   │
│  screenshots, input simulation              │
└─────────────────────────────────────────────┘
```

---

## Feature Roadmap (MVP → V1)

### Phase 1 — Free Tier (W1-5)

| # | Feature | Layer | Tier |
|---|---------|-------|------|
| 1 | Create/edit scenes | Editor | Free |
| 2 | Add/remove/update nodes | Editor | Free |
| 3 | Create/edit GDScript files | Editor | Free |
| 4 | Get/set node properties | Editor | Free |
| 5 | Search files in res:// | Editor | Free |
| 6 | Read debugger output/errors | Editor | Free |
| 7 | List project scenes | Editor | Free |
| 8 | Get scene tree structure | Editor | Free |
| 9 | Get open script + errors | Editor | Free |
| 10 | Search docs by class name | Docs | Free |
| 11 | Search docs by method | Docs | Free |
| 12 | Get class reference (version-aware) | Docs | Free |
| 13 | Get method signature + examples | Docs | Free |
| 14 | List available nodes for version | Docs | Free |
| 15 | Validate GDScript syntax | Docs | Free |

### Phase 2 — Pro Tools (W5-8)

| # | Feature | Layer | Tier |
|---|---------|-------|------|
| 16 | Take editor screenshot | Testing | Pro |
| 17 | Take running game screenshot | Testing | Pro |
| 18 | Launch/stop game | Testing | Pro |
| 19 | Simulate keyboard input | Testing | Pro |
| 20 | Simulate mouse input | Testing | Pro |
| 21 | Simulate action input | Testing | Pro |
| 22 | Get runtime scene tree | Testing | Pro |
| 23 | Inspect node at runtime | Testing | Pro |
| 24 | Read runtime logs | Testing | Pro |
| 25 | Create animations | Editor+ | Pro |
| 26 | Create tilemaps | Editor+ | Pro |
| 27 | Manage signals | Editor+ | Pro |
| 28 | Create shaders | Editor+ | Pro |
| 29 | Manage audio | Editor+ | Pro |
| 30 | Create particles | Editor+ | Pro |
| 31 | Physics setup | Editor+ | Pro |
| 32 | Undo/redo integration | Editor+ | Pro |
| 33 | Closed-loop: auto-test cycle | Testing | Pro |
| 34 | Project context: save patterns | Context | Pro |
| 35 | Project context: load on start | Context | Pro |

### Phase 3 — Polish + Team (W8-10)

| # | Feature | Layer | Tier |
|---|---------|-------|------|
| 36 | Context: script index | Context | Pro |
| 37 | Context: scene relationships | Context | Pro |
| 38 | Context: naming conventions | Context | Pro |
| 39 | Context: architecture patterns | Context | Pro |
| 40 | Custom system prompt per project | Context | Pro |
| 41 | Shared team context | Context | Team |
| 42 | Team prompt library | Context | Team |
| 43 | Usage analytics dashboard | Meta | Team |
| 44 | Stripe billing integration | Meta | All |
| 45 | Godot Asset Library listing | Meta | All |

---

## Competitive Positioning

```
                    Intelligence (AI-aware)
                         ↑
                         |
            GodotForge ★ |  Ziva
                         |
     Simple ←────────────┼────────────→ Complex (full IDE)
                         |
        godot-mcp ·      |    GDAI · MCP Pro
           GoPeak        |
                         ↓
                    Basic (tool-only)
```

| GodotForge | vs GDAI MCP | vs Godot MCP Pro | vs Ziva |
|------------|-------------|------------------|---------|
| Docs-aware + context | No docs awareness | No docs awareness | In-editor only |
| Free tier funcional | No free tier | $5 one-time (all) | Free tier limitado ($3 balance) |
| 45 tools quality-first | 32 tools | 163 tools (quantity) | Plugin features |
| Subscription sustentavel | $19 one-time (finite) | $5 one-time (unsustainable) | $20-200/mo (expensive) |
| Version-aware (4.1-4.4) | Version-agnostic | Version-agnostic | Version-agnostic |

**Why now?**
1. Godot crescendo 39% em game jams — massa critica de usuarios
2. MCP protocol maduro — suportado por todos os IDEs AI relevantes
3. Gap claro entre gratis (basico) e pago (caro/closed) — GodotForge ocupa o meio
4. AI hallucination e o pain #1 — docs-aware resolve diretamente
5. Cursor provou que devs pagam $20/mo por AI tools — $12/mo e barganha

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| GDAI ou MCP Pro adicionam docs-aware em 3 meses | Alto | Lanca primeiro, constroi context moat. Docs e table stakes — context engine e o diferencial real. |
| Free tier canibaliza Pro | Medio | Free limitado a 50 calls/dia + 1 projeto. Testing e context so no Pro. |
| Godot Foundation lanca MCP oficial | Alto | Improvavel no curto prazo (focados em engine, nao tools). Se acontecer, pivot para context/quality layer em cima do oficial. |
| LLMs melhoram e param de hallucinar Godot | Baixo | Docs-aware e feature de lancamento, nao moat. Context engine e o moat de longo prazo. |
| Comunidade Godot rejeita tool AI (anti-AI slop sentiment) | Medio | Posicionar como "AI que gera codigo CORRETO, nao slop". Quality-first messaging. |
| TAM pequeno demais para subscription | Medio | $12/mo x 1,000 Pro users = $12K MRR. Viavel para solo dev. Nao precisa ser venture-scale. |

---

## Anti-Goals

- **NOT** um IDE completo — GodotForge e um MCP server, nao um editor. Nao competir com Cursor/Zed.
- **NOT** um gerador de jogos one-click — e um copiloto, nao um substituicao do dev. Human-in-the-loop sempre.
- **NOT** um marketplace de assets — foco em code/scenes, nao sprites/3D models.
- **NOT** um ERP para studios — sem project management, sem tracking, sem billing.
- **NOT** open-source core — closed-source com free tier. Pode abrir no futuro, mas comecar fechado.

---

## Moat Analysis

| Moat type | How it works here | Strength over time |
|-----------|------------------|--------------------|  
| Data moat | Context engine acumula entendimento do projeto. Mais uso = AI melhor. Dados agregados melhoram system prompts. | Weak → Strong (6-12 months) |
| Switching cost | Meses de context perdidos ao cancelar. Scripts, patterns, decisoes. | Weak → Medium (3-6 months) |
| Integration moat | Plugin no Godot editor + MCP server + docs index. 3 pecas integradas. | Medium |
| Brand/community | "O MCP Godot que nao hallucina" como categoria. | Slow → Medium (6-12 months) |

**Overall moat:** Medium — comeca fraco, fortalece com context data ao longo do tempo.

---

## Distribution Strategy

### First 100 Users
- **r/godot + Godot Discord:** Post genuino mostrando demo video ("fiz um MCP que entende a versao do seu Godot")
- **Game jam sponsorship:** Free Pro accounts para participantes de Godot Wild Jam
- **YouTube:** Tutorial "Como usar AI no Godot sem hallucinations" (SEO play)

### Launch Calendar

| Week | Channel | Angle | Format |
|------|---------|-------|--------|
| W1-2 | Twitter/X | Build-in-public: "Construindo o MCP Godot que eu queria" | Thread + daily updates |
| W8 | Product Hunt | "GodotForge: The AI MCP that understands your Godot version" | PH launch |
| W9 | Hacker News | "I built a docs-aware MCP for Godot — here's why AI hallucinates game code" | Show HN post |
| W10 | r/godot + Discord | Community showcase: "What users built with GodotForge in game jams" | Demo compilation |
| W12 | YouTube | "Build a complete platformer with AI in 30 minutes" | Tutorial |

### Validation Metric
500 installs + 30 Pro conversions nos primeiros 30 dias. Se atingir, o modelo funciona. Se nao, pivotar pricing ou free tier scope.

---

## Elevator Pitch Test

**Sentence 1:** GodotForge e um MCP server que conecta qualquer AI (Claude, Cursor, VSCode) ao seu editor Godot — com docs da versao certa, manipulacao de scenes, testing automatizado e memoria do projeto.

**Sentence 2:** Free para comecar, $12/mo para quem quer que a AI realmente entenda seu jogo.

---

## Quality Score

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| Market signal strength | 25% | 22/25 | Godot growth + MCP maturity + Cursor validation. Solid data. |
| Concept originality | 20% | 16/20 | Remix (docs-aware + context + quality-first), not copy. Not fully novel. |
| Hook-Retain-Refer clarity | 15% | 13/15 | Hook clear (no hallucinations), retain strong (context), refer decent (game jam videos). |
| Unit economics plausibility | 15% | 12/15 | PLG economics are strong. TAM uncertainty is the risk. |
| Honest risk assessment | 15% | 13/15 | Identified real risks. "Godot Foundation MCP" risk acknowledged. |
| Source coverage | 10% | 9/10 | 11 sources with URLs. |

**Total: 85/100**

**Improvement suggestions:**
1. Validate TAM with Godot Steam download numbers (not just company count)
2. Interview 5-10 Godot devs on WTP for subscription MCP
3. Test docs-aware demo with real users before committing to full MVP

---

## Next: Architecture Pipeline

To turn this concept into production-ready artifacts, use the saas-architect skill:

"Use the skill saas-architect. Here is my validated concept brief:
[paste this document]
Execute the full pipeline: Market Intel → PRD → Roadmap → Mock → Landing → CLAUDE.md"
