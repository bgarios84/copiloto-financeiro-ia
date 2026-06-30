# Revisão Técnica Pós-Fase 1 — Copiloto Financeiro IA

**Data:** 2026-06-29  
**Sprint de referência:** 8.5 (FIRE Planner Premium)  
**Próxima fase:** Open Finance + Importadores OFX/CSV/XLSX + IA

---

## 1. Estrutura de Pastas

```
src/
├── app/               ✅ App Router (Next.js 16) — páginas e layouts
├── components/        ✅ Componentes reutilizáveis (layout, ui, cards, charts, forms, feedback, buttons)
├── lib/               ✅ Utilitários puros — sem "use server", sem I/O
├── services/          ✅ Server Actions ("use server") — camada de dados
├── types/             ✅ Tipos de domínio por entidade
├── shared/            ✅ Constantes compartilhadas (theme.ts)
├── providers/         ✅ React context providers (ThemeProvider)
├── middleware.ts       ✅ Edge middleware (auth + session refresh)
│
├── ai/                ⚠️  README somente — vazio
├── engines/           ⚠️  README somente — vazio (8 subdiretórios)
├── features/          ⚠️  README somente — vazio
├── domain/            ⚠️  README somente — vazio
├── application/       ⚠️  README somente — vazio
├── infrastructure/    ⚠️  README somente — vazio
├── integrations/      ⚠️  README somente — vazio
├── hooks/             ⚠️  README somente — vazio
└── utils/             ⚠️  README somente — vazio
```

**Conclusão:** A estrutura efetiva do projeto é plana e funcional (`app/`, `lib/`, `services/`, `types/`). Os 8 diretórios vazios são esqueletos de uma arquitetura hexagonal planejada que nunca foi implementada. Criam ruído sem entregar valor.

---

## 2. Pontos Fortes

### 2.1 Arquitetura de Segurança — Sólida
- **Dupla camada de auth:** middleware Edge (primeira barreira) + `requireAuth()` em todo Server Action (segunda barreira).
- **RLS habilitado em todas as 18 tabelas** — policies `SELECT/INSERT/UPDATE/DELETE` por `user_id = auth.uid()` em todas as tabelas de usuário.
- **service_role isolado:** `createServiceRoleClient()` está em `lib/supabase/service-role.ts`, invocado apenas por Route Handlers (`/api/cron/`) e scripts admin após verificação de `CRON_SECRET`. Não vazado para client.
- **Chave de serviço não exposta:** `.env.local` contém apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable, não secret). `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` e `BRAPI_API_KEY` **não estão no .env.local local** — precisam ser configuradas no Vercel apenas.

### 2.2 Padrão ServiceResult — Consistente
`{ data: T; error: null } | { data: null; error: string }` usado em todos os 13 services. Zero lançamento de exceções não tratadas para o cliente.

### 2.3 Server Actions — Bem Posicionadas
Todos os 13 arquivos em `src/services/` têm `"use server"` no topo. Nenhuma Server Action em arquivo de lib puro. `lib/` não tem `"use server"`.

### 2.4 Matemática FIRE — Pura e Testada
`src/lib/fire/calculator.ts` — 248 linhas de funções puras com 27 testes unitários passando via `node:test`. Sem dependência de runtime.

### 2.5 Padrões de Extensibilidade
- **Radar:** `rules.ts` com array `ALL_RULES[]` — adicionar nova regra = adicionar 1 função.
- **Timeline:** `buildTimeline()` com providers independentes — adicionar fonte = adicionar 1 provider.
- **Market Data:** `MarketDataProvider` interface — trocar brapi → outro provider sem alterar service.

### 2.6 Database Blueprint Robusto
Migration `001_mvp_schema.sql` com 17 tabelas, audit log, 47 RLS policies, índices adequados, `deleted_at` (soft delete) em entidades principais. Campos `origin` e `external_id` na tabela `transaction` já preparam Open Finance.

### 2.7 Colunas de Open Finance já presentes
- `institution.supports_open_finance BOOLEAN`
- `institution.ispb CHAR(8)` (código SPB para identificação bancária)
- `transaction.origin CHECK IN ('manual','open_finance','import','ai_suggestion')`
- `transaction.external_id TEXT` (para deduplicação de transações importadas)
- Plano Premium com feature flag `"open_finance": true` em `plan.features` JSONB

---

## 3. Dívidas Técnicas

