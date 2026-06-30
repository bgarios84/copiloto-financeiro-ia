# Open Finance — Auditoria de Código

**Data:** 2026-06-30  
**Sprint:** Pós 10.2  
**Escopo:** `src/lib/open-finance/`, `src/services/open-finance/`, `src/app/api/webhooks/pluggy/`, `src/app/api/cron/`, `src/app/settings/open-finance/`  
**Regra:** análise only — nenhuma alteração implementada.

---

## Sumário executivo

| Severidade | Qtd | Categorias principais |
|---|---|---|
| 🔴 BLOCKER | 1 | Rota cron duplicada — uma é código morto |
| 🟠 HIGH | 2 | Método handleWebhook morto; conexões stuck em "syncing" nunca recuperadas |
| 🟡 MEDIUM | 5 | Performance, inconsistências de sync, mismatch semântico |
| 🔵 LOW | 8 | Fragilidades, comentários obsoletos, ternário incorreto |
| ℹ️ INFO | 2 | Type stub conflitante, tarefas obsoletas no tracker |

---

## 🔴 BLOCKER

### B-01 — Duas rotas de cron quase idênticas; uma é código morto

**Arquivos:**
- `src/app/api/cron/open-finance-sync/route.ts`
- `src/app/api/cron/sync-open-finance/route.ts`

**Evidência:** diff entre os dois arquivos mostra diferença em apenas um prefixo de log (`[cron/of-sync]` vs `[cron/sync-of]`) e um traço no segmento da URL. Ambas chamam `autoSyncAllConnections(7)` com lógica idêntica.

**Impacto:** a que não está em `vercel.json` nunca é chamada. Manter dois arquivos quase idênticos aumenta risco de divergência futura: bugfixes aplicados em um não chegam ao outro.

**Ação:** identificar qual path está ativo no `vercel.json → crons`, deletar o outro, consolidar em um único arquivo.

---

## 🟠 HIGH

### H-01 — `provider.handleWebhook()` é código morto

**Arquivo:** `src/lib/open-finance/pluggy.ts` (linha ≈ 378)

```ts
/** STUB -- validacao HMAC implementada no Sprint 9.5. */
async handleWebhook(rawBody: Buffer, _signature: string) {
  // apenas parseia JSON — SEM validação HMAC
}
```

**Problema:** a validação HMAC-SHA256 real está implementada diretamente em `src/app/api/webhooks/pluggy/route.ts` com `timingSafeEqual`. O método do provider NUNCA é chamado pelo route.

**Consequências:**
1. O método nunca executa mas cria falsa impressão de que o provider valida o webhook.
2. Qualquer provider futuro que implemente `OpenFinanceProvider` e use `handleWebhook()` ficará sem HMAC.
3. O comentário STUB é enganoso.

**Ação:** ou remover o método da interface e do provider, ou mover a lógica HMAC para o provider e chamá-la no route via `await provider.handleWebhook(rawBody, signature)`.

---

### H-02 — Conexões travadas em `"syncing"` nunca são recuperadas

**Arquivo:** `src/services/open-finance/sync-orchestrator.ts` (linha ≈ 661)

```ts
.eq("status", "connected")   // só busca "connected" — ignora "syncing" stuck
```

**Problema:** se um processo de sync crashar, a conexão fica em `status = "syncing"` e `sync_log.status = "running"` para sempre. Nenhum mecanismo de timeout ou recuperação existe. Runs posteriores pulam essas conexões silenciosamente.

**Impacto:** uma falha de infra (restart serverless, timeout) causa que a conexão pare de sincronizar indefinidamente sem alerta ao usuário.

**Ação:** antes de cada run do cron, resetar conexões com `status = "syncing"` e `updated_at` mais velho que N minutos para `"connected"` ou marcá-las `"error"`.

---

## 🟡 MEDIUM

### M-01 — `handleSyncOne` usa `await` sequencial onde deveria usar `Promise.all`

**Arquivo:** `src/app/settings/open-finance/OpenFinanceClient.tsx`

```ts
// Atual — sequencial (~2× mais lento)
await syncConnectionAccounts(id);
await syncConnectionTransactions(id, ...);

// AccountsClient.tsx (correto) — paralelo
await Promise.all([syncConnectionAccounts(id), syncConnectionTransactions(id, ...)]);
```

**Ação:** uniformizar com `Promise.all`.

---

### M-02 — N+1 queries no `investment-sync.ts`

**Arquivo:** `src/services/open-finance/investment-sync.ts`

Para cada investimento recebido do provider, o código executa 1–2 queries de dedup sequenciais (busca por ticker, fallback por nome + instituição). Com N investimentos → até 2N queries ao banco.

