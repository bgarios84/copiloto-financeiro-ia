-- =============================================================================
-- Migration: 001_mvp_schema.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 4.2 — Database MVP
-- Date     : 2026-06-28
-- Revision : 2 (2026-06-28) — corrige B1/B2/B3 + A1/A2/A3/A4/A5
-- Tables   : 16 MVP tables + audit.log
-- Engine   : PostgreSQL 15+ via Supabase
--
-- Execution order:
--   1. Extensions & helper functions
--   2. Audit schema (+ REVOKE de segurança) [A2]
--   3. plan table
--   4. SEED plan [A4 — antes do trigger handle_new_user]
--   5. profile + user_preference
--   6. institution (com UNIQUE short_name) [B2]
--   7. SEED institution (ON CONFLICT short_name) [B2]
--   8. financial_account
--   9. category (com índice único parcial) [B3]
--  10. SEED category (idempotente) [B3]
--  11. credit_card → credit_card_invoice
--  12. recurrence → installment_group
--  13. transaction (self-ref FK via ALTER)
--  14. net_worth_snapshot
--  15. goal → goal_contribution
--  16. plan_subscription (com UNIQUE user_id) [A3] → plan_usage
--  17. RLS — ENABLE
--  18. RLS — Policies (category_insert_own + category_update_own corrigidos) [B1/A1]
--  19. Indexes
--  20. Triggers updated_at
--  21. Triggers audit (com comentário A5)
--  22. Trigger goal.current_amount
--  23. Trigger handle_new_user
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() (backward compat)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram index para busca de texto


-- =============================================================================
-- 2. HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 3. AUDIT SCHEMA + TABLE + SEGURANÇA [A2]
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS audit;

-- [A2] Revogar acesso ao schema audit para roles públicos do Supabase.
-- O schema audit NÃO é exposto via PostgREST por padrão, mas é boa prática
-- revogar explicitamente para garantir zero exposição via qualquer caminho.
REVOKE USAGE ON SCHEMA audit FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS audit.log (
  id              BIGSERIAL PRIMARY KEY,
  schema_name     TEXT        NOT NULL,
  table_name      TEXT        NOT NULL,
  operation       TEXT        NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  user_id         UUID,                        -- auth.uid() no momento da operação
  row_id          UUID,                        -- PK da linha afetada
  old_data        JSONB,                       -- estado anterior (UPDATE/DELETE)
  new_data        JSONB,                       -- estado novo (INSERT/UPDATE)
  changed_fields  TEXT[],                      -- campos alterados (UPDATE only)
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- [A2] Auditoria é append-only e inacessível por usuários comuns.
REVOKE ALL ON audit.log FROM anon, authenticated;
REVOKE UPDATE, DELETE ON audit.log FROM PUBLIC;

-- Índices de auditoria
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx    ON audit.log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_table_name_idx ON audit.log (schema_name, table_name);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit.log (created_at DESC);

-- Função de auditoria genérica
-- [A5] NOTA: operações disparadas via service role (Edge Functions, jobs agendados)
-- não possuem sessão JWT ativa. Nesses casos, auth.uid() retorna NULL e o campo
-- user_id será registrado como NULL no audit.log. Isso é comportamento esperado —
-- diferenciar operações de usuário (user_id preenchido) de operações internas (NULL).
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_data       JSONB;
  v_new_data       JSONB;
  v_changed_fields TEXT[];
  v_row_id         UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_row_id   := OLD.id;
    INSERT INTO audit.log (schema_name, table_name, operation, user_id, row_id, old_data)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, auth.uid(), v_row_id, v_old_data);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_row_id   := NEW.id;
    SELECT ARRAY(
      SELECT key FROM jsonb_each(v_new_data)
      WHERE v_new_data -> key IS DISTINCT FROM v_old_data -> key
    ) INTO v_changed_fields;
    INSERT INTO audit.log (schema_name, table_name, operation, user_id, row_id, old_data, new_data, changed_fields)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, auth.uid(), v_row_id, v_old_data, v_new_data, v_changed_fields);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_data := to_jsonb(NEW);
    v_row_id   := NEW.id;
    INSERT INTO audit.log (schema_name, table_name, operation, user_id, row_id, new_data)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, auth.uid(), v_row_id, v_new_data);
    RETURN NEW;
  END IF;
END;
$$;


