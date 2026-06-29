-- =============================================================================
-- Migration: 003_analytics_views.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 5.4A — Analytics Views para Dashboard e Relatórios
-- Date     : 2026-06-29
--
-- OBJETIVO:
--   Criar views SQL para alimentar o dashboard e relatórios.
--   Nenhuma tabela existente é alterada.
--   Views são SECURITY INVOKER (default PG15+) — herdam RLS das tabelas base.
--
-- ORDEM DE CRIAÇÃO (dependências):
--   1. account_balance_summary       (base: financial_account)
--   2. credit_card_usage_summary     (base: credit_card)
--   3. monthly_cash_flow             (base: transaction)
--   4. monthly_expense_by_category   (base: transaction + category)
--   5. dashboard_summary             (depende de views 1, 2 + transaction)
--   6. category_budget_comparison    (base: transaction + category | TODO: budget)
--
-- LIMITAÇÕES CONHECIDAS:
--   [L1] Multi-moeda: somas incluem valores em moedas distintas sem conversão.
--        Para MVP BRL-first, aceitável. Futuro: usar amount_brl (migration 002).
--   [L2] available_limit em credit_card é atualizado manualmente no MVP.
--        Não reflete uso real de transações até trigger de sync ser criado.
--   [L3] category_budget_comparison: tabela public.budget não existe.
--        planned_amount retorna NULL até Sprint de Orçamentos ser implementada.
--   [L4] Performance: views calculam em tempo real. Para volumes >10k transações,
--        considerar MATERIALIZED VIEW com refresh agendado.
-- =============================================================================


-- =============================================================================
-- VIEW 1: account_balance_summary
-- Saldo consolidado por usuário considerando contas ativas.
-- [L1] Soma saldos de todas as moedas sem conversão.
-- =============================================================================

CREATE OR REPLACE VIEW public.account_balance_summary AS
SELECT
  user_id,
  SUM(balance)                    AS total_balance,
  COUNT(*)::INT                   AS total_accounts,
  SUM(CASE WHEN balance >= 0 THEN balance ELSE 0 END) AS total_positive,
  SUM(CASE WHEN balance <  0 THEN balance ELSE 0 END) AS total_negative
FROM public.financial_account
WHERE deleted_at IS NULL
  AND is_active  = TRUE
GROUP BY user_id;

COMMENT ON VIEW public.account_balance_summary IS
  'Saldo total e contagem de contas ativas por usuário. [L1] Multi-moeda sem conversão.';


-- =============================================================================
-- VIEW 2: credit_card_usage_summary
-- Resumo de limite e uso de cartões ativos por usuário.
-- [L2] available_limit é atualizado manualmente; pode não refletir uso real.
-- =============================================================================

CREATE OR REPLACE VIEW public.credit_card_usage_summary AS
SELECT
  user_id,
  SUM(credit_limit)                                             AS total_limit,
  SUM(credit_limit - available_limit)                          AS total_used,
  SUM(available_limit)                                         AS total_available,
  CASE
    WHEN SUM(credit_limit) > 0
    THEN ROUND(
      (SUM(credit_limit - available_limit) / SUM(credit_limit)) * 100, 2
    )
    ELSE 0
  END                                                          AS usage_percentage
FROM public.credit_card
WHERE deleted_at IS NULL
  AND is_active  = TRUE
GROUP BY user_id;

COMMENT ON VIEW public.credit_card_usage_summary IS
  'Limite total, valor usado e disponível nos cartões ativos. [L2] available_limit manual no MVP.';


-- =============================================================================
-- VIEW 3: monthly_cash_flow
-- Fluxo de caixa mensal: receitas, despesas e resultado líquido.
-- Exclui: transações canceladas, ignoradas e com soft delete.
-- Transações type='transfer' são excluídas do cálculo (não afetam fluxo líquido).
-- =============================================================================

CREATE OR REPLACE VIEW public.monthly_cash_flow AS
SELECT
  user_id,
  DATE_TRUNC('month', date)::DATE                             AS month,
  SUM(
    CASE WHEN type = 'income'  AND status <> 'cancelled'
    THEN amount ELSE 0 END
  )                                                           AS total_income,
  SUM(
    CASE WHEN type = 'expense' AND status <> 'cancelled'
    THEN amount ELSE 0 END
  )                                                           AS total_expense,
  SUM(
    CASE
      WHEN type = 'income'  AND status <> 'cancelled' THEN  amount
      WHEN type = 'expense' AND status <> 'cancelled' THEN -amount
      ELSE 0
    END
  )                                                           AS net_result,
  COUNT(
    CASE WHEN type IN ('income','expense') AND status <> 'cancelled'
    THEN 1 END
  )::INT                                                      AS transaction_count
FROM public.transaction
WHERE deleted_at  IS NULL
  AND is_ignored  = FALSE
GROUP BY user_id, DATE_TRUNC('month', date)::DATE;

COMMENT ON VIEW public.monthly_cash_flow IS
  'Receitas, despesas e resultado líquido por mês e usuário. Transferências excluídas do cálculo.';


-- =============================================================================
-- VIEW 4: monthly_expense_by_category
-- Gastos por categoria, por mês, por usuário.
-- Inclui "Sem categoria" para transações sem category_id.
-- =============================================================================

