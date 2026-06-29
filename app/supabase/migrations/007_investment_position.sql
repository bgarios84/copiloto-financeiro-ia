-- =============================================================================
-- Migration: 007_investment_position.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 6.4 — Investment Position Module
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.investment_position (posições financeiras por usuário)
--   2. RLS completo: 4 policies (SELECT, INSERT, UPDATE, DELETE) por user_id
--   3. Soft delete via deleted_at
--   4. Trigger de updated_at reutilizando set_updated_at() já existente
--   5. Índices: user_id, ticker, asset_class
--
-- SEPARAÇÃO ARQUITETURAL:
--   - manual_asset    → ativos físicos e de custódia própria (imóvel, veículo, cripto wallet)
--   - investment_position → posições financeiras em corretoras (ações, FIIs, renda fixa, fundos)
--
-- NÃO ALTERA: nenhuma tabela existente.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS, CREATE POLICY IF NOT EXISTS
-- =============================================================================


-- =============================================================================
-- 1. TABELA investment_position
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.investment_position (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL
                      REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificação do ativo
  asset_name        TEXT          NOT NULL,
  ticker            TEXT,                       -- ex: PETR4, MXRF11, BTC, TESOURO SELIC 2029

  -- Classe do ativo (enum via CHECK)
  asset_class       TEXT          NOT NULL
                      CHECK (asset_class IN (
                        'stock_br',      -- Ação BM&FBovespa
                        'fii',           -- Fundo Imobiliário
                        'etf_br',        -- ETF listado no Brasil
                        'bdr',           -- BDR
                        'stock_us',      -- Ação americana
                        'etf_us',        -- ETF americano
                        'crypto',        -- Criptomoeda
                        'fixed_income',  -- Renda fixa (CDB, LCI, Tesouro, etc.)
                        'fund',          -- Fundo de investimento
                        'other'          -- Outros
                      )),

  -- Posição
  quantity          NUMERIC(28,8),              -- Quantidade de cotas/ações/moedas
  average_price     NUMERIC(18,8),              -- Preço médio de aquisição (na moeda do ativo)
  current_price     NUMERIC(18,8),              -- Último preço conhecido (na moeda do ativo)
  currency          CHAR(3)       NOT NULL DEFAULT 'BRL',

  -- Custódia / Instituição (sem FK obrigatória — texto livre)
  institution       TEXT,                       -- Ex: "XP Investimentos", "Binance"

  -- Valores consolidados (desnormalizados para display rápido)
  -- Usuário informa ou sistema calcula: quantity * price
  current_value     NUMERIC(18,2),              -- Valor atual total (quantity * current_price)
  acquisition_value NUMERIC(18,2),              -- Custo total de aquisição (quantity * average_price)

  notes             TEXT,

  -- Timestamps
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ               -- Soft delete: NULL = ativo
);

COMMENT ON TABLE public.investment_position IS
  'Posições financeiras do usuário em corretoras e exchanges. '
  'Separado de manual_asset que guarda ativos físicos e custódia própria. '
  'current_value e acquisition_value são desnormalizados para display rápido.';

COMMENT ON COLUMN public.investment_position.asset_class IS
  'Classe: stock_br | fii | etf_br | bdr | stock_us | etf_us | crypto | fixed_income | fund | other';

COMMENT ON COLUMN public.investment_position.current_value IS
  'Valor atual total em currency. Pode ser quantity * current_price ou informado diretamente.';

COMMENT ON COLUMN public.investment_position.acquisition_value IS
  'Custo total de aquisição em currency. Pode ser quantity * average_price ou informado diretamente.';

COMMENT ON COLUMN public.investment_position.deleted_at IS
  'Soft delete: NULL = ativo. Preenchido em vez de DELETE físico.';


-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.investment_position ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas posições do próprio usuário (soft delete filtrado na query da app)
CREATE POLICY investment_position_select_own
  ON public.investment_position
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: apenas para o próprio user_id
CREATE POLICY investment_position_insert_own
  ON public.investment_position
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: apenas posições do próprio usuário
CREATE POLICY investment_position_update_own
  ON public.investment_position
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: apenas posições do próprio usuário (usado pelo soft delete via UPDATE deleted_at)
CREATE POLICY investment_position_delete_own
  ON public.investment_position
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================================================
-- 3. TRIGGER — updated_at automático
-- Reutiliza set_updated_at() criado em migrations anteriores.
-- =============================================================================

CREATE TRIGGER trg_investment_position_updated_at
  BEFORE UPDATE ON public.investment_position
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 4. ÍNDICES
-- =============================================================================

-- Principal: listar posições de um usuário (exclui soft deleted na query)
CREATE INDEX IF NOT EXISTS idx_investment_position_user_id
  ON public.investment_position (user_id)
  WHERE deleted_at IS NULL;

-- Busca por ticker (ex: todas as posições em PETR4)
CREATE INDEX IF NOT EXISTS idx_investment_position_ticker
  ON public.investment_position (user_id, ticker)
  WHERE ticker IS NOT NULL AND deleted_at IS NULL;

-- Filtro por classe de ativo (alocação por classe)
CREATE INDEX IF NOT EXISTS idx_investment_position_asset_class
  ON public.investment_position (user_id, asset_class)
  WHERE deleted_at IS NULL;


-- =============================================================================
-- FIM DA MIGRATION 007_investment_position.sql
-- =============================================================================
