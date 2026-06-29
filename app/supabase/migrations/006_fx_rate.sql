-- =============================================================================
-- Migration: 006_fx_rate.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 6.2 — FX Rate e Base Multi-moeda
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.fx_rate (dados de mercado compartilhados)
--   2. Segurança: RLS habilitado com apenas SELECT para authenticated
--      Escrita restrita ao service_role (bypassa RLS por definição do Supabase)
--   3. Seed inicial com 4 pares fictícios (source = 'seed') para desenvolvimento
--
-- MODELO DE SEGURANÇA:
--   - RLS ativo → sem policy de INSERT/UPDATE/DELETE para usuários comuns
--   - service_role ignora RLS → único role que pode escrever
--   - authenticated → apenas leitura (SELECT policy abaixo)
--   - anon → sem acesso (sem policy)
--
-- NÃO ALTERA: nenhuma tabela existente, nenhuma view, nenhuma policy.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS
-- =============================================================================


-- =============================================================================
-- 1. TABELA fx_rate
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fx_rate (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Par de moedas: base → quote
  -- Convenção: rate = quantidade de quote_currency para 1 unidade de base_currency
  -- Ex: base=USD, quote=BRL, rate=5.25 → 1 USD = 5.25 BRL
  base_currency  CHAR(3)       NOT NULL,
  quote_currency CHAR(3)       NOT NULL,
  rate           NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  rate_date      DATE          NOT NULL,

  -- Origem do dado
  -- 'seed'     : valor fictício para desenvolvimento
  -- 'bcb'      : Banco Central do Brasil (PTAX)
  -- 'coinbase' : API Coinbase (cripto)
  -- 'manual'   : inserido manualmente via admin
  source         TEXT          NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('seed','bcb','coinbase','yahoo','manual')),

  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Um taxa por par por dia
  CONSTRAINT fx_rate_unique_pair_date
    UNIQUE (base_currency, quote_currency, rate_date)
);

COMMENT ON TABLE public.fx_rate IS
  'Taxas de câmbio diárias entre pares de moedas. '
  'Dado de mercado compartilhado — sem user_id. '
  'Escrita exclusiva do service_role via jobs agendados ou admin.';

COMMENT ON COLUMN public.fx_rate.base_currency IS
  'Moeda base (ex: USD, EUR, BTC). 1 unidade desta moeda = rate unidades de quote_currency.';

COMMENT ON COLUMN public.fx_rate.quote_currency IS
  'Moeda de cotação (geralmente BRL para consolidação patrimonial).';

COMMENT ON COLUMN public.fx_rate.rate IS
  'Quantidade de quote_currency por 1 unidade de base_currency. Sempre positivo.';

COMMENT ON COLUMN public.fx_rate.source IS
  'Origem do dado: seed (dev) | bcb (Banco Central) | coinbase | yahoo | manual';


-- =============================================================================
-- 2. SEGURANÇA
--
-- Estratégia: RLS habilitado + apenas SELECT para authenticated.
-- Sem policies de escrita → service_role é o único que pode escrever
-- (service_role bypassa RLS por definição no Supabase/PostgreSQL).
-- =============================================================================

ALTER TABLE public.fx_rate ENABLE ROW LEVEL SECURITY;

-- Leitura para qualquer usuário autenticado
-- (dados de mercado públicos não precisam de filtro por user_id)
CREATE POLICY fx_rate_select_authenticated
  ON public.fx_rate
  FOR SELECT
  TO authenticated
  USING (true);

-- NÃO há políticas de INSERT, UPDATE ou DELETE para roles de usuário.
-- O service_role (usado em Edge Functions e scripts admin) bypassa RLS.


-- =============================================================================
-- 3. ÍNDICES DE PERFORMANCE
-- =============================================================================

-- Query principal: buscar taxa mais recente por par de moedas
CREATE INDEX IF NOT EXISTS idx_fx_rate_pair_date
  ON public.fx_rate (base_currency, quote_currency, rate_date DESC);

-- Busca por data (ex: snap de patrimônio histórico em data específica)
CREATE INDEX IF NOT EXISTS idx_fx_rate_date
  ON public.fx_rate (rate_date DESC);


-- =============================================================================
-- 4. SEED DATA
--
-- Valores fictícios para ambiente de desenvolvimento.
-- source = 'seed' permite filtrar/substituir em produção.
-- Taxa de referência aproximada (não use para cálculos reais):
--   USD/BRL ≈ 5.70 (Jun/2026 estimado)
--   EUR/BRL ≈ 6.15
--   BTC/BRL ≈ 580.000
--   ETH/BRL ≈ 19.000
-- =============================================================================

INSERT INTO public.fx_rate (base_currency, quote_currency, rate, rate_date, source)
VALUES
  ('USD', 'BRL', 5.70000000, CURRENT_DATE, 'seed'),
  ('EUR', 'BRL', 6.15000000, CURRENT_DATE, 'seed'),
  ('BTC', 'BRL', 580000.00000000, CURRENT_DATE, 'seed'),
  ('ETH', 'BRL', 19000.00000000, CURRENT_DATE, 'seed'),
  -- Pares inversos: facilita queries sem precisar inverter
  ('BRL', 'USD', 0.17543860, CURRENT_DATE, 'seed'),
  ('BRL', 'EUR', 0.16260163, CURRENT_DATE, 'seed')
ON CONFLICT (base_currency, quote_currency, rate_date)
  DO UPDATE SET
    rate   = EXCLUDED.rate,
    source = EXCLUDED.source;

COMMENT ON TABLE public.fx_rate IS
  'Taxas de câmbio diárias entre pares de moedas. '
  'Dado de mercado compartilhado — sem user_id. '
  'Escrita exclusiva do service_role via jobs agendados. '
  'Seed inicial com source = ''seed'' para desenvolvimento.';


-- =============================================================================
-- FIM DA MIGRATION 006_fx_rate.sql
-- Próxima migration: 007_portfolio.sql (Sprint 6.5 — Investimentos)
-- =============================================================================