### DT-01 — `ServiceResult<T>` duplicado em 7 arquivos ⚠️
**Gravidade: Média**  
O tipo `ServiceResult<T>` está definido (não apenas re-exportado) em:
- `types/budget.ts` (linha 69)
- `types/credit-card.ts`
- `types/dashboard.ts`
- `types/financial-account.ts`
- `types/fx-rate.ts` ← origem histórica
- `types/manual-asset.ts`
- `types/transaction.ts`

`types/b3-market.ts` e `types/b3-dividend.ts` já re-exportam de `fx-rate.ts`, mas os demais têm cópias literais independentes. Se a definição precisar mudar, há 7 lugares para atualizar.

**Solução:** Criar `src/types/common.ts` com `ServiceResult<T>` e `import type` centralizado.

---

### DT-02 — Tipos duplicados entre `src/lib/` e `src/types/` ⚠️
**Gravidade: Baixa-Média**  
Existem arquivos com nomes idênticos em dois lugares:

| Arquivo | `src/lib/` | `src/types/` |
|---|---|---|
| `b3-market.ts` | Utilitários puros (isB3Quoted, b3QuotePrice) | Interface B3Quote, B3QuoteMap |
| `b3-dividend.ts` | Utilitários puros (calcDividend*) | Interface B3DividendEvent |
| `fx-rate.ts` | Utilitários puros (convertToBRL) | Interface FxRate, FxRateMap |

Não são duplicações de conteúdo (separação correta: lib = lógica, types = contratos), mas os nomes idênticos criam confusão na hora de importar. Um desenvolvedor novo procura `b3-market.ts` e encontra dois arquivos diferentes.

Adicionalmente, `src/lib/market-data/types.ts` define `QuoteResult`, `QuoteBatchResult`, `MarketDataProvider` — tipos do engine de cotação completamente distintos de `src/types/b3-market.ts` — mas o nome da pasta `market-data` e a existência de `types/b3-market.ts` gera ambiguidade.

**Solução:** Renomear libs para deixar clara a distinção: `lib/b3-market-utils.ts`, `lib/fx-rate-utils.ts`, `lib/b3-dividend-utils.ts`.

---

### DT-03 — Cálculo de patrimônio duplicado em DashboardClient + DashboardPatrimonio ⚠️
**Gravidade: Média**  
`DashboardClient.tsx` (1128 linhas) e `DashboardPatrimonio.tsx` (719 linhas) ambos calculam localmente:
- `totalAccounts`, `totalInvestments`, `totalManualAssets`, `totalPatrimonio`
- `currencyExposure` map
- Conversão FX via `convertToBRL()`

São ~28 ocorrências de variáveis com o mesmo nome calculadas de forma independente. `DashboardPatrimonio` não é nem importado em `DashboardClient` — existe como componente separado mas não está sendo usado no dashboard atual (órfão).

**Solução pré-Open Finance:** Mover cálculos de patrimônio para `src/lib/patrimonio/calculator.ts` (funções puras). Verificar se `DashboardPatrimonio.tsx` está sendo usado; se não, remover ou integrar.

---

### DT-04 — Formatadores `Intl.NumberFormat` duplicados ⚠️
**Gravidade: Baixa**  
`src/lib/utils.ts` exporta `formatCurrency`, `formatPercent`, `formatDate`. Mas 6 arquivos em `src/app/` definem funções locais com `Intl.NumberFormat` ou `toLocaleString`:
- `InvestmentItem.tsx` — 4 formatadores locais
- `InvestmentsClient.tsx` — 1 formatador local
- `TradeItem.tsx` — 2 formatadores locais
- `TradesClient.tsx` — 2 formatadores locais
- `WealthItem.tsx` — 2 formatadores locais
- `MarketDataClient.tsx` — 1 formatador de data local

**Solução:** Usar `formatCurrency`/`formatPercent`/`formatDate` de `@/lib/utils` e estender se necessário (ex: suporte a moedas não-BRL).

---

### DT-05 — Rotas não protegidas pelo middleware ⚠️
**Gravidade: Alta**  
`PROTECTED_ROUTES` em `middleware.ts` inclui apenas:
```
/dashboard, /accounts, /transactions, /investments, /portfolio, /budget, /reports, /ai, /planning, /alerts, /settings
```

**Rotas que existem como páginas mas NÃO estão na lista:**
- `/fire` — módulo FIRE (dados financeiros sensíveis)
- `/wealth` — patrimônio manual (dados financeiros sensíveis)
- `/credit-cards` — cartões de crédito (dados financeiros sensíveis)
- `/budgets` — orçamentos
- `/timeline` — histórico financeiro
- `/admin/market-data` — painel admin

