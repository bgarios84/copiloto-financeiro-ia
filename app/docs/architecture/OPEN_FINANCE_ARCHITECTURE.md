# Arquitetura Open Finance — Copiloto Financeiro IA

**Data:** 2026-06-29
**Sprint de referência:** 9.0 — Desenho de Arquitetura
**Status:** Documento técnico — sem código implementado
**Próximos passos:** Implementação a partir do Sprint 9.1

---

## 1. Escolha de Provider

### 1.1 Comparativo

| Critério | Pluggy | Belvo | Open Finance Brasil Direto |
|---|---|---|---|
| Foco geográfico | Brasil (nativo) | LATAM (BR, MX, CO) | Brasil |
| Certificação Open Finance Brasil | Sim — participante certificado | Parcial (via parceiros) | Requer certificacao própria |
| Cobertura de instituições BR | 300+ | 100+ | Depende de implementação |
| SDK JavaScript/TypeScript | Sim | Sim | N/A |
| Webhooks nativos | Sim | Sim | N/A |
| Supabase Vault / secret management | Flexível | Flexível | N/A |
| Sandbox gratuito | Sim | Sim | N/A |
| Modalidade | SaaS API | SaaS API | Infra própria |
| Complexidade de integração | Baixa (widget pronto) | Média | Muito Alta |
| Tempo até MVP | 1-2 sprints | 2-3 sprints | 6+ meses |
| Custo estimado (MVP) | R$ 0 no sandbox; ~R$ 0,50-2/conexão/mês | Similar | Alto (infra + certificação) |
| LGPD / termos de dado | Contrato de DPA | Contrato de DPA | N/A |
| Connect Widget embutido | Sim (Pluggy Connect) | Sim (Belvo Connect) | N/A |

### 1.2 Recomendacao Tecnica

**Provider recomendado: Pluggy**

Justificativas:
- Empresa brasileira — suporte em português, sujeita à LGPD, participante certificado do Open Finance Brasil
- Pluggy Connect: widget de autorizacao de consentimento pronto (iframe/popup), elimina necessidade de implementar fluxo OAuth do zero
- API REST com SDK JavaScript bem documentado
- Cobertura superior de bancos brasileiros (Nubank, Itaú, Bradesco, BB, Caixa, Santander, XP, Inter, C6, BTG e 290+ outros)
- `item_id` persistente por conexão — mapeamento simples de conta Pluggy → financial_account local
- Webhooks para notificação de transações novas e atualizações de status
- Granularidade de dados: contas correntes, poupança, cartões, transações, saldos — tudo disponível via Open Finance BR

**Fallback:** Belvo pode ser ativado implementando a mesma interface `OpenFinanceProvider`, sem mudar a camada de serviço.

---

## 2. Abstracao de Provider

### 2.1 Interface TypeScript

```typescript
// src/lib/open-finance/types.ts

export type OFConnectionStatus =
  | "connected"
  | "syncing"
  | "expired"
  | "error"
  | "disconnected"
  | "pending_user_action";

export interface OFAccount {
  externalId:      string;          // ID da conta no provider (ex: Pluggy account_id)
  institutionId:   string;          // ISPB ou ID da instituicao no provider
  name:            string;
  type:            "checking" | "savings" | "credit" | "investment" | "wallet";
  currency:        string;
  balance:         number;
  creditLimit?:    number;          // Para cartões
  availableLimit?: number;
  lastFour?:       string;
}

export interface OFTransaction {
  externalId:      string;          // ID único da transação no provider
  accountExternalId: string;        // Conta de origem
  date:            string;          // ISO date YYYY-MM-DD
  amount:          number;          // Sempre positivo
  type:            "debit" | "credit";
  description:     string;
  category?:       string;          // Categoria do provider (opcional)
  status:          "pending" | "posted";
  rawPayload:      Record<string, unknown>; // Payload original para auditoria
}

export interface OFSyncResult {
  accountsSynced:       number;
  transactionsCreated:  number;
  transactionsUpdated:  number;
  transactionsSkipped:  number;
  errors:               string[];
  syncedAt:             string;
}

export interface OFWebhookEvent {
  event:       string;             // ex: "transaction/created", "item/updated"
  itemId:      string;             // connection id no provider
  payload:     Record<string, unknown>;
  receivedAt:  string;
}

// Interface que qualquer provider deve implementar
export interface OpenFinanceProvider {
  readonly name: string;

  // Gera URL/token de conexao para o Connect Widget
  createConnectToken(userId: string): Promise<{ connectToken: string; expiresAt: string }>;

  // Registra uma nova conexao apos o usuario autorizar no widget
  registerConnection(userId: string, itemId: string): Promise<{
    connectionId: string;
    status:       OFConnectionStatus;
    accounts:     OFAccount[];
  }>;

  // Atualiza credenciais de uma conexao existente
  refreshConnection(connectionId: string): Promise<{ status: OFConnectionStatus }>;

  // Busca contas de uma conexao
  syncAccounts(connectionId: string): Promise<OFAccount[]>;

  // Busca saldos atualizados
  syncBalances(connectionId: string): Promise<OFAccount[]>;

  // Busca transacoes de um periodo
  syncTransactions(
    connectionId: string,
    accountExternalId: string,
    from: string,   // YYYY-MM-DD
    to:   string,
  ): Promise<OFTransaction[]>;

  // Encerra conexao e revoga consentimento no provider
  disconnect(connectionId: string): Promise<void>;

  // Valida e parseia evento de webhook
  handleWebhook(payload: unknown, signature: string): Promise<OFWebhookEvent>;
}
```

