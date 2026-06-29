-- =============================================================================
-- Migration: 008_investment_trade.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 6.5 — Investment Trades (Livro de Operações)
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.investment_trade (operações vinculadas a uma posição)
--   2. RLS completo: 4 policies por user_id
--   3. Soft delete via deleted_at
--   4. Trigger de updated_at reutilizando set_updated_at()
--   5. Índices: user_id, investment_position_id, trade_date
--
-- MODELO:
--   investment_position = posição atual (derivada das operações ou manual)
--   investment_trade    = livro de operações que gera a posição
--
--   Quando há trades, investment_position.quantity/average_price/acquisition_value
--   são recalculados pela aplicação após cada CRUD em investment_trade.
--   Posições sem trades continuam funcionando como antes (compatibilidade).
--
-- NÃO ALTERA: investment_position, nenhuma tabela existente.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS
-- =============================================================================


-- =============================================================================
-- 1. TABELA investment_trade
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.investment_trade (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID          NOT NULL
                           REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_position_id UUID          NOT NULL
                           REFERENCES public.investment_position(id) ON DELETE CASCADE,

  -- Tipo da operação
  -- buy          : compra de ativos
  -- sell         : venda de ativos
  -- dividend     : recebimento de dividendos (não altera posição)
  -- amortization : amortização de renda fixa (não altera posição)
  -- split        : desdobramento — unit_price = fator (ex: 3 → 1 vira 3)
  -- reverse_split: grupamento  — unit_price = fator (ex: 0.5 → 2 viram 1)
  -- bonus        : bonificação em ações (qty += bonus, custo médio dilui)
  trade_type             TEXT          NOT NULL
                           CHECK (trade_type IN (
                             'buy',
                             'sell',
                             'dividend',
                             'amortization',
                             'split',
                             'reverse_split',
                             'bonus'
                           )),

  trade_date             DATE          NOT NULL,
  quantity               NUMERIC(28,8),   -- unidades negociadas (ou fator para split)
  unit_price             NUMERIC(18,8),   -- preço unitário (ou ratio para split/reverse_split)
  total_amount           NUMERIC(18,2),   -- valor total da operação (quantity * unit_price ± fees)
  fee                    NUMERIC(18,2)    NOT NULL DEFAULT 0 CHECK (fee >= 0),
  tax                    NUMERIC(18,2)    NOT NULL DEFAULT 0 CHECK (tax >= 0),
  currency               CHAR(3)          NOT NULL DEFAULT 'BRL',
  notes                  TEXT,

  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ            -- Soft delete
);

COMMENT ON TABLE public.investment_trade IS
  'Livro de operações vinculado a uma posição de investimento. '
  'Operações são aplicadas em ordem cronológica para recalcular '
  'quantity, average_price e acquisition_value da posição pai.';

COMMENT ON COLUMN public.investment_trade.trade_type IS
  'buy | sell | dividend | amortization | split | reverse_split | bonus';

COMMENT ON COLUMN public.investment_trade.unit_price IS
  'Para buy/sell/bonus: preço unitário. '
  'Para split/reverse_split: fator multiplicador da quantidade '
  '(ex: 3 = 1 ação vira 3; 0.5 = 2 ações viram 1).';

COMMENT ON COLUMN public.investment_trade.total_amount IS
  'Valor total financeiro da operação. '
  'Para buy: saída de caixa (quantity * unit_price + fee + tax). '
  'Para sell/dividend: entrada de caixa. '
  'Para split/reverse_split/bonus: null ou zero (operação societária).';

COMMENT ON COLUMN public.investment_trade.deleted_at IS
  'Soft delete. NULL = ativo. '
  'Ao deletar um trade, recalcular investment_position na aplicação.';


-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.investment_trade ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_trade_select_own
  ON public.investment_trade
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY investment_trade_insert_own
  ON public.investment_trade
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY investment_trade_update_own
  ON public.investment_trade
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY investment_trade_delete_own
  ON public.investment_trade
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================================================
-- 3. TRIGGER — updated_at automático
-- =============================================================================

CREATE TRIGGER trg_investment_trade_updated_at
  BEFORE UPDATE ON public.investment_trade
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 4. ÍNDICES
-- =============================================================================

-- Listar operações de uma posição (principal query)
CREATE INDEX IF NOT EXISTS idx_investment_trade_position_date
  ON public.investment_trade (investment_position_id, trade_date ASC)
  WHERE deleted_at IS NULL;

-- Listar todas as operações de um usuário
CREATE INDEX IF NOT EXISTS idx_investment_trade_user_id
  ON public.investment_trade (user_id, trade_date DESC)
  WHERE deleted_at IS NULL;


-- =============================================================================
-- FIM DA MIGRATION 008_investment_trade.sql
-- =============================================================================