CREATE OR REPLACE VIEW public.monthly_expense_by_category AS
SELECT
  t.user_id,
  DATE_TRUNC('month', t.date)::DATE       AS month,
  t.category_id,
  COALESCE(c.name,  'Sem categoria')      AS category_name,
  c.color                                 AS category_color,
  c.icon                                  AS category_icon,
  SUM(t.amount)                           AS total_amount,
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
  c.icon;

COMMENT ON VIEW public.monthly_expense_by_category IS
  'Despesas agrupadas por categoria e mês. Usado em relatórios e gráficos de pizza.';


-- =============================================================================
-- VIEW 5: dashboard_summary
-- Painel consolidado para o dashboard principal.
-- Coluna month_income/expense: sempre refere ao MÊS CORRENTE (CURRENT_DATE).
-- Depende das views 1 e 2 + subconsulta inline de transaction.
-- =============================================================================

CREATE OR REPLACE VIEW public.dashboard_summary AS
SELECT
  ab.user_id,

  -- Saldo total em contas
  COALESCE(ab.total_balance,    0)  AS total_balance,
  COALESCE(ab.total_accounts,   0)  AS total_accounts,

  -- Fluxo do mês corrente
  COALESCE(cf.total_income,     0)  AS monthly_income,
  COALESCE(cf.total_expense,    0)  AS monthly_expense,
  COALESCE(cf.net_result,       0)  AS monthly_result,
  COALESCE(cf.transaction_count,0)  AS monthly_transactions,

  -- Cartões de crédito
  COALESCE(cc.total_limit,      0)  AS total_credit_limit,
  COALESCE(cc.total_used,       0)  AS total_credit_used,
  COALESCE(cc.total_available,  0)  AS total_credit_available,
  COALESCE(cc.usage_percentage, 0)  AS credit_usage_percentage

FROM public.account_balance_summary ab

LEFT JOIN (
  -- Fluxo do mês corrente — subconsulta inline para evitar view circular
  SELECT
    user_id,
    SUM(
      CASE WHEN type = 'income'  AND status <> 'cancelled'
      THEN amount ELSE 0 END
    )                           AS total_income,
    SUM(
      CASE WHEN type = 'expense' AND status <> 'cancelled'
      THEN amount ELSE 0 END
    )                           AS total_expense,
    SUM(
      CASE
        WHEN type = 'income'  AND status <> 'cancelled' THEN  amount
        WHEN type = 'expense' AND status <> 'cancelled' THEN -amount
        ELSE 0
      END
    )                           AS net_result,
    COUNT(
      CASE WHEN type IN ('income','expense') AND status <> 'cancelled'
      THEN 1 END
    )::INT                      AS transaction_count
  FROM public.transaction
  WHERE deleted_at IS NULL
    AND is_ignored  = FALSE
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY user_id
) cf ON cf.user_id = ab.user_id

LEFT JOIN public.credit_card_usage_summary cc
  ON cc.user_id = ab.user_id;

COMMENT ON VIEW public.dashboard_summary IS
  'Painel consolidado: saldo total, fluxo do mês corrente e resumo de cartões. '
  'Atualizado em tempo real. Depende de account_balance_summary e credit_card_usage_summary.';


-- =============================================================================
-- VIEW 6: category_budget_comparison
-- Compara valor planejado (orçamento) com valor realizado por categoria/mês.
--
-- TODO [Sprint Orçamentos]: Criar tabela public.budget com estrutura:
--   CREATE TABLE public.budget (
--     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id      UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
--     category_id  UUID REFERENCES public.category(id) ON DELETE SET NULL,
--     month        DATE NOT NULL,             -- sempre dia 1 do mês
--     amount       NUMERIC(18,2) NOT NULL,
--     notes        TEXT,
--     created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     deleted_at   TIMESTAMPTZ,
--     UNIQUE (user_id, category_id, month)
--   );
--   Após criar a tabela, recriar esta view com o JOIN em public.budget.
--
-- ESTADO ATUAL: planned_amount = NULL em todos os registros.
-- difference_amount e usage_percentage derivados também retornam NULL.
-- =============================================================================

CREATE OR REPLACE VIEW public.category_budget_comparison AS
SELECT
  t.user_id,
  DATE_TRUNC('month', t.date)::DATE       AS month,
  t.category_id,
  COALESCE(c.name, 'Sem categoria')       AS category_name,
  c.color                                 AS category_color,
  c.icon                                  AS category_icon,

  -- TODO: substituir NULL pelo valor da tabela public.budget quando criada
  NULL::NUMERIC(18,2)                     AS planned_amount,

  SUM(t.amount)                           AS actual_amount,

  -- NULL - actual = NULL (intencional até budget table existir)
  NULL::NUMERIC(18,2) - SUM(t.amount)     AS difference_amount,

  -- NULL usage até planned_amount existir
  CASE
    WHEN NULL::NUMERIC > 0
    THEN ROUND((SUM(t.amount) / NULL::NUMERIC) * 100, 2)
    ELSE NULL
  END                                     AS usage_percentage

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
  c.icon;

COMMENT ON VIEW public.category_budget_comparison IS
  '[PARCIAL] Compara orçamento planejado x realizado por categoria/mês. '
  'planned_amount = NULL até a tabela public.budget ser criada (Sprint Orçamentos). '
  'actual_amount já é funcional — usado para relatórios de despesas realizadas.';


-- =============================================================================
-- FIM DA MIGRATION 003_analytics_views.sql
-- Próxima migration: 004_budget_table.sql (Sprint Orçamentos — futura)
-- =============================================================================