### 2.2 Implementacao Pluggy

```typescript
// src/lib/open-finance/pluggy-provider.ts

export class PluggyProvider implements OpenFinanceProvider {
  readonly name = "pluggy";
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.pluggy.ai";

  constructor() {
    const key = process.env.PLUGGY_CLIENT_ID;
    const secret = process.env.PLUGGY_CLIENT_SECRET;
    if (!key || !secret) throw new Error("PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET nao configurados");
    this.apiKey = key + ":" + secret;
  }

  // ... implementacao dos metodos da interface
}
```

### 2.3 Factory

```typescript
// src/lib/open-finance/index.ts

export function getOpenFinanceProvider(): OpenFinanceProvider {
  const provider = process.env.OPEN_FINANCE_PROVIDER ?? "pluggy";
  if (provider === "pluggy") return new PluggyProvider();
  if (provider === "belvo")  return new BelvoProvider();
  throw new Error("Provider nao suportado: " + provider);
}
```

---

## 3. Modelo de Dados

### 3.1 Tabelas Novas

#### `open_finance_connection`
Registro de cada conexao de um usuario com uma instituicao via Open Finance.

```sql
CREATE TABLE public.open_finance_connection (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  provider          TEXT          NOT NULL DEFAULT 'pluggy',   -- 'pluggy' | 'belvo'
  provider_item_id  TEXT          NOT NULL,                    -- item_id no Pluggy
  institution_id    UUID          REFERENCES public.institution(id),
  status            TEXT          NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'connected','syncing','expired',
                                    'error','disconnected','pending_user_action'
                                  )),
  error_message     TEXT,
  consent_expires_at TIMESTAMPTZ,
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (user_id, provider, provider_item_id)
);

-- RLS: usuario so acessa proprias conexoes
ALTER TABLE public.open_finance_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY of_connection_own ON public.open_finance_connection
  USING (user_id = auth.uid());
```

#### `open_finance_account_map`
Mapeia conta do provider para `financial_account` local.
Um `financial_account` pode ter no maximo 1 conexao ativa de Open Finance.

```sql
CREATE TABLE public.open_finance_account_map (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id         UUID    NOT NULL REFERENCES public.open_finance_connection(id) ON DELETE CASCADE,
  user_id               UUID    NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  provider_account_id   TEXT    NOT NULL,                 -- account_id no Pluggy
  financial_account_id  UUID    REFERENCES public.financial_account(id) ON DELETE SET NULL,
  credit_card_id        UUID    REFERENCES public.credit_card(id) ON DELETE SET NULL,
  account_type          TEXT    NOT NULL,                 -- tipo retornado pelo provider
  last_synced_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, provider_account_id),
  -- Garante que cada conta local tenha no maximo 1 mapeamento ativo
  CONSTRAINT chk_map_target CHECK (
    (financial_account_id IS NOT NULL AND credit_card_id IS NULL) OR
    (financial_account_id IS NULL AND credit_card_id IS NOT NULL)
  )
);

ALTER TABLE public.open_finance_account_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY of_account_map_own ON public.open_finance_account_map
  USING (user_id = auth.uid());
```

#### `open_finance_sync_log`
Historico de operacoes de sincronizacao (auditoria e diagnostico).