**Ação:** carregar todos os investimentos existentes do usuário antes do loop (1 query), fazer dedup em memória com um `Map`.

---

### M-03 — `authenticate()` chamado N vezes por sync sem cache intra-request

**Arquivo:** `src/lib/open-finance/pluggy.ts`

Cada método público (`syncAccounts`, `syncTransactions`, `syncInvestments`) chama `authenticate()` individualmente. Num sync completo, isso gera 3+ round-trips à API da Pluggy para access tokens que poderiam ser reutilizados.

**Ação:** cache do token com TTL (ex: 25 min) ou passar o token como parâmetro interno.

---

### M-04 — `transactions_skipped` em `sync_log` armazena contagem de *investimentos* pulados

**Arquivo:** `src/services/open-finance/sync-orchestrator.ts` (linha ≈ 616)

```ts
transactions_skipped: invResult.investmentsSkipped,   // mismatch semântico
```

Métricas de auditoria baseadas em `transactions_skipped` retornam números de investimentos, não transações.

**Ação:** mapear corretamente — separar `transactionsSkipped` de `investmentsSkipped` em `OFSyncResult`.

---

### M-05 — `syncConnectionAccounts` sem proteção anti-double-sync

**Arquivo:** `src/app/api/open-finance.ts` (server actions)

`syncConnectionTransactions` verifica janela de 5 minutos via `sync_log`. `syncConnectionAccounts` não tem essa proteção — múltiplos cliques podem causar import duplicado de contas.

**Ação:** aplicar a mesma verificação temporal em `syncConnectionAccounts`.

---

## 🔵 LOW

### L-01 — `mapExecutionStatus` mascara status desconhecidos como `"connected"`

**Arquivo:** `src/lib/open-finance/pluggy.ts`

O `default` case retorna `"connected"` silenciosamente para qualquer status desconhecido vindo da Pluggy. Novos status da API serão tratados como conexão saudável.

**Ação:** `default` deve retornar `"error"` ou emitir `console.warn` antes de retornar um fallback seguro.

---

### L-02 — Detecção de 404 em `syncInvestments` via string match frágil

**Arquivo:** `src/lib/open-finance/pluggy.ts`

```ts
if (err.message.includes("404")) { ... }
```

Qualquer mensagem que mencione "404" (mesmo contextual) ativa esse branch. APIs que alteram mensagens de erro quebram este código silenciosamente.

**Ação:** usar código de status HTTP do objeto de erro se disponível, ou criar um tipo de erro estruturado.

---

### L-03 — `getConnectionsWithDetails` faz 3 queries sequenciais desnecessariamente

**Arquivo:** `src/services/open-finance/queries.ts`

As queries de `sync_logs` e `account_maps` são independentes entre si e poderiam rodar em paralelo com `Promise.all` após buscar as connections.

**Ação:** `Promise.all([fetchSyncLogs(userId), fetchAccountMaps(userId)])`.

---

### L-04 — Moeda das transações hardcoded como `"BRL"`

**Arquivo:** `src/services/open-finance/sync-orchestrator.ts` (linha ≈ 362)

```ts
currency: "BRL",
```

Transações de contas em USD, EUR ou outras moedas são inseridas com `currency: "BRL"`. Usuários com contas internacionais terão dados incorretos.

**Ação:** usar a moeda da transação vinda do provider (`OFTransaction.currencyCode` ou equivalente).

---

### L-05 — Comentário STUB enganoso em `handleWebhook`

**Arquivo:** `src/lib/open-finance/pluggy.ts` (linha ≈ 378)

```ts
/** STUB -- validacao HMAC implementada no Sprint 9.5. */
```

Implica que HMAC está neste método. Na realidade está no route e este método nunca é invocado.

**Ação:** remover ou substituir por: `// Não invocado — HMAC validado em /api/webhooks/pluggy/route.ts`.

---

### L-06 — Ternário do webhook sempre resolve para `"processed"` mesmo com erros

**Arquivo:** `src/app/api/webhooks/pluggy/route.ts`

```ts
// Atual:
result.skipped ? "ignored" : result.errors.length === 0 ? "processed" : "processed"
//                                                                        ^^^^^^^^^^ bug

// Correto:
result.skipped ? "ignored" : result.errors.length === 0 ? "processed" : "partial"
```

Webhooks com erros são marcados como `"processed"` no `open_finance_webhook_event`, impossibilitando auditoria de falhas.

**Ação:** corrigir o segundo `"processed"` para `"partial"` (ou `"failed"`).

---

### L-07 — `_userId` recebido mas ignorado em `createConnectToken`

**Arquivo:** `src/lib/open-finance/pluggy.ts` (linha ≈ 224)

