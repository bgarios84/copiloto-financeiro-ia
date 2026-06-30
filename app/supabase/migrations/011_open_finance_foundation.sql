-- =============================================================================
-- Migration: 011_open_finance_foundation.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 9.1 — Open Finance Foundation
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.open_finance_connection
--   2. Cria tabela public.open_finance_account_map
--   3. Cria tabela public.open_finance_sync_log
--   4. Cria tabela public.open_finance_webhook_event
--   5. Cria tabela public.open_finance_transaction_map
--   6. Adiciona colunas OF em public.financial_account
--   7. Adiciona colunas OF em public.credit_card
--
-- SEGURANCA:
--   - Nenhuma credencial bancaria ou token sensiivel armazenado aqui.
--   - Apenas item_id (referencia nao-sensivel do Pluggy) e persistido.
--   - Secrets ficam em variaveis de ambiente (servidor only).
--   - service_role escreve em tabelas de auditoria; RLS protege leitura.
--
-- IDEMPOTENTE: IF NOT EXISTS em todas as operacoes, ADD COLUMN IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. open_finance_connection
--    Representa uma conexao autorizada de um usuario com uma instituicao
--    via provider Open Finance (Pluggy, Belvo, etc.).
--    Armazena apenas o item_id do provider — nenhuma credencial.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.open_finance_connection (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  provider             TEXT        NOT NULL DEFAULT 'pluggy'
                                   CHECK (provider IN ('pluggy','belvo')),
  provider_item_id     TEXT        NOT NULL,
  institution_id       UUID        REFERENCES public.institution(id) ON DELETE SET NULL,
  status               TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN (
                                     'pending','connected','syncing',
                                     'expired','error','disconnected','pending_user_action'
                                   )),
  error_message        TEXT,
  consent_expires_at   TIMESTAMPTZ,
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  UNIQUE (user_id, provider, provider_item_id)
);

COMMENT ON TABLE  public.open_finance_connection IS
  'Conexoes Open Finance autorizadas pelo usuario. Apenas item_id do provider e armazenado — sem credenciais.';
COMMENT ON COLUMN public.open_finance_connection.provider_item_id IS
  'ID da conexao no provider (ex: item_id do Pluggy). Nao sensivel — apenas referencia.';
COMMENT ON COLUMN public.open_finance_connection.status IS
  'pending | connected | syncing | expired | error | disconnected | pending_user_action';