```sql
CREATE TABLE public.open_finance_sync_log (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id         UUID          NOT NULL REFERENCES public.open_finance_connection(id) ON DELETE CASCADE,
  user_id               UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  trigger               TEXT          NOT NULL CHECK (trigger IN ('manual','cron','webhook','first_sync')),
  status                TEXT          NOT NULL CHECK (status IN ('running','success','partial','error')),
  accounts_synced       SMALLINT      NOT NULL DEFAULT 0,
  transactions_created  INT           NOT NULL DEFAULT 0,
  transactions_updated  INT           NOT NULL DEFAULT 0,
  transactions_skipped  INT           NOT NULL DEFAULT 0,
  error_message         TEXT,
  started_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  finished_at           TIMESTAMPTZ,
  duration_ms           INT
);

-- Sem RLS em escrita — apenas service_role escreve
-- Leitura: usuario acessa apenas seus proprios logs
ALTER TABLE public.open_finance_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY of_sync_log_select ON public.open_finance_sync_log
  FOR SELECT USING (user_id = auth.uid());
```

#### `open_finance_webhook_event`
Fila de eventos recebidos do provider, antes do processamento.
Permite reprocessamento em caso de falha.

```sql
CREATE TABLE public.open_finance_webhook_event (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT        NOT NULL DEFAULT 'pluggy',
  event_type      TEXT        NOT NULL,        -- ex: 'transaction/created', 'item/updated'
  provider_item_id TEXT       NOT NULL,        -- correlaciona com connection
  payload         JSONB       NOT NULL,
  signature       TEXT,                        -- HMAC-SHA256 do provider para verificacao
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','processed','failed','ignored')),
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- service_role insere; sem RLS de leitura para users (dado interno)
ALTER TABLE public.open_finance_webhook_event ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy de SELECT/INSERT para usuarios — apenas service_role
```

#### `open_finance_transaction_map`
Mapeia transacao importada do provider para transacao local.
Chave para deduplicacao e reconciliacao.

```sql
CREATE TABLE public.open_finance_transaction_map (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID    NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  connection_id       UUID    NOT NULL REFERENCES public.open_finance_connection(id) ON DELETE CASCADE,
  provider_tx_id      TEXT    NOT NULL,        -- ID único da transacao no provider
  transaction_id      UUID    REFERENCES public.transaction(id) ON DELETE SET NULL,
  raw_payload         JSONB   NOT NULL,        -- snapshot original para auditoria
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, provider_tx_id)
);

ALTER TABLE public.open_finance_transaction_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY of_tx_map_own ON public.open_finance_transaction_map
  USING (user_id = auth.uid());
```

### 3.2 Alteracoes em Tabelas Existentes

#### `financial_account`
```sql
-- Referencia à conexao Open Finance que sincroniza esta conta
ALTER TABLE public.financial_account
  ADD COLUMN IF NOT EXISTS of_connection_id UUID REFERENCES public.open_finance_connection(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS of_account_id    TEXT,   -- provider_account_id para consultas rapidas
  ADD COLUMN IF NOT EXISTS is_manual        BOOLEAN NOT NULL DEFAULT TRUE;
  -- is_manual ja existe; atualizar para FALSE ao associar uma conexao OF

-- Quando of_connection_id IS NOT NULL, saldo e atualizado via sync
COMMENT ON COLUMN public.financial_account.of_connection_id IS
  'Conexao Open Finance que sincroniza esta conta. NULL = conta manual.';
```

#### `credit_card`
```sql
ALTER TABLE public.credit_card
  ADD COLUMN IF NOT EXISTS of_connection_id UUID REFERENCES public.open_finance_connection(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS of_account_id    TEXT,
  ADD COLUMN IF NOT EXISTS external_id      TEXT;
```

### 3.3 Diagrama de Relacionamentos

```
profile (1) ──────────────────────── (N) open_finance_connection
                                               │
                              ┌────────────────┤
                              │                │
                    (N) open_finance_account_map      (N) open_finance_sync_log
                              │                        (N) open_finance_webhook_event
                    ┌─────────┴──────────┐
                    │                    │
          financial_account        credit_card
                    │
          (N) open_finance_transaction_map
                    │
               transaction
```

---

## 4. Integracao com Tabelas Existentes

### 4.1 `institution`
Ja possui `ispb` e `supports_open_finance`. O `ispb` e o identificador canonico para correlacionar a instituicao Pluggy com o registro local.

Fluxo: ao criar a conexao, buscar a instituicao pelo `ispb` retornado pelo Pluggy e preencher `open_finance_connection.institution_id`.

### 4.2 `financial_account`
Fluxo de primeira sincronizacao:
1. Pluggy retorna lista de contas do usuario
2. Para cada conta: verificar se ja existe `financial_account` com mesmo `institution_id` e tipo similar
3. Se sim: oferecer mapeamento (usuario confirma)
4. Se nao: criar nova `financial_account` com `is_manual = FALSE` e `of_connection_id` preenchido
5. Registrar em `open_finance_account_map`