Parâmetro declarado com underscore indicando que não é utilizado. Se o propósito era associar o token ao usuário para auditoria, não está acontecendo.

**Ação:** remover da interface se desnecessário, ou utilizá-lo para contexto de auditoria na API da Pluggy.

---

### L-08 — `lastTwelveMonthsRate` mapeado internamente mas descartado

**Arquivo:** `src/lib/open-finance/pluggy.ts` (linhas 106–107)

A interface interna `PluggyInvestment` declara `lastTwelveMonthsRate?` mas `OFProviderInvestment` em `types.ts` não tem esse campo — o dado é descartado no mapeamento.

**Ação:** se útil, adicionar a `OFProviderInvestment`; caso contrário, remover a declaração interna.

---

## ℹ️ INFO

### I-01 — Type stub pode conflitar com tipos do pacote instalado

**Arquivo:** `src/types/react-pluggy-connect.d.ts`

O comentário diz "após instalar, os tipos do pacote substituem este arquivo". Se o pacote já tem tipos próprios, TypeScript pode ver duas declarações e emitir erros de redeclaração.

**Ação:** verificar `npm ls react-pluggy-connect`. Se tiver tipos, deletar o stub.

---

### I-02 — Tarefas #146–149 no tracker marcadas como pendentes mas já implementadas

O orquestrador de sync (Sprint 9.8) está completamente implementado. As tasks correspondentes ainda aparecem como `in_progress`/`pending` no tracker.

**Ação:** marcar como `completed` no próximo cleanup de sprint.

---

## Console logs encontrados

| Arquivo | Tipo | Observação |
|---|---|---|
| `sync-orchestrator.ts:694` | operacional | Aceitável para observabilidade em produção |
| `api/cron/open-finance-sync/route.ts` | operacional | Aceitável |
| `api/cron/sync-open-finance/route.ts` | operacional | Duplicado do anterior (rota morta) |
| `api/webhooks/pluggy/route.ts` | debug | Revisar — pode expor payload em logs |

---

## Sem problemas encontrados

- `src/lib/open-finance/reconciliation.ts` — lógica pura, bem documentada (regras R1–R4), sem efeitos colaterais.
- `src/lib/open-finance/env.ts` — fail-fast correto, sem segredos expostos via `NEXT_PUBLIC_`.
- `src/lib/open-finance/index.ts` — factory pattern limpo com lazy import.
- `src/lib/open-finance/types.ts` — interface `OpenFinanceProvider` coerente.
- HMAC-SHA256 com `timingSafeEqual` em `route.ts` — implementação correta e segura.
- RLS + `requireAuth()` aplicados em todos os server actions.
- Lock de sync via `sync_log.status = "running"` para evitar runs concorrentes — correto.
- `computeEffectiveDaysBack` e lógica de incremental sync — corretos.
- `PluggyConnect includeSandbox={process.env.NODE_ENV !== "production"}` — correto (Next.js inlina `NODE_ENV` no build).

---

## Checklist de ações recomendadas

| # | Sev | Ação | Arquivo |
|---|---|---|---|
| 1 | 🔴 | Deletar rota cron duplicada | `api/cron/*` |
| 2 | 🟠 | Remover ou mover `handleWebhook` para o route | `pluggy.ts`, `route.ts` |
| 3 | 🟠 | Recuperar conexões stuck em `"syncing"` com timeout | `sync-orchestrator.ts` |
| 4 | 🟡 | `Promise.all` em `handleSyncOne` | `OpenFinanceClient.tsx` |
| 5 | 🟡 | Eliminar N+1 queries com Map em memória | `investment-sync.ts` |
| 6 | 🟡 | Cache intra-request de `authenticate()` | `pluggy.ts` |
| 7 | 🟡 | Corrigir `transactions_skipped` → separar de `investmentsSkipped` | `sync-orchestrator.ts` |
| 8 | 🟡 | Anti-double-sync em `syncConnectionAccounts` | `open-finance.ts` |
| 9 | 🔵 | `mapExecutionStatus` default → `"error"` ou warn | `pluggy.ts` |
| 10 | 🔵 | Substituir string-match de 404 por erro tipado | `pluggy.ts` |
| 11 | 🔵 | `Promise.all` em `getConnectionsWithDetails` | `queries.ts` |
| 12 | 🔵 | Usar moeda da transação (remover hardcode BRL) | `sync-orchestrator.ts` |
| 13 | 🔵 | Corrigir ternário webhook (`"processed"` → `"partial"`) | `route.ts` |
| 14 | 🔵 | Remover/corrigir comentário STUB | `pluggy.ts` |
| 15 | ℹ️ | Verificar conflito do type stub | `react-pluggy-connect.d.ts` |