A proteção existe via `requireAuth()` nas pages/services (segunda camada), mas o middleware não redireciona para `/login` de forma proativa nessas rotas — o usuário sem sessão pode chegar ao Server Component antes de ser redirecionado.

**Solução imediata:** Adicionar todas as rotas ao `PROTECTED_ROUTES` ou substituir por estratégia de allowlist (`/login`, `/auth/*`, `/`) onde tudo mais é protegido.

---

### DT-06 — `force-dynamic` faltando em pages com dados em tempo real ⚠️
**Gravidade: Média**  
Apenas `src/app/fire/page.tsx` tem `export const dynamic = "force-dynamic"`. Todas as outras 9 pages que fazem queries ao Supabase (dashboard, accounts, transactions, investments, etc.) não têm essa diretiva. O Next.js pode cachear renders server-side em produção (behavior padrão em Next.js 16 com caching agressivo).

**Solução:** Adicionar `export const dynamic = "force-dynamic"` em todas as pages que fazem queries de dados do usuário, ou configurar `revalidate = 0`.

---

### DT-07 — Logs de diagnóstico em código de produção ⚠️
**Gravidade: Baixa-Média**  
`src/app/api/cron/update-b3-quotes/route.ts` tem 13 chamadas `console.log/warn/error` incluindo um bloco de diagnóstico explicitamente comentado como "remover após fix". Logs expõem comprimento e prefixo do `CRON_SECRET` em produção.

**Solução:** Remover bloco de diagnóstico. Manter apenas logs de negócio em nível `error`.

---

### DT-08 — `vitest` instalado mas não usado como runner principal ⚠️
**Gravidade: Baixa**  
`vitest ^2.0.0` está em `devDependencies` e `test:watch: vitest` está nos scripts. O runner primário (`test`) usa `node --experimental-strip-types --test`. Vitest não está configurado (sem `vitest.config.ts`). É uma dependência morta.

**Solução:** Remover `vitest` dos devDeps ou criar `vitest.config.ts` e migrar os testes para aproveitar seu ecossistema (describe, it, expect — mais ergonômico que node:test).

---

### DT-09 — 8 diretórios vazios em `src/` ⚠️
**Gravidade: Baixa**  
`ai/`, `engines/`, `features/`, `domain/`, `application/`, `infrastructure/`, `integrations/`, `hooks/`, `utils/` existem apenas com README. Criam expectativa de separação arquitetural que não existe na prática.

**Opções:**
1. Remover os não usados (mais simples)
2. Implementar gradualmente à medida que o projeto cresce

---

### DT-10 — Sem `error.tsx` no App Router ⚠️
**Gravidade: Média**  
Nenhum `error.tsx` em nenhuma rota. Erros de Server Component (ex: Supabase timeout) resultam em erro genérico do Next.js sem fallback amigável ao usuário.

**Solução:** Criar `src/app/error.tsx` (global) e opcionalmente por rota.

---

### DT-11 — Regra de negócio de conversão FX no frontend ⚠️
**Gravidade: Média**  
`DashboardClient.tsx` chama `convertToBRL()` e faz agregações de patrimônio diretamente no Client Component. Para Open Finance (muitos mais ativos, múltiplas moedas), este cálculo deve ser movido para o Service ou para `lib/patrimonio/`.

---

## 4. Riscos Críticos

### RC-01 — Rotas financeiras sem proteção de middleware 🔴
Detalhado em DT-05. `/fire`, `/wealth`, `/credit-cards`, `/budgets` e `/timeline` não estão em `PROTECTED_ROUTES`. Embora `requireAuth()` nos Server Components crie uma segunda barreira, a ausência de proteção no middleware é uma falha de defesa em profundidade que precisa ser corrigida antes de entrar em produção.

### RC-02 — `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `BRAPI_API_KEY` não configurados ⚠️
Nenhuma das três chaves críticas está no `.env.local` local. Isso significa:
- O cron de atualização de cotações B3 não funciona localmente
- A feature de market data está operacional apenas em produção (Vercel)
- Qualquer desenvolvedor novo precisará configurar manualmente

Não é um risco de segurança (as chaves não estão expostas), mas é um risco de onboarding e de testes locais.