Fluxo de sync incremental:
- Atualizar `balance` e `balance_updated_at` na `financial_account`
- Nunca sobrescrever campos editados manualmente pelo usuario (nome, cor, icone)

### 4.3 `credit_card`
Similar a `financial_account`. Campos adicionais sincronizados:
- `credit_limit`, `available_limit`, `last_four`
- Faturas via `credit_card_invoice` (novo campo `of_invoice_id`)

### 4.4 `transaction`
Cada transacao importada do Open Finance preenche:
- `origin = 'open_finance'`
- `external_id = provider_tx_id` (para dedup rapido, alem do mapa)
- `account_id` ou `card_id` correspondente
- `status = 'confirmed'` se a transacao ja foi postada; `'pending'` se pendente
- Um registro em `open_finance_transaction_map` (auditoria e reprocessamento)

---

## 5. Seguranca

### 5.1 Armazenamento de Tokens e Credenciais

**O que NUNCA deve estar no banco Postgres direto:**
- Client Secret do Pluggy
- Tokens de acesso de longa duração do provider

**Onde armazenar:**

| Item | Onde | Como |
|---|---|---|
| `PLUGGY_CLIENT_ID` | Variavel de ambiente (Vercel) | `process.env.PLUGGY_CLIENT_ID` — servidor only |
| `PLUGGY_CLIENT_SECRET` | Variavel de ambiente (Vercel) | `process.env.PLUGGY_CLIENT_SECRET` — servidor only |
| Connect Token (vida curta ~30min) | Memoria — nunca persiste | Gerado on-demand por Server Action |
| `item_id` Pluggy (referencia de conexao) | `open_finance_connection.provider_item_id` | Nao sensivel — apenas ID |
| API Key do Pluggy para chamadas | Variavel de ambiente | Nunca no banco |

**Supabase Vault (futuro):**
Para armazenar referencias criptografadas a dados sensíveis por usuario (ex: refresh tokens de longa duração, se o provider os emitir):

```sql
-- Usar pgsodium (já incluído no Supabase)
SELECT vault.create_secret(
  'pluggy_refresh_token_user_123',
  'token_value_here',
  'Refresh token Pluggy do usuario 123'
);
```

Na pratica, o Pluggy nao emite refresh tokens de longa duracao — o `item_id` e a referencia persistente e credenciais sao gerenciadas pelo proprio Pluggy. O Vault e opcional para MVP.

### 5.2 service_role

O client `service_role` (que bypassa RLS) e usado apenas para:
- Inserir em `open_finance_webhook_event` (Route Handler do webhook)
- Inserir em `open_finance_sync_log`
- Escrever em `open_finance_transaction_map`
- Atualizar `open_finance_connection.status`

Todas as leituras de dados do usuario (`financial_account`, `transaction`) usam o client SSR normal com JWT do usuario.

### 5.3 Webhooks

O provider (Pluggy) assina cada evento com HMAC-SHA256 usando uma chave secreta configurada no painel do Pluggy.

Fluxo de validacao:
```
POST /api/webhooks/open-finance
  1. Extrair header X-Pluggy-Signature
  2. Calcular HMAC-SHA256(body_raw, PLUGGY_WEBHOOK_SECRET)
  3. Comparar com timing-safe compare (crypto.timingSafeEqual)
  4. Rejeitar com 401 se invalido
  5. Persistir em open_finance_webhook_event com status 'pending'
  6. Retornar 200 imediatamente (nao processar na request)
  7. Processar em background (Edge Function agendada a cada 1 min)
```

Chave de ambiente necessaria: `PLUGGY_WEBHOOK_SECRET`

### 5.4 LGPD

Obrigacoes:
- **Finalidade:** dados de Open Finance so podem ser usados para finalidade declarada ao usuario (analise financeira pessoal)
- **Consentimento:** o Pluggy Connect captura consentimento do usuario direto com o banco — o app apenas armazena a referencia (`item_id`)
- **Revogacao:** o usuario pode desconectar a qualquer momento; a operacao deve apagar ou anonimizar dados sincronizados conforme preferencia do usuario
- **Retencao:** definir politica de retencao para `open_finance_transaction_map` e `open_finance_webhook_event` (sugestao: 90 dias para logs, dados financeiros seguem a mesma politica da `transaction`)
- **Portabilidade:** ao exportar dados (`plan.features.export_csv`), incluir transacoes de Open Finance marcadas como `origin = 'open_finance'`
- **DPA:** assinar Data Processing Agreement com o Pluggy