ALTER TABLE public.open_finance_connection ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "of_connection_select_own"
    ON public.open_finance_connection FOR SELECT
    USING (user_id = auth.uid() AND deleted_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "of_connection_insert_own"
    ON public.open_finance_connection FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "of_connection_update_own"
    ON public.open_finance_connection FOR UPDATE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- service_role pode atualizar status sem restricao de user_id
-- (necessario para webhooks e cron que rodam fora do contexto do usuario)
DO $$
BEGIN
  CREATE POLICY "of_connection_service_role_all"
    ON public.open_finance_connection FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_of_connection_user_id
  ON public.open_finance_connection (user_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_of_connection_status
  ON public.open_finance_connection (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_of_connection_provider_item
  ON public.open_finance_connection (provider, provider_item_id);

-- -----------------------------------------------------------------------------
-- 2. open_finance_account_map
--    Mapeia conta do provider -> financial_account ou credit_card local.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.open_finance_account_map (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id        UUID        NOT NULL
                                   REFERENCES public.open_finance_connection(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  provider_account_id  TEXT        NOT NULL,
  financial_account_id UUID        REFERENCES public.financial_account(id) ON DELETE SET NULL,
  credit_card_id       UUID        REFERENCES public.credit_card(id) ON DELETE SET NULL,
  account_type         TEXT        NOT NULL,
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, provider_account_id),
  CONSTRAINT chk_of_map_target CHECK (
    (financial_account_id IS NOT NULL AND credit_card_id IS NULL) OR
    (financial_account_id IS NULL     AND credit_card_id IS NOT NULL) OR
    (financial_account_id IS NULL     AND credit_card_id IS NULL)
  )
);

COMMENT ON TABLE  public.open_finance_account_map IS
  'Mapeamento de conta do provider para financial_account ou credit_card local.';
COMMENT ON COLUMN public.open_finance_account_map.provider_account_id IS
  'ID da conta no provider (ex: account_id do Pluggy).';

ALTER TABLE public.open_finance_account_map ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "of_account_map_select_own"
    ON public.open_finance_account_map FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "of_account_map_service_role_all"
    ON public.open_finance_account_map FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_of_account_map_user_id
  ON public.open_finance_account_map (user_id);

CREATE INDEX IF NOT EXISTS idx_of_account_map_connection
  ON public.open_finance_account_map (connection_id);

CREATE INDEX IF NOT EXISTS idx_of_account_map_financial_account
  ON public.open_finance_account_map (financial_account_id) WHERE financial_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_of_account_map_credit_card
  ON public.open_finance_account_map (credit_card_id) WHERE credit_card_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. open_finance_sync_log
--    Historico imutavel de operacoes de sincronizacao (auditoria).
--    Apenas service_role escreve; usuario pode ler seus proprios logs.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.open_finance_sync_log (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id         UUID        NOT NULL
                                    REFERENCES public.open_finance_connection(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  trigger               TEXT        NOT NULL
                                    CHECK (trigger IN ('manual','cron','webhook','first_sync')),
  status                TEXT        NOT NULL
                                    CHECK (status IN ('running','success','partial','error')),
  accounts_synced       SMALLINT    NOT NULL DEFAULT 0,
  transactions_created  INT         NOT NULL DEFAULT 0,
  transactions_updated  INT         NOT NULL DEFAULT 0,
  transactions_skipped  INT         NOT NULL DEFAULT 0,
  error_message         TEXT,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at           TIMESTAMPTZ,
  duration_ms           INT
);

COMMENT ON TABLE public.open_finance_sync_log IS
  'Log imutavel de operacoes de sincronizacao Open Finance. service_role escreve; usuario le.';

ALTER TABLE public.open_finance_sync_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "of_sync_log_select_own"
    ON public.open_finance_sync_log FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "of_sync_log_service_role_all"
    ON public.open_finance_sync_log FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_of_sync_log_connection
  ON public.open_finance_sync_log (connection_id);

CREATE INDEX IF NOT EXISTS idx_of_sync_log_user_started
  ON public.open_finance_sync_log (user_id, started_at DESC);

-- -----------------------------------------------------------------------------
-- 4. open_finance_webhook_event
--    Fila de eventos recebidos do provider antes do processamento.
--    Tabela interna — sem acesso de leitura para usuarios.
--    Apenas o Route Handler de webhook (service_role) insere.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.open_finance_webhook_event (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         TEXT        NOT NULL DEFAULT 'pluggy'
                               CHECK (provider IN ('pluggy','belvo')),
  event_type       TEXT        NOT NULL,
  provider_item_id TEXT        NOT NULL,
  payload          JSONB       NOT NULL DEFAULT '{}',
  signature        TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','processed','failed','ignored')),
  processed_at     TIMESTAMPTZ,
  error_message    TEXT,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.open_finance_webhook_event IS
  'Fila de eventos de webhook do provider. Processados de forma assincrona. Tabela interna — sem acesso de usuario.';
COMMENT ON COLUMN public.open_finance_webhook_event.signature IS
  'HMAC-SHA256 enviado pelo provider para verificacao de autenticidade.';

ALTER TABLE public.open_finance_webhook_event ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy de SELECT/INSERT/UPDATE para usuarios autenticados.
-- Apenas service_role opera esta tabela.
DO $$
BEGIN
  CREATE POLICY "of_webhook_event_service_role_all"
    ON public.open_finance_webhook_event FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_of_webhook_event_status
  ON public.open_finance_webhook_event (status, received_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_of_webhook_event_provider_item
  ON public.open_finance_webhook_event (provider_item_id);

-- -----------------------------------------------------------------------------
-- 5. open_finance_transaction_map
--    Mapeia transacao do provider -> transaction local.
--    Chave primaria para deduplicacao: (connection_id, provider_tx_id).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.open_finance_transaction_map (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  connection_id   UUID        NOT NULL
                              REFERENCES public.open_finance_connection(id) ON DELETE CASCADE,
  provider_tx_id  TEXT        NOT NULL,
  transaction_id  UUID        REFERENCES public.transaction(id) ON DELETE SET NULL,
  raw_payload     JSONB       NOT NULL DEFAULT '{}',
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, provider_tx_id)
);

COMMENT ON TABLE  public.open_finance_transaction_map IS
  'Chave de deduplicacao entre transacoes do provider e transaction local.';
COMMENT ON COLUMN public.open_finance_transaction_map.raw_payload IS
  'Snapshot do payload original do provider para auditoria e reprocessamento.';

ALTER TABLE public.open_finance_transaction_map ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "of_tx_map_select_own"
    ON public.open_finance_transaction_map FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "of_tx_map_service_role_all"
    ON public.open_finance_transaction_map FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_of_tx_map_user_id
  ON public.open_finance_transaction_map (user_id);

CREATE INDEX IF NOT EXISTS idx_of_tx_map_connection
  ON public.open_finance_transaction_map (connection_id);

CREATE INDEX IF NOT EXISTS idx_of_tx_map_transaction
  ON public.open_finance_transaction_map (transaction_id) WHERE transaction_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Adicionar colunas Open Finance em financial_account
-- -----------------------------------------------------------------------------

ALTER TABLE public.financial_account
  ADD COLUMN IF NOT EXISTS of_connection_id UUID
    REFERENCES public.open_finance_connection(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS of_account_id    TEXT;

COMMENT ON COLUMN public.financial_account.of_connection_id IS
  'Conexao Open Finance que sincroniza esta conta. NULL = conta manual.';
COMMENT ON COLUMN public.financial_account.of_account_id IS
  'provider_account_id para referencia rapida sem JOIN em open_finance_account_map.';

CREATE INDEX IF NOT EXISTS idx_financial_account_of_connection
  ON public.financial_account (of_connection_id) WHERE of_connection_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. Adicionar colunas Open Finance em credit_card
-- -----------------------------------------------------------------------------

ALTER TABLE public.credit_card
  ADD COLUMN IF NOT EXISTS of_connection_id UUID
    REFERENCES public.open_finance_connection(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS of_account_id    TEXT;

COMMENT ON COLUMN public.credit_card.of_connection_id IS
  'Conexao Open Finance que sincroniza este cartao. NULL = cartao manual.';
COMMENT ON COLUMN public.credit_card.of_account_id IS
  'provider_account_id para referencia rapida sem JOIN em open_finance_account_map.';

CREATE INDEX IF NOT EXISTS idx_credit_card_of_connection
  ON public.credit_card (of_connection_id) WHERE of_connection_id IS NOT NULL;
