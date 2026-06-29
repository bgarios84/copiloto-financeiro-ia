-- =============================================================================
-- Migration: 004_budget.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 5.5 — Orçamentos por Categoria
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.budget
--   2. RLS completo com 4 policies
--   3. Trigger updated_at (reutiliza set_updated_at() de 001)
--   4. Índice de performance em (user_id, month)
--   5. Recria view category_budget_comparison (substituindo a parcial de 003)
--      com JOIN real em public.budget e FULL OUTER JOIN para mostrar:
--        a) categorias com orçamento mas sem despesas (actual = 0)
--        b) categorias com despesas mas sem orçamento (planned = NULL)
--
-- NÃO ALTERA: nenhuma tabela existente, nenhuma outra view, nenhuma policy.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE VIEW.
-- =============================================================================


-- =============================================================================
-- 1. TABELA budget
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.budget (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES public.profile(id)   ON DELETE CASCADE,
  category_id    UUID                   REFERENCES public.category(id)  ON DELETE SET NULL,
  month          DATE          NOT NULL,
  planned_amount NUMERIC(18,2) NOT NULL CHECK (planned_amount > 0),
  currency       CHAR(3)       NOT NULL DEFAULT 'BRL',
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,

  -- Um orçamento por categoria (ou sem categoria) por mês por usuário.
  -- category_id pode ser NULL para orçamento geral (sem categoria específica).
  CONSTRAINT budget_unique_per_month
    UNIQUE NULLS NOT DISTINCT (user_id, category_id, month)
);

-- month deve ser sempre o primeiro dia do mês (YYYY-MM-01).
-- Garante consistência para JOINs com DATE_TRUNC('month', ...).
ALTER TABLE public.budget
  ADD CONSTRAINT budget_month_is_first_day
  CHECK (EXTRACT(DAY FROM month) = 1);

COMMENT ON TABLE public.budget IS
  'Orçamentos mensais por categoria. Um registro por usuário/categoria/mês.';

COMMENT ON COLUMN public.budget.month IS
  'Sempre dia 1 do mês (YYYY-MM-01). Enforced por CHECK constraint.';

COMMENT ON COLUMN public.budget.planned_amount IS
  'Valor planejado para a categoria no mês. Sempre positivo.';

COMMENT ON COLUMN public.budget.category_id IS
  'NULL = orçamento geral sem categoria específica.';


-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas próprios registros
CREATE POLICY budget_select_own
  ON public.budget
  FOR SELECT
  USING (user_id = auth.uid());

-- Criação: apenas para si mesmo
CREATE POLICY budget_insert_own
  ON public.budget
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Atualização: apenas próprios registros
CREATE POLICY budget_update_own
  ON public.budget
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Exclusão (soft delete via updated_at + deleted_at): apenas próprios
CREATE POLICY budget_delete_own
  ON public.budget
  FOR DELETE
  USING (user_id = auth.uid());


-- =============================================================================
-- 3. TRIGGER updated_at
-- Reutiliza public.set_updated_at() criada em 001_mvp_schema.sql.
-- =============================================================================

CREATE TRIGGER budget_updated_at
  BEFORE UPDATE ON public.budget
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 4. ÍNDICES DE PERFORMANCE
-- =============================================================================

-- Queries do dashboard filtram por (user_id, month)
CREATE INDEX IF NOT EXISTS idx_budget_user_month
  ON public.budget (user_id, month)
  WHERE deleted_at IS NULL;

-- Lookup por (user_id, category_id, month) para upserts
CREATE INDEX IF NOT EXISTS idx_budget_user_category_month
  ON public.budget (user_id, category_id, month)
  WHERE deleted_at IS NULL;


-- =============================================================================
-- 5. VIEW: category_budget_comparison (recriada com dados reais)
--
-- Substitui a versão parcial de 003_analytics_views.sql que tinha
-- planned_amount = NULL hardcoded.
--
-- Por que DROP + CREATE em vez de CREATE OR REPLACE:
--   A migration 003 criou esta view com 8 colunas em ordem específica.
--   A nova versão adiciona 'transaction_count' — CREATE OR REPLACE proíbe
--   alterar nomes ou ordem de colunas existentes (erro 42P07).
--   DROP CASCADE é seguro: nenhuma outra view depende desta.
--
-- FULL OUTER JOIN garante visibilidade de:
--   - Categorias com orçamento mas sem despesas no mês (actual = 0)
--   - Categorias com despesas mas sem orçamento definido (planned = NULL)
--
-- RLS: SECURITY INVOKER (PG15 default). Cada CTE herda RLS da tabela base:
--   - actuals → filtrado por RLS de public.transaction (user_id = auth.uid())
--   - budgets → filtrado por RLS de public.budget (user_id = auth.uid())
-- =============================================================================