Campos que NAO devem ser armazenados:
- Credenciais bancarias do usuario (senhas, tokens de acesso ao banco)
- Dados biometricos
- O Pluggy e responsavel por armazenar e gerenciar as credenciais — o app so recebe os dados ja processados

### 5.5 Revogacao de Acesso

Fluxo ao usuario desconectar:
```
1. Server Action: disconnectOpenFinance(connectionId)
2. requireAuth() verifica posse da conexao
3. Chamar provider.disconnect(connectionId) → revoga no Pluggy/banco
4. UPDATE open_finance_connection SET status='disconnected', deleted_at=NOW()
5. UPDATE financial_account SET of_connection_id=NULL, is_manual=TRUE WHERE of_connection_id=connectionId
6. UPDATE credit_card SET of_connection_id=NULL WHERE of_connection_id=connectionId
7. Transacoes permanecem (historico do usuario) — origin='open_finance' permanece para rastreabilidade
8. open_finance_transaction_map — manter por 90 dias para auditoria, entao purgar
9. Registrar em open_finance_sync_log com trigger='manual', status='success'
```

---

## 6. Sincronizacao

### 6.1 Primeira Sincronizacao

Acionada apos o usuario autorizar no Pluggy Connect:

```
POST /api/open-finance/connect (Route Handler)
  body: { itemId: string }

1. Validar JWT do usuario (requireAuth)
2. Criar open_finance_connection com status='syncing'
3. Chamar provider.syncAccounts(itemId) → lista de contas
4. Para cada conta:
   a. Buscar financial_account local com mesmo institution_id + tipo
   b. Criar ou associar conta
   c. Registrar em open_finance_account_map
5. Para cada conta: chamar syncTransactions(accountId, from=90dias, to=hoje)
6. Para cada transacao: upsert em transaction + open_finance_transaction_map
7. UPDATE open_finance_connection SET status='connected', last_synced_at=NOW()
8. Registrar em open_finance_sync_log
```

**Janela de historico inicial:** 90 dias (configuravel via `OPEN_FINANCE_INITIAL_HISTORY_DAYS`).

### 6.2 Sync Incremental

Busca apenas transacoes desde `last_synced_at - 2 dias` (overlap para capturar pendentes que viraram confirmadas).

```typescript
const from = subDays(connection.last_synced_at, 2);
const to   = new Date();
```

### 6.3 Sync Manual

Botao "Sincronizar agora" na UI → Server Action `triggerManualSync(connectionId)`:
- Rate limit: 1 sync manual a cada 5 minutos por conexao (verificar `last_synced_at`)
- Processo identico ao sync incremental
- Registrar com `trigger = 'manual'` no log

### 6.4 Sync via Cron

Cron Vercel: a cada hora, dias uteis (`0 * * * 1-5`):
```
GET /api/cron/sync-open-finance
  Authorization: Bearer CRON_SECRET

1. Buscar conexoes ativas (status='connected') com last_synced_at < 1h
2. Para cada conexao: executar sync incremental
3. Limitar a 10 conexoes por execucao (rate limit Pluggy)
4. Registrar resultados em open_finance_sync_log
```

### 6.5 Sync via Webhook

Fluxo de processamento de webhook (background):
```
Edge Function scheduled (cada 1 min):
1. Buscar open_finance_webhook_event WHERE status='pending' LIMIT 20
2. Para cada evento:
   a. Identificar conexao pelo provider_item_id
   b. Se event_type = 'transaction/created' → sync de transacoes da conta
   c. Se event_type = 'item/updated' → sync de contas e saldos
   d. Se event_type = 'item/error' → UPDATE connection status='error'
   e. UPDATE event SET status='processed' / 'failed'
```

---

## 7. Conciliacao e Deduplicacao

### 7.1 Estrategia de Deduplicacao

**Nivel 1 — Chave primaria do provider:**
```sql
-- Unico por (connection_id, provider_tx_id)
UNIQUE (connection_id, provider_tx_id) em open_finance_transaction_map
```
Antes de inserir, verificar se `provider_tx_id` ja existe. Se sim, verificar se dados mudaram (pending → posted) e atualizar.

**Nivel 2 — external_id na transaction:**
```sql
-- Indice para busca rapida
CREATE INDEX idx_transaction_external_id ON public.transaction (external_id)
WHERE external_id IS NOT NULL;
```
`transaction.external_id = provider_tx_id` (redundante com o mapa, mas permite queries diretas).

**Nivel 3 — Fingerprint (fallback para providers sem ID estavel):**
```
fingerprint = SHA256(account_id + date + amount + description_normalized)
```
Usado apenas se o provider nao garantir IDs estaveis entre syncs.