-- =============================================================================
-- 4. PLAN
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT          NOT NULL,
  slug           TEXT          NOT NULL UNIQUE,
  price_monthly  NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency       CHAR(3)       NOT NULL DEFAULT 'BRL',
  features       JSONB         NOT NULL DEFAULT '{}'::jsonb,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order     SMALLINT      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.plan IS 'Catálogo de planos (Free, Premium). Read-only para usuários.';
COMMENT ON COLUMN public.plan.features IS 'Feature flags e limites em JSONB. Ex: {"max_accounts": 2, "ai_messages_per_month": 20}';


-- =============================================================================
-- 5. SEED — plan [A4: seed antes do trigger handle_new_user]
-- =============================================================================
-- [A4] O seed de plan é executado ANTES da criação do trigger handle_new_user
-- para garantir que v_free_plan_id seja encontrado mesmo se um usuário se
-- cadastrar imediatamente após a migration ser aplicada.

INSERT INTO public.plan (name, slug, price_monthly, price_yearly, currency, features, sort_order)
VALUES
  (
    'Free', 'free', 0, 0, 'BRL',
    '{
      "max_accounts": 2,
      "max_credit_cards": 1,
      "max_goals": 3,
      "ai_messages_per_month": 20,
      "open_finance": false,
      "advanced_reports": false,
      "investment_tracking": false,
      "export_csv": false,
      "priority_support": false
    }'::jsonb,
    1
  ),
  (
    'Premium', 'premium', 29.90, 287.00, 'BRL',
    '{
      "max_accounts": -1,
      "max_credit_cards": -1,
      "max_goals": -1,
      "ai_messages_per_month": 500,
      "open_finance": true,
      "advanced_reports": true,
      "investment_tracking": true,
      "export_csv": true,
      "priority_support": true
    }'::jsonb,
    2
  )
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- 6. PROFILE + USER_PREFERENCE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profile (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  display_name          TEXT,
  avatar_url            TEXT,
  phone                 TEXT,
  birth_date            DATE,
  cpf_hash              TEXT,
  country               CHAR(2)     NOT NULL DEFAULT 'BR',
  locale                VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
  timezone              TEXT        NOT NULL DEFAULT 'America/Sao_Paulo',
  onboarding_completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  plan_id               UUID        REFERENCES public.plan(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

COMMENT ON TABLE public.profile IS 'Estende auth.users com dados de perfil. Criado automaticamente via trigger.';
COMMENT ON COLUMN public.profile.cpf_hash IS 'SHA-256 do CPF. Nunca armazenar CPF em texto puro.';


CREATE TABLE IF NOT EXISTS public.user_preference (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES public.profile(id) ON DELETE CASCADE,
  theme                   TEXT        NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  currency                CHAR(3)     NOT NULL DEFAULT 'BRL',
  date_format             TEXT        NOT NULL DEFAULT 'DD/MM/YYYY',
  notification_email      BOOLEAN     NOT NULL DEFAULT TRUE,
  notification_push       BOOLEAN     NOT NULL DEFAULT TRUE,
  ai_suggestions_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
  weekly_report_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
  data                    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_preference IS 'Preferências de UI e notificações por usuário.';


-- =============================================================================
-- 7. INSTITUTION [B2: UNIQUE (short_name)]
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.institution (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  short_name            TEXT        NOT NULL UNIQUE,     -- [B2] garante idempotência do seed
  ispb                  CHAR(8),
  cnpj                  TEXT,
  logo_url              TEXT,
  color                 CHAR(7),
  supports_open_finance BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.institution IS 'Catálogo de bancos e instituições. Seed data, read-only para usuários.';


-- =============================================================================
-- 8. SEED — institution [B2: ON CONFLICT (short_name)]
-- =============================================================================

INSERT INTO public.institution (name, short_name, ispb, color, supports_open_finance, is_active)
VALUES
  ('Nubank',                  'nubank',      '18236120', '#820AD1', TRUE,  TRUE),
  ('Itaú Unibanco',           'itau',        '60701190', '#FF6200', TRUE,  TRUE),
  ('Bradesco',                'bradesco',    '60746948', '#CC0000', TRUE,  TRUE),
  ('Banco do Brasil',         'bb',          '00000000', '#FECB00', TRUE,  TRUE),
  ('Caixa Econômica Federal', 'cef',         '36074598', '#005CA9', TRUE,  TRUE),
  ('Santander',               'santander',   '90400888', '#EC0000', TRUE,  TRUE),
  ('Inter',                   'inter',       '00416968', '#FF7A00', TRUE,  TRUE),
  ('XP Investimentos',        'xp',          '02332886', '#000000', FALSE, TRUE),
  ('BTG Pactual',             'btg',         '30306294', '#003087', FALSE, TRUE),
  ('Rico Investimentos',      'rico',        '72177883', '#FF6B00', FALSE, TRUE),
  ('Clear Corretora',         'clear',       '02332886', '#333333', FALSE, TRUE),
  ('Mercado Pago',            'mercadopago', '10573521', '#009EE3', FALSE, TRUE),
  ('PicPay',                  'picpay',      '22896431', '#11C76F', FALSE, TRUE),
  ('C6 Bank',                 'c6bank',      '31872495', '#242424', TRUE,  TRUE),
  ('Neon',                    'neon',        '20855875', '#00E5C3', FALSE, TRUE),
  ('Outro',                   'other',       NULL,       '#8B949E', FALSE, TRUE)
ON CONFLICT (short_name) DO NOTHING;    -- [B2] idempotente


-- =============================================================================
-- 9. FINANCIAL_ACCOUNT
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.financial_account (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  institution_id      UUID          REFERENCES public.institution(id),
  name                TEXT          NOT NULL,
  type                TEXT          NOT NULL CHECK (type IN ('checking','savings','investment','wallet','cash')),
  currency            CHAR(3)       NOT NULL DEFAULT 'BRL',
  balance             NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_updated_at  TIMESTAMPTZ,
  color               CHAR(7),
  icon                TEXT,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  is_manual           BOOLEAN       NOT NULL DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

COMMENT ON TABLE public.financial_account IS 'Contas bancárias, carteiras e contas de investimento do usuário.';
COMMENT ON COLUMN public.financial_account.balance IS 'Saldo desnormalizado. Atualizado por trigger ao confirmar transações.';


-- =============================================================================
-- 10. CATEGORY [B3: índice único parcial para system categories]
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.category (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.profile(id) ON DELETE CASCADE,
  parent_id   UUID        REFERENCES public.category(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  icon        TEXT,
  color       CHAR(7),
  type        TEXT        NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense','both')),
  is_system   BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- [B3] Índice único parcial: garante que categorias do sistema não sejam duplicadas
-- no seed. user_id IS NULL identifica categorias do sistema.
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_system_unique
  ON public.category (name, type)
  WHERE (is_system = TRUE AND user_id IS NULL);

COMMENT ON TABLE public.category IS 'Hierarquia de categorias. user_id NULL = sistema, visível a todos.';
COMMENT ON INDEX idx_category_system_unique IS 'Previne duplicatas de categorias do sistema. Seeds são idempotentes via este índice.';


-- =============================================================================
-- 11. SEED — category [B3: idempotente via ON CONFLICT no índice parcial]
-- =============================================================================

-- Categorias de DESPESA (pai)
-- [B3] ON CONFLICT usa o índice parcial idx_category_system_unique (name, type)
-- WHERE is_system = TRUE AND user_id IS NULL — seed é idempotente.
WITH cat AS (
  INSERT INTO public.category (name, icon, color, type, is_system, sort_order)
  VALUES
    ('Moradia',       'home',           '#3B82F6', 'expense', TRUE, 1),
    ('Alimentação',   'utensils',       '#F59E0B', 'expense', TRUE, 2),
    ('Transporte',    'car',            '#10B981', 'expense', TRUE, 3),
    ('Saúde',         'heart-pulse',    '#EF4444', 'expense', TRUE, 4),
    ('Educação',      'graduation-cap', '#8B5CF6', 'expense', TRUE, 5),
    ('Lazer',         'smile',          '#EC4899', 'expense', TRUE, 6),
    ('Vestuário',     'shirt',          '#F97316', 'expense', TRUE, 7),
    ('Assinaturas',   'credit-card',    '#6366F1', 'expense', TRUE, 8),
    ('Pets',          'paw-print',      '#84CC16', 'expense', TRUE, 9),
    ('Viagem',        'plane',          '#0EA5E9', 'expense', TRUE, 10),
    ('Investimentos', 'trending-up',    '#059669', 'both',    TRUE, 11),
    ('Impostos',      'landmark',       '#64748B', 'expense', TRUE, 12),
    ('Outros',        'more-horizontal','#94A3B8', 'both',    TRUE, 13)
  ON CONFLICT (name, type) WHERE (is_system = TRUE AND user_id IS NULL) DO NOTHING
  RETURNING id, name
)
-- Subcategorias de Moradia
INSERT INTO public.category (parent_id, name, icon, color, type, is_system, sort_order)
SELECT c.id, sub.name, sub.icon, sub.color, 'expense', TRUE, sub.ord
FROM cat c
CROSS JOIN (VALUES
  ('Aluguel',       'key',      '#3B82F6', 1),
  ('Condomínio',    'building', '#3B82F6', 2),
  ('Conta de Luz',  'zap',      '#3B82F6', 3),
  ('Conta de Água', 'droplets', '#3B82F6', 4),
  ('Internet',      'wifi',     '#3B82F6', 5),
  ('Reforma',       'wrench',   '#3B82F6', 6)
) AS sub(name, icon, color, ord)
WHERE c.name = 'Moradia'
ON CONFLICT (name, type) WHERE (is_system = TRUE AND user_id IS NULL) DO NOTHING;

-- Categorias de RECEITA
INSERT INTO public.category (name, icon, color, type, is_system, sort_order)
VALUES
  ('Salário',         'banknote',    '#059669', 'income', TRUE, 1),
  ('Freelance',       'briefcase',   '#10B981', 'income', TRUE, 2),
  ('Renda Passiva',   'coins',       '#F59E0B', 'income', TRUE, 3),
  ('Dividendos',      'trending-up', '#3B82F6', 'income', TRUE, 4),
  ('Reembolso',       'refresh-cw',  '#8B5CF6', 'income', TRUE, 5),
  ('Presente',        'gift',        '#EC4899', 'income', TRUE, 6),
  ('Outras Receitas', 'plus-circle', '#94A3B8', 'income', TRUE, 7)
ON CONFLICT (name, type) WHERE (is_system = TRUE AND user_id IS NULL) DO NOTHING;


-- =============================================================================
-- 12. CREDIT_CARD + CREDIT_CARD_INVOICE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.credit_card (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  institution_id      UUID          REFERENCES public.institution(id),
  name                TEXT          NOT NULL,
  brand               TEXT          CHECK (brand IN ('visa','mastercard','elo','amex','hipercard','other')),
  last_four           CHAR(4),
  credit_limit        NUMERIC(18,2) NOT NULL DEFAULT 0,
  available_limit     NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_day         SMALLINT      NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day             SMALLINT      NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color               CHAR(7),
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  payment_account_id  UUID          REFERENCES public.financial_account(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

COMMENT ON TABLE public.credit_card IS 'Cartões de crédito com limite, fechamento e vencimento.';


CREATE TABLE IF NOT EXISTS public.credit_card_invoice (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id          UUID          NOT NULL REFERENCES public.credit_card(id) ON DELETE CASCADE,
  user_id          UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  reference_month  DATE          NOT NULL,
  closing_date     DATE          NOT NULL,
  due_date         DATE          NOT NULL,
  total_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  status           TEXT          NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','paid','overdue')),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, reference_month)
);

COMMENT ON TABLE public.credit_card_invoice IS 'Fatura mensal de cada cartão. Uma por mês por cartão.';


-- =============================================================================
-- 13. RECURRENCE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recurrence (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  account_id      UUID          REFERENCES public.financial_account(id) ON DELETE SET NULL,
  category_id     UUID          REFERENCES public.category(id) ON DELETE SET NULL,
  description     TEXT          NOT NULL,
  type            TEXT          NOT NULL CHECK (type IN ('income','expense')),
  amount          NUMERIC(18,2) NOT NULL,
  currency        CHAR(3)       NOT NULL DEFAULT 'BRL',
  frequency       TEXT          NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  interval        SMALLINT      NOT NULL DEFAULT 1,
  day_of_month    SMALLINT      CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week     SMALLINT      CHECK (day_of_week BETWEEN 0 AND 6),
  start_date      DATE          NOT NULL,
  end_date        DATE,
  next_occurrence DATE,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  tags            TEXT[]        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE public.recurrence IS 'Template de lançamentos recorrentes. Gera transações via Edge Function agendada.';


-- =============================================================================
-- 14. INSTALLMENT_GROUP
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.installment_group (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  card_id                 UUID          NOT NULL REFERENCES public.credit_card(id) ON DELETE CASCADE,
  description             TEXT          NOT NULL,
  total_amount            NUMERIC(18,2) NOT NULL,
  installment_count       SMALLINT      NOT NULL CHECK (installment_count > 0),
  installment_amount      NUMERIC(18,2) NOT NULL,
  first_installment_date  DATE          NOT NULL,
  category_id             UUID          REFERENCES public.category(id) ON DELETE SET NULL,
  interest_rate           NUMERIC(8,4)  NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

COMMENT ON TABLE public.installment_group IS 'Agrupa transações de compras parceladas. Parcelas geradas como N transactions.';


-- =============================================================================
-- 15. TRANSACTION (self-ref FK via ALTER)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.transaction (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  account_id            UUID          REFERENCES public.financial_account(id) ON DELETE SET NULL,
  card_id               UUID          REFERENCES public.credit_card(id) ON DELETE SET NULL,
  invoice_id            UUID          REFERENCES public.credit_card_invoice(id) ON DELETE SET NULL,
  category_id           UUID          REFERENCES public.category(id) ON DELETE SET NULL,
  subcategory_id        UUID          REFERENCES public.category(id) ON DELETE SET NULL,
  installment_group_id  UUID          REFERENCES public.installment_group(id) ON DELETE SET NULL,
  recurrence_id         UUID          REFERENCES public.recurrence(id) ON DELETE SET NULL,
  transfer_peer_id      UUID,
  type                  TEXT          NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount                NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  currency              CHAR(3)       NOT NULL DEFAULT 'BRL',
  description           TEXT          NOT NULL,
  notes                 TEXT,
  date                  DATE          NOT NULL,
  competence_date       DATE,
  status                TEXT          NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')),
  is_ignored            BOOLEAN       NOT NULL DEFAULT FALSE,
  tags                  TEXT[]        NOT NULL DEFAULT '{}',
  origin                TEXT          NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','open_finance','import','ai_suggestion')),
  external_id           TEXT,
  attachment_urls       TEXT[]        NOT NULL DEFAULT '{}',
  installment_number    SMALLINT,
  installment_total     SMALLINT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

ALTER TABLE public.transaction
  ADD CONSTRAINT fk_transaction_transfer_peer
  FOREIGN KEY (transfer_peer_id) REFERENCES public.transaction(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.transaction VALIDATE CONSTRAINT fk_transaction_transfer_peer;

COMMENT ON TABLE public.transaction IS 'Núcleo financeiro: entrada, saída e transferência.';
COMMENT ON COLUMN public.transaction.amount IS 'Sempre positivo. type determina a direção.';
COMMENT ON COLUMN public.transaction.transfer_peer_id IS 'Outra ponta da transferência (auto-referência).';


-- =============================================================================
-- 16. NET_WORTH_SNAPSHOT
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.net_worth_snapshot (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  date                 DATE          NOT NULL,
  total_assets         NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_liabilities    NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_worth            NUMERIC(18,2) NOT NULL DEFAULT 0,
  cash_balance         NUMERIC(18,2) NOT NULL DEFAULT 0,
  investment_balance   NUMERIC(18,2) NOT NULL DEFAULT 0,
  real_estate_value    NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_card_balance  NUMERIC(18,2) NOT NULL DEFAULT 0,
  loan_balance         NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

COMMENT ON TABLE public.net_worth_snapshot IS 'Foto periódica do patrimônio líquido. Gerado por Edge Function agendada.';


-- =============================================================================
-- 17. GOAL + GOAL_CONTRIBUTION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.goal (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  name                  TEXT          NOT NULL,
  description           TEXT,
  type                  TEXT          NOT NULL DEFAULT 'other' CHECK (type IN ('emergency_fund','travel','education','retirement','home','vehicle','other')),
  icon                  TEXT,
  color                 CHAR(7),
  target_amount         NUMERIC(18,2) NOT NULL CHECK (target_amount > 0),
  current_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
  target_date           DATE,
  monthly_contribution  NUMERIC(18,2),
  linked_account_id     UUID          REFERENCES public.financial_account(id) ON DELETE SET NULL,
  status                TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','cancelled','paused')),
  achieved_at           TIMESTAMPTZ,
  priority              SMALLINT      NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

COMMENT ON TABLE public.goal IS 'Metas financeiras com valor-alvo, prazo e progresso.';


CREATE TABLE IF NOT EXISTS public.goal_contribution (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    UUID          NOT NULL REFERENCES public.goal(id) ON DELETE CASCADE,
  user_id    UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  amount     NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  date       DATE          NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.goal_contribution IS 'Histórico de aportes em cada meta. Atualiza goal.current_amount via trigger.';


-- =============================================================================
-- 18. PLAN_SUBSCRIPTION [A3: UNIQUE (user_id)] + PLAN_USAGE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_subscription (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL UNIQUE REFERENCES public.profile(id) ON DELETE CASCADE,
  -- [A3] UNIQUE (user_id): garante no máximo uma assinatura ativa por usuário.
  -- handle_new_user usa ON CONFLICT (user_id) DO NOTHING com segurança.
  -- Upgrades/downgrades fazem UPDATE nesta linha, preservando o histórico via audit.log.
  plan_id                   UUID        NOT NULL REFERENCES public.plan(id),
  status                    TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
  billing_cycle             TEXT        NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  trial_end                 TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  payment_provider          TEXT        CHECK (payment_provider IN ('stripe','hotmart','manual')),
  external_subscription_id  TEXT,
  external_customer_id      TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.plan_subscription IS 'Assinatura ativa do usuário. Escrita via service role / webhook. Upgrades via UPDATE.';


CREATE TABLE IF NOT EXISTS public.plan_usage (
  user_id              UUID        NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  month                DATE        NOT NULL,
  ai_messages_used     INT         NOT NULL DEFAULT 0,
  accounts_count       INT         NOT NULL DEFAULT 0,
  credit_cards_count   INT         NOT NULL DEFAULT 0,
  goals_count          INT         NOT NULL DEFAULT 0,
  exports_count        INT         NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

COMMENT ON TABLE public.plan_usage IS 'Consumo mensal por feature para enforcement de limites do plano.';


-- =============================================================================
-- 19. RLS — ENABLE
-- =============================================================================

ALTER TABLE public.profile              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preference      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_account    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_invoice  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_group    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_snapshot   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contribution    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_subscription    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_usage           ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 20. RLS POLICIES
-- =============================================================================

-- ── profile ───────────────────────────────────────────────────────────────────
CREATE POLICY "profile_select_own"
  ON public.profile FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profile_update_own"
  ON public.profile FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── user_preference ───────────────────────────────────────────────────────────
CREATE POLICY "user_preference_select_own"
  ON public.user_preference FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_preference_insert_own"
  ON public.user_preference FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preference_update_own"
  ON public.user_preference FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preference_delete_own"
  ON public.user_preference FOR DELETE
  USING (user_id = auth.uid());

-- ── institution (read-only para autenticados) ─────────────────────────────────
CREATE POLICY "institution_select_authenticated"
  ON public.institution FOR SELECT
  TO authenticated
  USING (TRUE);

-- ── plan (read-only para autenticados) ───────────────────────────────────────
CREATE POLICY "plan_select_authenticated"
  ON public.plan FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- ── financial_account ─────────────────────────────────────────────────────────
CREATE POLICY "financial_account_select_own"
  ON public.financial_account FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "financial_account_insert_own"
  ON public.financial_account FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "financial_account_update_own"
  ON public.financial_account FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "financial_account_delete_own"
  ON public.financial_account FOR DELETE
  USING (user_id = auth.uid());

-- ── category ──────────────────────────────────────────────────────────────────
-- Categorias do sistema (user_id IS NULL) são visíveis a todos os autenticados.
-- Usuários só podem criar/editar/excluir as próprias categorias (user_id = auth.uid())
-- e nunca podem marcar is_system = TRUE. [B1 / A1]

CREATE POLICY "category_select"
  ON public.category FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- [B1] WITH CHECK garante que usuário não pode criar categoria com is_system = TRUE
CREATE POLICY "category_insert_own"
  ON public.category FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_system = FALSE);

-- [A1] WITH CHECK também bloqueia promoção de is_system FALSE → TRUE via UPDATE
CREATE POLICY "category_update_own"
  ON public.category FOR UPDATE
  USING (user_id = auth.uid() AND is_system = FALSE)
  WITH CHECK (user_id = auth.uid() AND is_system = FALSE);

CREATE POLICY "category_delete_own"
  ON public.category FOR DELETE
  USING (user_id = auth.uid() AND is_system = FALSE);

-- ── credit_card ───────────────────────────────────────────────────────────────
CREATE POLICY "credit_card_select_own"
  ON public.credit_card FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "credit_card_insert_own"
  ON public.credit_card FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credit_card_update_own"
  ON public.credit_card FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credit_card_delete_own"
  ON public.credit_card FOR DELETE
  USING (user_id = auth.uid());

-- ── credit_card_invoice ───────────────────────────────────────────────────────
CREATE POLICY "credit_card_invoice_select_own"
  ON public.credit_card_invoice FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "credit_card_invoice_insert_own"
  ON public.credit_card_invoice FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credit_card_invoice_update_own"
  ON public.credit_card_invoice FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credit_card_invoice_delete_own"
  ON public.credit_card_invoice FOR DELETE
  USING (user_id = auth.uid());

-- ── recurrence ────────────────────────────────────────────────────────────────
CREATE POLICY "recurrence_select_own"
  ON public.recurrence FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "recurrence_insert_own"
  ON public.recurrence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recurrence_update_own"
  ON public.recurrence FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recurrence_delete_own"
  ON public.recurrence FOR DELETE
  USING (user_id = auth.uid());

-- ── installment_group ─────────────────────────────────────────────────────────
CREATE POLICY "installment_group_select_own"
  ON public.installment_group FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "installment_group_insert_own"
  ON public.installment_group FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "installment_group_update_own"
  ON public.installment_group FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "installment_group_delete_own"
  ON public.installment_group FOR DELETE
  USING (user_id = auth.uid());

-- ── transaction ───────────────────────────────────────────────────────────────
CREATE POLICY "transaction_select_own"
  ON public.transaction FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "transaction_insert_own"
  ON public.transaction FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "transaction_update_own"
  ON public.transaction FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "transaction_delete_own"
  ON public.transaction FOR DELETE
  USING (user_id = auth.uid());

-- ── net_worth_snapshot ────────────────────────────────────────────────────────
-- INSERT/UPDATE exclusivo por Edge Function (service role) — sem policy de escrita.
CREATE POLICY "net_worth_snapshot_select_own"
  ON public.net_worth_snapshot FOR SELECT
  USING (user_id = auth.uid());

-- ── goal ──────────────────────────────────────────────────────────────────────
CREATE POLICY "goal_select_own"
  ON public.goal FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "goal_insert_own"
  ON public.goal FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "goal_update_own"
  ON public.goal FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "goal_delete_own"
  ON public.goal FOR DELETE
  USING (user_id = auth.uid());

-- ── goal_contribution ─────────────────────────────────────────────────────────
CREATE POLICY "goal_contribution_select_own"
  ON public.goal_contribution FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "goal_contribution_insert_own"
  ON public.goal_contribution FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "goal_contribution_update_own"
  ON public.goal_contribution FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "goal_contribution_delete_own"
  ON public.goal_contribution FOR DELETE
  USING (user_id = auth.uid());

-- ── plan_subscription (leitura própria; escrita via service role) ─────────────
CREATE POLICY "plan_subscription_select_own"
  ON public.plan_subscription FOR SELECT
  USING (user_id = auth.uid());

-- ── plan_usage ────────────────────────────────────────────────────────────────
CREATE POLICY "plan_usage_select_own"
  ON public.plan_usage FOR SELECT
  USING (user_id = auth.uid());


-- =============================================================================
-- 21. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profile_plan_id
  ON public.profile (plan_id);

CREATE INDEX IF NOT EXISTS idx_financial_account_user_id
  ON public.financial_account (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_category_user_id
  ON public.category (user_id);
CREATE INDEX IF NOT EXISTS idx_category_parent_id
  ON public.category (parent_id);
CREATE INDEX IF NOT EXISTS idx_category_type
  ON public.category (type);

CREATE INDEX IF NOT EXISTS idx_credit_card_user_id
  ON public.credit_card (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_invoice_card_month
  ON public.credit_card_invoice (card_id, reference_month DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_status
  ON public.credit_card_invoice (status);

CREATE INDEX IF NOT EXISTS idx_transaction_user_date
  ON public.transaction (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_account
  ON public.transaction (account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_category
  ON public.transaction (category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_status
  ON public.transaction (status);
CREATE INDEX IF NOT EXISTS idx_transaction_type
  ON public.transaction (type);
CREATE INDEX IF NOT EXISTS idx_transaction_active
  ON public.transaction (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_card
  ON public.transaction (card_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_transaction_recurrence
  ON public.transaction (recurrence_id) WHERE recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_installment
  ON public.transaction (installment_group_id) WHERE installment_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_description_trgm
  ON public.transaction USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_recurrence_user_active
  ON public.recurrence (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurrence_next_occ
  ON public.recurrence (next_occurrence) WHERE is_active = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_net_worth_user_date
  ON public.net_worth_snapshot (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_goal_user_status
  ON public.goal (user_id, status);

CREATE INDEX IF NOT EXISTS idx_goal_contribution_goal
  ON public.goal_contribution (goal_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_plan_sub_user_status
  ON public.plan_subscription (user_id, status);

CREATE INDEX IF NOT EXISTS idx_plan_usage_user_month
  ON public.plan_usage (user_id, month DESC);


-- =============================================================================
-- 22. TRIGGERS — updated_at
-- =============================================================================

CREATE OR REPLACE TRIGGER trg_profile_updated_at
  BEFORE UPDATE ON public.profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_user_preference_updated_at
  BEFORE UPDATE ON public.user_preference
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_financial_account_updated_at
  BEFORE UPDATE ON public.financial_account
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_credit_card_updated_at
  BEFORE UPDATE ON public.credit_card
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_credit_card_invoice_updated_at
  BEFORE UPDATE ON public.credit_card_invoice
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_recurrence_updated_at
  BEFORE UPDATE ON public.recurrence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_transaction_updated_at
  BEFORE UPDATE ON public.transaction
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_goal_updated_at
  BEFORE UPDATE ON public.goal
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_plan_subscription_updated_at
  BEFORE UPDATE ON public.plan_subscription
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_plan_usage_updated_at
  BEFORE UPDATE ON public.plan_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 23. TRIGGERS — AUDIT
-- [A5] Operações via service role (Edge Functions, cron jobs) não possuem sessão
-- JWT ativa. Nesses casos auth.uid() = NULL → audit.log.user_id = NULL.
-- Isso é comportamento esperado. Para distinguir: user_id preenchido = ação de
-- usuário autenticado; user_id NULL = operação interna do sistema.
-- =============================================================================

CREATE OR REPLACE TRIGGER trg_audit_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE OR REPLACE TRIGGER trg_audit_credit_card
  AFTER INSERT OR DELETE ON public.credit_card
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE OR REPLACE TRIGGER trg_audit_plan_subscription
  AFTER INSERT OR UPDATE OR DELETE ON public.plan_subscription
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE OR REPLACE TRIGGER trg_audit_profile
  AFTER UPDATE ON public.profile
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();


-- =============================================================================
-- 24. TRIGGER — goal.current_amount
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_goal_current_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.goal
    SET
      current_amount = current_amount + NEW.amount,
      status = CASE
        WHEN current_amount + NEW.amount >= target_amount THEN 'achieved'
        ELSE status
      END,
      achieved_at = CASE
        WHEN current_amount + NEW.amount >= target_amount AND achieved_at IS NULL THEN NOW()
        ELSE achieved_at
      END
    WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.goal
    SET current_amount = GREATEST(0, current_amount - OLD.amount)
    WHERE id = OLD.goal_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_goal_contribution_update_amount
  AFTER INSERT OR DELETE ON public.goal_contribution
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_current_amount();


-- =============================================================================
-- 25. TRIGGER — handle_new_user
-- [A4] Seed de plan já foi executado acima (seção 5) antes deste trigger,
-- garantindo que v_free_plan_id seja sempre encontrado.
-- [A3] ON CONFLICT (user_id) DO NOTHING agora tem target válido graças ao
-- UNIQUE (user_id) em plan_subscription.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id
  FROM public.plan
  WHERE slug = 'free'
  LIMIT 1;

  INSERT INTO public.profile (id, full_name, avatar_url, plan_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    v_free_plan_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preference (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.plan_usage (user_id, month)
  VALUES (NEW.id, DATE_TRUNC('month', NOW())::DATE)
  ON CONFLICT (user_id, month) DO NOTHING;

  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.plan_subscription (user_id, plan_id, status, payment_provider)
    VALUES (NEW.id, v_free_plan_id, 'active', 'manual')
    ON CONFLICT (user_id) DO NOTHING;   -- [A3] target válido: UNIQUE (user_id)
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- FIM DA MIGRATION 001_mvp_schema.sql — Revisão 2
-- Próxima migration: 002_v2_investments.sql (Sprint 4.3)
-- =============================================================================
