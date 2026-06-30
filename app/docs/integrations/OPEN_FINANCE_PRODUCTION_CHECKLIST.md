# Open Finance — Production Checklist

> Sprint 9.13 | Última revisão: 2026-06-30

---

## 1. Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PLUGGY_CLIENT_ID` | ✅ | Client ID do painel Pluggy |
| `PLUGGY_CLIENT_SECRET` | ✅ | Client Secret do painel Pluggy — **NUNCA expor ao frontend** |
| `PLUGGY_WEBHOOK_SECRET` | ✅ prod / ⚠️ dev | Segredo HMAC compartilhado com a Pluggy para validação de webhooks |
| `CRON_SECRET` | ✅ | Token Bearer usado pelo Vercel Cron para autorizar `/api/cron/open-finance-sync` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL pública do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service Role key — usada apenas server-side (sync, cron, webhook) |

> `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` são **sempre server-side**. Nunca prefixe com `NEXT_PUBLIC_`.

---

## 2. Configuração Pluggy

### 2.1 Cadastro de Webhook

No painel Pluggy (https://dashboard.pluggy.ai):

1. Vá em **Webhooks → Novo Webhook**
2. URL: `https://<seu-dominio>/api/webhooks/pluggy`
3. Eventos a assinar:
   - `item/updated`
   - `item/login_succeeded`
   - `item/error`
   - `item/waiting_user_action`
   - `transactions/updated`
4. Copie o **Webhook Secret** gerado e adicione como `PLUGGY_WEBHOOK_SECRET`

### 2.2 Ambientes Pluggy

- **Sandbox**: inclui bancos fictícios para testes — ativo em `NODE_ENV !== "production"`
- **Production**: desativa sandbox automaticamente no widget (`includeSandbox={false}`)

---

## 3. Configuração do Cron

`vercel.json` agenda o cron diariamente às **04:00 UTC** (01:00 horário de Brasília):

```json
{ "path": "/api/cron/open-finance-sync", "schedule": "0 4 * * *" }
```

O endpoint exige o header:
```
Authorization: Bearer <CRON_SECRET>
```

O Vercel injeta esse header automaticamente via `CRON_SECRET`.

---

## 4. Testes Obrigatórios Antes do Deploy

### 4.1 Funcional

- [ ] Conectar uma conta bancária via widget Pluggy (sandbox)
- [ ] Sincronizar manualmente — contas e transações aparecem
- [ ] Desconectar — conexão some da lista
- [ ] Reconectar item expirado — widget abre em modo de atualização
- [ ] Webhook `item/updated` dispara sync (testar com `curl` ou ferramenta Pluggy)
- [ ] Webhook com HMAC inválido retorna `401`
- [ ] Cron endpoint retorna `401` sem `CRON_SECRET` válido

### 4.2 Segurança

- [ ] Verificar que `PLUGGY_CLIENT_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` **não** aparecem em logs
- [ ] Verificar que nenhuma variável sensível está prefixada com `NEXT_PUBLIC_`
- [ ] Confirmar que RLS do Supabase está ativo na tabela `open_finance_connection`
- [ ] Confirmar que `open_finance_sync_log` e `open_finance_webhook_event` só aceitam `service_role`
- [ ] Testar acesso cross-user: usuário A não consegue ver/sincronizar conexão do usuário B

### 4.3 TypeScript

```bash
cd app && npx tsc --noEmit
# Deve retornar zero erros em src/
```

---

## 5. Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Pluggy API indisponível | `OFError` com `retryable=true`; sync falha graciosamente sem apagar dados existentes |
| Rate limit Pluggy | `OFError("RATE_LIMIT")`; cron retrocede na próxima execução |
| Token de API Pluggy expirado (TTL 2h) | Cada request obtém novo token via `authenticate()` — não há cache |
| Sync simultâneo da mesma conexão | Lock via `isConnectionSyncing()` no orchestrator — segundo sync é `skipped` |
| Webhook sem `PLUGGY_WEBHOOK_SECRET` em produção | Endpoint retorna `500` e alerta em logs — bloqueia operação |
| Transações duplicadas | `upsert` por `provider_transaction_id` — idempotente |
| Investimentos duplicados | Dedup por `(user_id, ticker)` → fallback `(user_id, asset_name, institution)` |
| `last_synced_at` desatualizado | Atualizado ao final de cada `runConnectionSync` com sucesso |

---

## 6. Endpoints Open Finance

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/api/webhooks/pluggy` | POST | HMAC-SHA256 | Recebe eventos Pluggy |
| `/api/cron/open-finance-sync` | GET | Bearer token | Sync automático diário |
| `/settings/open-finance` | GET | Sessão (RLS) | Painel de gerenciamento |

---

## 7. Próximos Passos (Backlog)

- [ ] Alertas por e-mail quando conexão entra em `error` ou `expired`
- [ ] Suporte a múltiplos providers (Belvo, Truelayer)
- [ ] Dashboard executivo com evolução de saldo ao longo do tempo
- [ ] Exportação de extrato Open Finance em PDF/XLSX
- [ ] Testes automatizados de integração com Pluggy Sandbox
- [ ] Monitoramento de SLA de sync (tempo médio, % de sucesso)
- [ ] Rate limiting por usuário no endpoint de sincronização manual