### 7.2 Transacoes Editadas pelo Usuario

Problema: usuario edita descricao/categoria de uma transacao importada; proximo sync do provider retorna a mesma transacao com os dados originais.

Solucao: campos de "propriedade do usuario" vs "propriedade do provider":

| Campo | Dono | Comportamento no sync |
|---|---|---|
| `description` | Usuario | Preservar se editado pelo usuario |
| `category_id` | Usuario | Nunca sobrescrever |
| `amount` | Provider | Atualizar (pode mudar em pendentes) |
| `status` | Provider | Atualizar (pending → confirmed) |
| `date` | Provider | Atualizar apenas se status mudou |
| `notes` | Usuario | Nunca tocar |

Implementacao: adicionar coluna `user_edited_fields TEXT[] DEFAULT '{}'` na `transaction`, ou verificar `updated_at` vs `created_at` para detectar edicao manual.

### 7.3 Conciliacao Manual vs Open Finance

Quando usuario tem transacao manual criada antes de conectar Open Finance, e o sync traz a mesma transacao:

```
Deteccao de duplicata potencial:
  - Mesma conta (via account_map)
  - Mesmo valor (±0.01)
  - Mesma data (±1 dia)
  - Descricao similar (threshold de 0.7 usando normalização simples)

Opcoes ao usuario:
  A) Mesclar (adota external_id da OF, mantém campos do usuario)
  B) Manter ambas (usuario escolhe qual e a "oficial")
  C) Ignorar a importada
```

Implementacao no Sprint 9.3+ (nao bloqueia o MVP de Open Finance).

### 7.4 Reconciliacao de Saldo

Ao sync de saldo, o provider retorna o saldo real da conta bancaria. Pode divergir do saldo calculado via transacoes por:
- Transacoes ainda nao sincronizadas
- IOF, tarifas calculadas pelo banco
- Estornos

Estrategia: `financial_account.balance` = saldo real do provider (autoritativo). O saldo calculado via sum(transactions) e mostrado separadamente como "saldo conciliado" na UI (Sprint 9.5+).

---

## 8. Estados da Conexao

### 8.1 Maquina de Estados

```
                    ┌─────────┐
               ┌───►│ pending │
               │    └────┬────┘
               │         │ usuario autoriza no Connect Widget
               │         ▼
               │    ┌───────────┐
               │    │ connected │◄──────────────────┐
               │    └─────┬─────┘                   │
               │          │                         │
               │    ┌─────┼──────────┐    ┌─────────┴──────────┐
               │    │     │          │    │                     │
               │    ▼     ▼          ▼    │ refreshConnection   │
               │ ┌─────────┐  ┌─────────┐│ (usuario reautoriza)│
               │ │ syncing │  │ expired ├┘                     │
               │ └────┬────┘  └────┬────┘                      │
               │      │            │                           │
               │      ▼            ▼                           │
               │   ┌───────┐  ┌─────────────────┐            │
               │   │ error │  │pending_user_action│            │
               │   └───┬───┘  └────────┬─────────┘            │
               │       │               │ usuario reautoriza    │
               │       │               └──────────────────────►┘
               │       │ usuario desconecta
               │       │ ou erro permanente
               │       ▼
               │ ┌──────────────┐
               └─┤ disconnected │
                 └──────────────┘
```

### 8.2 Tabela de Transicoes

| De | Para | Trigger |
|---|---|---|
| `pending` | `connected` | Primeiro sync concluido com sucesso |
| `connected` | `syncing` | Inicio de qualquer operacao de sync |
| `syncing` | `connected` | Sync concluido com sucesso |
| `syncing` | `error` | Erro recuperavel (timeout, banco fora do ar) |
| `syncing` | `expired` | Token/consentimento expirado |
| `connected` | `expired` | Webhook `item/expired` ou 401 do provider |
| `expired` | `pending_user_action` | App notifica usuario para reautorizar |
| `pending_user_action` | `connected` | Usuario completa reautorizacao no widget |
| `error` | `connected` | Retry bem-sucedido |
| `error` | `disconnected` | 3 retries falhos ou usuario desconecta |
| `expired` | `disconnected` | Usuario nao reautoriza em 30 dias |
| `any` | `disconnected` | Usuario clica "Desconectar" |

---

## 9. Tratamento de Erros

### 9.1 Classificacao de Erros

