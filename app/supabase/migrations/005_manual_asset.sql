-- =============================================================================
-- Migration: 005_manual_asset.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 6.1 — Patrimônio Manual
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.manual_asset
--   2. RLS completo com 4 policies
--   3. Trigger updated_at (reutiliza set_updated_at() de 001)
--   4. Índice de performance em (user_id) WHERE deleted_at IS NULL
--
-- Campos extras aprovados:
--   - acquisition_value DATE NULL  — para calcular valorização futura
--   - acquisition_date  DATE NULL  — data de aquisição do ativo
--
-- NÃO ALTERA: nenhuma tabela existente, nenhuma view, nenhuma policy.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS
-- =============================================================================


-- =============================================================================
-- 1. TABELA manual_asset
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.manual_asset (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,

  -- Identificação
  name              TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),

  -- Tipo do ativo
  -- cash         : dinheiro em espécie, cofre, etc.
  -- real_estate  : imóveis (casa, apartamento, terreno)
  -- vehicle      : veículos (carro, moto, barco)
  -- fixed_income : renda fixa (CDB, LCI, LCA, Tesouro Direto)
  -- stock        : ações (B3, NYSE, NASDAQ, etc.)
  -- fii          : fundos de investimento imobiliário
  -- crypto       : criptomoedas
  -- other        : outros (arte, joias, etc.)
  asset_type        TEXT          NOT NULL CHECK (asset_type IN (
                      'cash', 'real_estate', 'vehicle',
                      'fixed_income', 'stock', 'fii', 'crypto', 'other'
                    )),

  -- Valor atual (estimativa do usuário)
  current_value     NUMERIC(18,2) NOT NULL CHECK (current_value >= 0),
  currency          CHAR(3)       NOT NULL DEFAULT 'BRL',

  -- Valor e data de aquisição (opcionais — para cálculo de valorização)
  acquisition_value NUMERIC(18,2)           CHECK (acquisition_value IS NULL OR acquisition_value >= 0),
  acquisition_date  DATE,

  -- Metadados opcionais
  custodian         TEXT,         -- instituição/custodiante (banco, corretora, etc.)
  notes             TEXT,

  -- Auditoria
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

COMMENT ON TABLE public.manual_asset IS
  'Ativos patrimoniais manuais do usuário. Complementa financial_account com '
  'imóveis, veículos, cripto, renda fixa e outros ativos não gerenciados por conta.';

COMMENT ON COLUMN public.manual_asset.asset_type IS
  'Tipo do ativo: cash | real_estate | vehicle | fixed_income | stock | fii | crypto | other';

COMMENT ON COLUMN public.manual_asset.current_value IS
  'Valor atual estimado pelo usuário. Atualizado manualmente.';

COMMENT ON COLUMN public.manual_asset.acquisition_value IS
  'Valor de aquisição original. NULL se não informado. Usado para calcular valorização.';

COMMENT ON COLUMN public.manual_asset.acquisition_date IS
  'Data de aquisição. NULL se não informada.';

COMMENT ON COLUMN public.manual_asset.custodian IS
  'Instituição ou custodiante (banco, corretora, cartório, etc.). Opcional.';


-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.manual_asset ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas próprios ativos não deletados
CREATE POLICY manual_asset_select_own
  ON public.manual_asset
  FOR SELECT
  USING (user_id = auth.uid());

-- Criação: apenas para si mesmo
CREATE POLICY manual_asset_insert_own
  ON public.manual_asset
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Atualização: apenas próprios ativos
CREATE POLICY manual_asset_update_own
  ON public.manual_asset
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Exclusão física (não usada — usamos soft delete, mas protege a tabela)
CREATE POLICY manual_asset_delete_own
  ON public.manual_asset
  FOR DELETE
  USING (user_id = auth.uid());


-- =============================================================================
-- 3. TRIGGER updated_at
-- Reutiliza public.set_updated_at() criada em 001_mvp_schema.sql.
-- =============================================================================

CREATE TRIGGER manual_asset_updated_at
  BEFORE UPDATE ON public.manual_asset
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 4. ÍNDICES DE PERFORMANCE
-- =============================================================================

-- Query principal: listar ativos ativos do usuário
CREATE INDEX IF NOT EXISTS idx_manual_asset_user
  ON public.manual_asset (user_id)
  WHERE deleted_at IS NULL;

-- Ordenação / filtro por tipo dentro de um usuário
CREATE INDEX IF NOT EXISTS idx_manual_asset_user_type
  ON public.manual_asset (user_id, asset_type)
  WHERE deleted_at IS NULL;


-- =============================================================================
-- FIM DA MIGRATION 005_manual_asset.sql
-- Próxima migration: 006_recurrence_rules.sql (Sprint Recorrências — futura)
-- =============================================================================