### RC-03 — `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — nome atípico ⚠️
A variável `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` é o nome gerado pelo Supabase para a chave pública (anon key). O SDK Supabase usa o nome `NEXT_PUBLIC_SUPABASE_ANON_KEY` por convenção. Está funcionando porque a variável é passada diretamente aos clientes, mas diverge da documentação oficial — pode causar confusão em novos devs.

---

## 5. Preparação para Open Finance

### ✅ Já implementado (ready)
| Item | Estado | Localização |
|---|---|---|
| `institution.ispb` | ✅ | migration 001 |
| `institution.supports_open_finance` | ✅ | migration 001, seed com Nubank/Itaú/etc |
| `transaction.origin` enum com `'open_finance'` | ✅ | migration 001 |
| `transaction.external_id` para dedup | ✅ | migration 001 |
| Feature flag `plan.features.open_finance` | ✅ | migration 001 |
| `ServiceResult<T>` padrão uniforme | ✅ | todos os services |
| `requireAuth()` em todos os services | ✅ | todos os services |
| RLS por `user_id` em todas as tabelas | ✅ | migrations 001-010 |

### ⚠️ Pendente antes de Open Finance
| Item | Esforço | Prioridade |
|---|---|---|
| Migration `011_open_finance_consent.sql` — tabela `bank_connection` (pluggy_item_id, consent_id, status, expires_at, user_id) | M | Alta |
| Migration: `financial_account.external_id`, `financial_account.connection_id` FK | P | Alta |
| Migration: `credit_card.external_id`, `credit_card.connection_id` FK | P | Alta |
| Service `src/services/open-finance.ts` — getConnections, createConsent, syncTransactions | G | Alta |
| Deduplicação de transações por `external_id` no upsert | M | Alta |
| Correção DT-05 (rotas fora do middleware) | P | Crítica |

---

## 6. Preparação para Importadores OFX/CSV/XLSX

### ✅ Já implementado
- `transaction.origin CHECK IN (..., 'import', ...)` — campo pronto para marcar transações importadas
- `transaction.external_id` — pode armazenar hash do registro para deduplicação
- `src/services/transaction.ts` — `createTransaction()` e `createTransactionsBatch()` (ou equivalente) como base

### ⚠️ Não existe ainda
- Nenhum parser OFX, CSV ou XLSX no projeto
- Nenhuma página de import (`/import` route)
- Nenhum componente de upload de arquivo
- Sem lógica de mapeamento de campos externos → schema interno

### Arquitetura recomendada
```
src/
├── lib/
│   └── importers/
│       ├── types.ts          — ImportRow, ImportResult
│       ├── ofx-parser.ts     — parseia OFX → ImportRow[]
│       ├── csv-parser.ts     — parseia CSV → ImportRow[]
│       └── normalizer.ts     — ImportRow → transaction insert shape
├── services/
│   └── import.ts            — "use server" — valida + insere com dedup
└── app/
    └── import/
        ├── page.tsx
        └── ImportClient.tsx
```

A lógica de parsing deve ser **pura** em `lib/importers/` (testável sem banco). O service cuida de validação de duplicatas via `external_id` e inserção em batch.

---

## 7. Preparação para IA

### ✅ Já implementado
- **Radar de Insights** (`src/lib/radar/rules.ts`) — 14 regras de análise financeira, padrão extensível
- `transaction.tags TEXT[]` — para classificação por IA
- `plan.features.ai_messages_per_month` — rate limiting planejado
- `src/ai/` — diretório criado com README e estrutura planejada (prompts, chains, embeddings, clients)

### ⚠️ Não existe ainda
- Nenhum cliente de LLM (OpenAI/Anthropic/Google)
- Nenhum prompt implementado
- Nenhuma rota `/ai` implementada (só entrada na Sidebar)
- Sem embeddings ou RAG

### Observação arquitetural
O padrão do Radar (funções puras `(input) => Insight | null` + array `ALL_RULES[]`) é um excelente precursor de IA. As mesmas regras podem ser expressas como exemplos few-shot para um LLM classificar transações. Recomenda-se manter esse padrão e usá-lo como ground truth para validar respostas do modelo.

---

## 8. Ajustes Recomendados por Prioridade

### Fazer ANTES de Open Finance (bloqueadores ou riscos altos)