| Tipo | Codigo | Acao | Status Conexao |
|---|---|---|---|
| Instituicao fora do ar | `PROVIDER_UNAVAILABLE` | Retry com backoff exponencial (3x) | `error` temporario |
| Token/consentimento expirado | `TOKEN_EXPIRED` | Notificar usuario para reautorizar | `expired` |
| Credenciais invalidas | `INVALID_CREDENTIALS` | Notificar usuario — nao e erro do app | `error` / `pending_user_action` |
| Rate limit do provider | `RATE_LIMIT` | Retry apos `Retry-After` header | `syncing` (pausado) |
| Dados inconsistentes | `DATA_VALIDATION` | Ignorar registro especifico, log detalhado | `connected` (parcial) |
| Timeout de rede | `NETWORK_TIMEOUT` | Retry imediato 1x, entao exponential | `error` temporario |
| Conta nao encontrada no provider | `ACCOUNT_NOT_FOUND` | Marcar `account_map` como desativado | `connected` (parcial) |
| Webhook signature invalida | `INVALID_SIGNATURE` | Rejeitar com 401, log de seguranca | N/A |

### 9.2 Retry Strategy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts || !isRetryable(err)) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  throw new Error("unreachable");
}

function isRetryable(err: unknown): boolean {
  // Retryable: timeout, 5xx, rate limit
  // Nao retryable: 401, 403, 404, dados invalidos
  if (err instanceof OFError) {
    return ["PROVIDER_UNAVAILABLE", "NETWORK_TIMEOUT", "RATE_LIMIT"].includes(err.code);
  }
  return false;
}
```

### 9.3 Circuit Breaker por Instituicao

Para evitar martelar uma instituicao que esta fora do ar:
- Se 3 syncs consecutivos falharem para a mesma `institution_id`, pausar syncs automaticos por 1h
- Registrar estado do circuit breaker em `open_finance_connection.error_message`
- Syncs manuais sempre tentam (usuario escolhe forcar)

---

## 10. Roadmap de Implementacao

### Sprint 9.1 — Fundacao (2 semanas)

**Objetivo:** Tabelas, tipos e abstrcao de provider. Sem UI.

Arquivos a criar:
- `supabase/migrations/011_open_finance.sql` — 5 tabelas novas + alteracoes
- `src/lib/open-finance/types.ts` — interface + tipos
- `src/lib/open-finance/pluggy-provider.ts` — implementacao Pluggy
- `src/lib/open-finance/index.ts` — factory
- `src/services/open-finance.ts` — Server Actions (connect, disconnect, getConnections)

Variaveis de ambiente a configurar:
- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `PLUGGY_WEBHOOK_SECRET`
- `OPEN_FINANCE_PROVIDER=pluggy`

Testes:
- Unit tests para `types.ts` e logica de deduplicacao
- Smoke test no sandbox Pluggy

**Nao implementar:** UI, sync automatico, webhooks

---

### Sprint 9.2 — Conexao e Primeira Sincronizacao (2 semanas)

**Objetivo:** Usuario consegue conectar um banco e ver transacoes importadas.

Arquivos a criar:
- `src/app/accounts/connect/page.tsx` — pagina de conexao
- `src/app/accounts/connect/ConnectClient.tsx` — embed do Pluggy Connect widget
- `src/app/api/open-finance/connect/route.ts` — Route Handler (recebe item_id pos-autorizacao)
- `src/app/api/webhooks/open-finance/route.ts` — Route Handler para webhooks
- `src/services/open-finance-sync.ts` — logica de sync (pura, sem "use server")

Funcionalidades:
- Pluggy Connect widget no flow de adicionar conta
- Primeira sincronizacao (90 dias de historico)
- Exibir `open_finance_connection.status` na tela de contas
- Botao "Sincronizar agora"

**Nao implementar:** sync automatico via cron, reconciliacao manual, tratamento de expirados

---

### Sprint 9.3 — Sync Automatico e Webhooks (1 semana)

**Objetivo:** Dados se atualizam sem acao do usuario.

Arquivos a criar/alterar:
- `src/app/api/cron/sync-open-finance/route.ts` — cron hourly
- `vercel.json` — adicionar novo cron `0 * * * 1-5`
- Edge Function Supabase para processar fila de webhooks (opcional: pode ser cron tambem)
- `src/lib/open-finance/sync-engine.ts` — logica de sync incremental

Funcionalidades:
- Sync incremental a cada hora (dias uteis)
- Processamento da fila de webhooks a cada 1 minuto
- Notificacao no Header quando ha conexao com status `expired` ou `error`

---

### Sprint 9.4 — Gestao de Conexoes e Reautorizacao (1 semana)

**Objetivo:** Usuario gerencia suas conexoes, reautoriza expiradas.

Arquivos a criar:
- `src/app/settings/connections/page.tsx` — lista de conexoes ativas
- `src/app/settings/connections/ConnectionCard.tsx` — card por conexao com status
- Server Action `refreshConnection(id)` — reautorizacao via widget
- Server Action `disconnectConnection(id)` — revogacao com limpeza de dados

Funcionalidades:
- Lista de conexoes com status visual (connected, expired, error)
- Botao "Reautorizar" para conexoes expiradas
- Botao "Desconectar" com confirmacao
- Historico de sincronizacoes (last 10 logs)

---

### Sprint 9.5 — Conciliacao e Qualidade de Dados (2 semanas)

**Objetivo:** Experiencia polida — sem duplicatas, reconciliacao inteligente.

Funcionalidades:
- Deteccao de duplicatas potenciais (transacao manual + importada)
- UI de reconciliacao: "Esta transacao parece ser a mesma que voce criou manualmente"
- Saldo conciliado vs saldo bancario no card de conta
- Filtro "origem" nas transacoes (manual / Open Finance / importado)
- Export CSV com campo `origin`

---

## 11. O que NAO Implementar Ainda

| Item | Motivo | Quando |
|---|---|---|
| Multiplos providers simultaneos (Pluggy + Belvo) | Complexidade desnecessaria no MVP | Sprint 10+ |
| Supabase Vault para tokens | Pluggy nao emite refresh tokens de longa duracao | Quando houver credencial sensivel para armazenar |
| Open Finance Brasil direto (sem aggregator) | 6+ meses de trabalho, certificacao necessaria | Se Pluggy se tornar insustentavel |
| Sync de investimentos via Open Finance | Ja temos module proprio (B3, BRAPI) | Avaliar cobertura da Pluggy primeiro |
| IA de categorizacao automatica | Depende de volume de dados; primeiro obter dados | Sprint 10+ |
| Importacao de dados historicos > 12 meses | Pluggy limita a 12 meses no plano basico | Plano Pro do Pluggy |
| Multi-conta por conexao (uma conexao, N usuarios) | Fora do escopo para B2C | N/A |
| Suporte a contas de investimento via OF | Conflito com modulo de investimentos existente | Avaliacao futura |
| Push notifications (Pluggy → usuario em tempo real) | Requer WebSockets ou SSE | Sprint 10+ |
| Conciliacao automatica sem confirmacao do usuario | Risco de mesclar transacoes erradas | Sprint 9.5 (manual) |

---

## 12. Riscos e Decisoes Tecnicas

### 12.1 Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Pluggy muda precos drasticamente | Media | Alto | Interface abstrata permite trocar por Belvo em 1 sprint |
| Instituicao nao participa do Open Finance BR | Alta (bancos menores) | Medio | Exibir cobertura clara na UI; fallback para importacao manual |
| Volume de webhooks alto em pico | Baixa | Medio | Fila `open_finance_webhook_event` absorve picos; processa async |
| Usuario nao reautoriza conexao expirada | Alta | Baixo | Notificacao proativa; dados historicos permanecem |
| Dados do provider com qualidade ruim (descricoes genéricas) | Alta | Baixo | IA de categorizacao no Sprint 10 mitiga |
| Latencia do Pluggy em sincronizacoes grandes | Media | Medio | Sync em background; nunca bloqueia a UI |
| LGPD: usuario pede exclusao de dados | Baixa | Alto | `deleted_at` em todas as tabelas; script de purge documentado |

### 12.2 Decisoes Tecnicas

| Decisao | Opcao Escolhida | Alternativa Rejeitada | Justificativa |
|---|---|---|---|
| Provider | Pluggy | Belvo / OF direto | Maior cobertura BR, empresa brasileira, widget pronto |
| Armazenamento de consentimento | `item_id` no banco (nao-sensivel) | Token completo no Vault | Pluggy gerencia o consentimento; item_id e apenas referencia |
| Processamento de webhooks | Fila async (tabela + cron) | Processamento sincrono na request | Nao bloqueia o provider; tolerante a falhas |
| Deduplicacao | provider_tx_id como chave primaria | Fingerprint por valor/data | ID do provider e mais confiavel; fingerprint como fallback |
| Saldo autoritativo | Provider (bancario) | Calculado via soma de transacoes | Saldo real e mais util; discrepancias sao informativas |
| Sync automatico | Cron horario + webhooks | Polling continuo / SSE | Balanco custo/frescor; webhooks para eventos criticos |
| Reconciliacao | Manual com sugestao da IA | Automatica | Evita mesclar transacoes erradas silenciosamente |

---

*Documento gerado em 2026-06-29. Versao 1.0.*
*Revisao prevista apos Sprint 9.2 — quando o fluxo real de conexao estiver implementado.*
