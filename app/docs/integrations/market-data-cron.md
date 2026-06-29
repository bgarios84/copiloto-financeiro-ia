# Market Data — Cron Diário de Cotações B3

## Visão Geral

O endpoint `/api/cron/update-b3-quotes` atualiza automaticamente as cotações
de todos os ativos ativos cadastrados em `b3_asset`, usando a brapi.dev como
provider padrão.

O botão manual em `/admin/market-data` continua disponível para atualizações
sob demanda.

---

## Variáveis de Ambiente

Adicione ao `.env.local` (desenvolvimento) e ao painel do Vercel (produção):

```env
# Segredo compartilhado com o scheduler — gerado aleatoriamente
# Exemplo: openssl rand -hex 32
CRON_SECRET=<segredo-gerado>

# Chave de API da brapi.dev (obrigatória para ativos além dos 4 de teste)
BRAPI_API_KEY=<token-brapi>

# Service Role do Supabase (para writes no banco via RLS bypass)
SUPABASE_SERVICE_ROLE_KEY=<chave-supabase>
```

> **Nunca use `NEXT_PUBLIC_` em nenhuma dessas variáveis.**

---

## Configuração — Vercel Cron

O arquivo `vercel.json` na raiz do projeto já está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-b3-quotes",
      "schedule": "0 13 * * 1-5"
    }
  ]
}
```

**Schedule:** `0 13 * * 1-5` = 13h00 UTC = 10h00 BRT, de segunda a sexta.

O Vercel envia automaticamente `Authorization: Bearer $CRON_SECRET` quando a
variável está configurada no projeto.

**Passos para ativar:**

1. Faça deploy no Vercel
2. Vá em **Settings → Environment Variables** e adicione `CRON_SECRET`
3. O cron aparece automaticamente em **Settings → Crons**
4. Para testar manualmente no Vercel: clique em "Run" no painel de Crons

> **Plano necessário:** Vercel Cron está disponível no plano Hobby (gratuito)
> com limitação de 1 cron job e schedule mínimo de 1 dia. Planos pagos
> permitem schedules mais frequentes.

---

## Execução Manual via HTTP

```bash
# Substitua <URL> e <SEU_CRON_SECRET>
curl -X GET "https://<URL>/api/cron/update-b3-quotes" \
  -H "Authorization: Bearer <SEU_CRON_SECRET>"
```

Resposta de sucesso (HTTP 200):

```json
{
  "ok": true,
  "provider": "brapi",
  "updated": 5,
  "failed": [],
  "errors": [],
  "startedAt": "2025-08-01T13:00:01.000Z",
  "updatedAt": "2025-08-01T13:00:08.432Z"
}
```

---

## Segurança

| Mecanismo | Detalhe |
|---|---|
| `CRON_SECRET` ausente | Endpoint retorna 500 — nunca executa sem segredo |
| Token errado | Retorna 401 sem executar nada |
| Variáveis de banco | `SUPABASE_SERVICE_ROLE_KEY` nunca exposta ao browser |
| Chave da brapi | `BRAPI_API_KEY` nunca exposta ao browser |
| Logs | Token nunca aparece em logs (apenas últimos 4 chars em dev) |

---

## Arquitetura de Arquivos

```
src/
  lib/market-data/
    types.ts              — interfaces MarketDataProvider, QuoteResult, etc.
    brapi.ts              — implementação brapi.dev (BATCH_SIZE = 1 no plano básico)
    index.ts              — factory getMarketDataProvider()
    run-b3-update.ts      — lógica core sem auth (usada por Action e Cron)
  services/market-data/
    update-b3-quotes.ts   — Server Action (requireAuth + runB3Update)
  app/
    api/cron/
      update-b3-quotes/
        route.ts          — Route Handler (CRON_SECRET + runB3Update)
    admin/market-data/
      page.tsx            — UI admin (botão manual)
      MarketDataClient.tsx
vercel.json               — schedule do Vercel Cron
```

---

## Supabase Cron (futuro — Sprint 7.4)

O Supabase oferece cron jobs via **pg_cron** (extensão PostgreSQL) ou via
**Supabase Edge Functions** com triggers agendados.

### Opção A: pg_cron (SQL puro)

```sql
-- Habilitar extensão (via Supabase Dashboard → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Chamar o endpoint diariamente às 13h UTC
SELECT cron.schedule(
  'update-b3-quotes',
  '0 13 * * 1-5',
  $$
    SELECT net.http_get(
      url := 'https://<URL>/api/cron/update-b3-quotes',
      headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb
    );
  $$
);
```

> Requer extensão `pg_net` habilitada no Supabase.

### Opção B: Edge Function

Criar `supabase/functions/update-b3-quotes/index.ts` que chama
`runB3Update()` diretamente — sem precisar do endpoint HTTP.
Configurar o trigger no Supabase Dashboard → Edge Functions → Schedules.

---

## Limitações do Plano brapi.dev

| Plano | Tickers por request | Rate limit |
|---|---|---|
| Gratuito (sem key) | 1 (apenas PETR4/MGLU3/VALE3/ITUB4) | ~2 req/min |
| Basic (com key) | 1 (BATCH_SIZE atual) | 120 req/min |
| Pro | Múltiplos | Rate limit maior |

Para aumentar BATCH_SIZE, altere `BATCH_SIZE` em `src/lib/market-data/brapi.ts`.

---

## Próximos Passos

- [ ] Adicionar log de histórico de execuções no banco (tabela `cron_log`)
- [ ] Alertas por email quando falha > N tickers
- [ ] Suporte a múltiplos providers com fallback automático