DROP VIEW IF EXISTS public.category_budget_comparison CASCADE;

CREATE VIEW public.category_budget_comparison AS
WITH actuals AS (
  -- Despesas reais agrupadas por usuário, mês e categoria
  SELECT
    t.user_id,
    DATE_TRUNC('month', t.date)::DATE       AS month,
    t.category_id,
    COALESCE(c.name,  'Sem categoria')      AS category_name,
    c.color                                 AS category_color,
    c.icon                                  AS category_icon,
    SUM(t.amount)                           AS actual_amount,
    COUNT(*)::INT                           AS transaction_count
  FROM public.transaction t
  LEFT JOIN public.category c
    ON  c.id         = t.category_id
    AND c.deleted_at IS NULL
  WHERE t.deleted_at IS NULL
    AND t.is_ignored  = FALSE
    AND t.type        = 'expense'
    AND t.status     <> 'cancelled'
  GROUP BY
    t.user_id,
    DATE_TRUNC('month', t.date)::DATE,
    t.category_id,
    c.name,
    c.color,
    c.icon
),
budgets AS (
  -- Orçamentos planejados com info de categoria
  SELECT
    b.user_id,
    b.month,
    b.category_id,
    COALESCE(c.name,  'Sem categoria')      AS category_name,
    c.color                                 AS category_color,
    c.icon                                  AS category_icon,
    b.planned_amount
  FROM public.budget b
  LEFT JOIN public.category c
    ON  c.id         = b.category_id
    AND c.deleted_at IS NULL
  WHERE b.deleted_at IS NULL
)
SELECT
  -- user_id e chaves de agrupamento: prefere actuals, fallback para budgets
  COALESCE(a.user_id,       bu.user_id)       AS user_id,
  COALESCE(a.month,         bu.month)         AS month,
  COALESCE(a.category_id,   bu.category_id)   AS category_id,
  COALESCE(a.category_name, bu.category_name) AS category_name,
  COALESCE(a.category_color,bu.category_color)AS category_color,
  COALESCE(a.category_icon, bu.category_icon) AS category_icon,

  -- Orçamento planejado (NULL se não definido)
  bu.planned_amount,

  -- Gasto real (0 se não houve transações)
  COALESCE(a.actual_amount, 0)                AS actual_amount,

  -- Contagem de transações
  COALESCE(a.transaction_count, 0)            AS transaction_count,

  -- Diferença: positivo = dentro do orçamento, negativo = estouro
  -- NULL quando não há orçamento definido
  CASE
    WHEN bu.planned_amount IS NOT NULL
    THEN bu.planned_amount - COALESCE(a.actual_amount, 0)
    ELSE NULL
  END                                         AS difference_amount,

  -- Percentual de uso do orçamento (NULL se sem orçamento)
  CASE
    WHEN bu.planned_amount > 0
    THEN ROUND(
      (COALESCE(a.actual_amount, 0) / bu.planned_amount) * 100, 2
    )
    ELSE NULL
  END                                         AS usage_percentage

FROM actuals a
FULL OUTER JOIN budgets bu
  ON  bu.user_id     = a.user_id
  AND bu.category_id IS NOT DISTINCT FROM a.category_id  -- handles NULL category_id
  AND bu.month       = a.month;

COMMENT ON VIEW public.category_budget_comparison IS
  'Compara orçamento planejado (public.budget) com despesas reais (public.transaction) '
  'por categoria e mês. FULL OUTER JOIN mostra tanto categorias com orçamento sem '
  'despesas quanto despesas sem orçamento. Substitui a versão parcial de 003_analytics_views.sql.';


-- =============================================================================
-- FIM DA MIGRATION 004_budget.sql
-- Próxima migration: 005_recurrence_rules.sql (Sprint Recorrências — futura)
-- =============================================================================