| # | Ajuste | Arquivo(s) | Esforço |
|---|---|---|---|
| 1 | **[RC-01]** Adicionar `/fire`, `/wealth`, `/credit-cards`, `/budgets`, `/timeline`, `/admin/*` ao `PROTECTED_ROUTES` | `src/middleware.ts` | P (5 min) |
| 2 | **[DT-07]** Remover bloco de diagnóstico do cron route | `src/app/api/cron/update-b3-quotes/route.ts` | P (5 min) |
| 3 | **[DT-06]** Adicionar `force-dynamic` em todas as pages com queries de usuário | 8 arquivos `page.tsx` | P (10 min) |
| 4 | **[DT-01]** Centralizar `ServiceResult<T>` em `src/types/common.ts` | `src/types/*.ts` | M (30 min) |
| 5 | **[DT-10]** Criar `src/app/error.tsx` mínimo | novo arquivo | P (15 min) |
| 6 | Migration `011_open_finance_consent.sql` — tabela `bank_connection` | nova migration | M (1h) |
| 7 | Migration: adicionar `connection_id`, `external_id` em `financial_account` e `credit_card` | nova migration | P (20 min) |

### Fazer durante ou após Open Finance (não bloqueiam)

| # | Ajuste | Arquivo(s) | Esforço |
|---|---|---|---|
| 8 | **[DT-03]** Mover cálculo de patrimônio para `lib/patrimonio/calculator.ts`; verificar se `DashboardPatrimonio.tsx` é usado | `DashboardClient.tsx`, `DashboardPatrimonio.tsx` | M (2h) |
| 9 | **[DT-02]** Renomear `lib/b3-market.ts` → `lib/b3-market-utils.ts`, idem fx-rate e b3-dividend | 3 arquivos + imports | P (20 min) |
| 10 | **[DT-04]** Substituir formatadores locais por `formatCurrency`/`formatDate` de `@/lib/utils` | 6 componentes | P (30 min) |
| 11 | **[DT-08]** Remover `vitest` de devDeps ou configurá-lo | `package.json` | P (5 min) |
| 12 | **[DT-09]** Remover diretórios vazios inúteis ou criar estrutura mínima | 8 dirs | P (10 min) |
| 13 | **[DT-11]** Mover cálculo FX/patrimônio do frontend para lib pura | `DashboardClient.tsx` | G (antes de escalar) |

---

## 9. Ordem Sugerida de Correção

```
Semana 0 (pré-Open Finance)
│
├── 1. middleware.ts — adicionar rotas faltantes          [15 min]
├── 2. cron route — remover diagnóstico                   [5 min]
├── 3. force-dynamic em todas as pages                    [20 min]
├── 4. src/types/common.ts — ServiceResult centralizado   [30 min]
├── 5. src/app/error.tsx — fallback mínimo                [15 min]
└── 6. tsc --noEmit → confirmar zero erros               [automático]

Semana 1 (fundação Open Finance)
│
├── 7. Migration 011 — bank_connection                    [1h]
├── 8. Migration 012 — external_id em accounts/cards     [30 min]
├── 9. src/lib/importers/ — parsers puros (OFX, CSV)     [1 sprint]
└── 10. src/services/open-finance.ts — consent + sync    [1 sprint]

Backlog técnico (qualidade, não bloqueadores)
│
├── Renomear libs ambíguas (DT-02)
├── Centralizar formatadores (DT-04)
├── Extrair cálculo patrimônio para lib (DT-03 + DT-11)
├── Limpar diretórios vazios (DT-09)
└── Resolver vitest vs node:test (DT-08)
```

---

## 10. Resumo Executivo

**O projeto está em boa forma para entrar em Open Finance.** A fundação de segurança (RLS, requireAuth, service_role isolado) é sólida. Os padrões arquiteturais (ServiceResult, Radar, Timeline, Market Data Provider) são extensíveis. O schema do banco já antecipou campos necessários para Open Finance.

Os principais riscos são operacionais e de qualidade, não de segurança fundamental:

1. **Risco real:** rotas financeiras fora do middleware (DT-05 / RC-01) — corrigir hoje.
2. **Dívida acumulada:** ServiceResult duplicado × 7 (DT-01) e formatadores duplicados × 6 (DT-04) — corrigir antes de adicionar mais entidades.
3. **Ausência de error boundary** — corrigir antes de ir a produção com usuários reais.
4. **Cálculo de patrimônio duplicado** (DT-03) — refatorar antes de escalar com Open Finance (centenas de transações).

O restante das dívidas (diretórios vazios, vitest morto, logs de diagnóstico) são cosméticas e podem ser resolvidas no backlog técnico sem impacto nas próximas features.

---

*Gerado automaticamente por revisão estática de código em 2026-06-29.*  
*Próxima revisão sugerida: após Sprint de Open Finance.*
