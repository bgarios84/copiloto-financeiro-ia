-- =============================================================================
-- Migration: 009_b3_market_data.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 7.1 — Market Data B3
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.b3_asset (cadastro de ativos B3)
--   2. Cria tabela public.b3_quote (histórico de cotações diárias)
--   3. RLS: leitura para authenticated, escrita exclusiva do service_role
--   4. Seed inicial: 5 ativos com cotações fictícias (source = 'seed')
--
-- MODELO DE SEGURANÇA:
--   - Dados de mercado compartilhados (sem user_id)
--   - authenticated → SELECT apenas
--   - service_role  → escrita (bypassa RLS)
--   - anon          → sem acesso
--
-- NÃO ALTERA: nenhuma tabela existente.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS, ON CONFLICT DO UPDATE
-- =============================================================================


-- =============================================================================
-- 1. TABELA b3_asset — cadastro de ativos negociados na B3
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.b3_asset (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker     TEXT          NOT NULL,
  name       TEXT          NOT NULL,
  asset_type TEXT          NOT NULL
               CHECK (asset_type IN ('stock_br', 'fii', 'etf_br', 'bdr')),
  sector     TEXT,
  currency   CHAR(3)       NOT NULL DEFAULT 'BRL',
  is_active  BOOLEAN       NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT b3_asset_ticker_unique UNIQUE (ticker)
);

COMMENT ON TABLE public.b3_asset IS
  'Cadastro de ativos listados na B3 (ações, FIIs, ETFs, BDRs). '
  'Dados compartilhados — sem user_id. '
  'Populado via seed e atualizações do service_role.';

COMMENT ON COLUMN public.b3_asset.asset_type IS
  'Classe do ativo: stock_br | fii | etf_br | bdr '
  '(alinhado com investment_position.asset_class).';

CREATE TRIGGER trg_b3_asset_updated_at
  BEFORE UPDATE ON public.b3_asset
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Índice para lookup por tipo (ex: listar todos os FIIs)
CREATE INDEX IF NOT EXISTS idx_b3_asset_type
  ON public.b3_asset (asset_type)
  WHERE is_active = true;


-- =============================================================================
-- 2. TABELA b3_quote — cotações diárias
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.b3_quote (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID          NOT NULL REFERENCES public.b3_asset(id) ON DELETE CASCADE,
  ticker      TEXT          NOT NULL,   -- desnormalizado para queries diretas por ticker
  close_price NUMERIC(18,8) NOT NULL CHECK (close_price > 0),
  quote_date  DATE          NOT NULL,
  source      TEXT          NOT NULL DEFAULT 'manual'
                CHECK (source IN ('seed', 'b3', 'yahoo', 'brapi', 'manual')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT b3_quote_ticker_date_unique UNIQUE (ticker, quote_date)
);

COMMENT ON TABLE public.b3_quote IS
  'Cotações diárias de fechamento de ativos B3. '
  'Dados compartilhados — sem user_id. '
  'close_price desnormalizado com ticker para queries diretas sem JOIN.';

COMMENT ON COLUMN public.b3_quote.source IS
  'seed   : valor fictício para desenvolvimento '
  'b3     : fonte oficial B3 '
  'yahoo  : Yahoo Finance '
  'brapi  : brapi.dev (API brasileira gratuita) '
  'manual : inserido manualmente';

-- Índice principal: buscar cotação mais recente por ticker
CREATE INDEX IF NOT EXISTS idx_b3_quote_ticker_date
  ON public.b3_quote (ticker, quote_date DESC);

-- Índice por asset_id
CREATE INDEX IF NOT EXISTS idx_b3_quote_asset_date
  ON public.b3_quote (asset_id, quote_date DESC);


-- =============================================================================
-- 3. ROW LEVEL SECURITY — ambas as tabelas
-- =============================================================================

ALTER TABLE public.b3_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b3_quote ENABLE ROW LEVEL SECURITY;

-- b3_asset: leitura para authenticated
CREATE POLICY b3_asset_select_authenticated
  ON public.b3_asset FOR SELECT TO authenticated USING (true);

-- b3_quote: leitura para authenticated
CREATE POLICY b3_quote_select_authenticated
  ON public.b3_quote FOR SELECT TO authenticated USING (true);

-- Sem policies de escrita para usuários comuns.
-- service_role bypassa RLS e é o único que pode escrever.


-- =============================================================================
-- 4. SEED — 5 ativos + cotações fictícias para desenvolvimento
-- =============================================================================

-- 4a. Inserir ativos (upsert por ticker)
INSERT INTO public.b3_asset (ticker, name, asset_type, sector, currency)
VALUES
  ('PETR4',  'Petróleo Brasileiro S.A. — Petrobras PN',    'stock_br', 'Petróleo e Gás',       'BRL'),
  ('BBAS3',  'Banco do Brasil S.A. ON',                     'stock_br', 'Financeiro',            'BRL'),
  ('ITUB4',  'Itaú Unibanco Holding S.A. PN',               'stock_br', 'Financeiro',            'BRL'),
  ('CPLE3',  'Copel — Cia Paranaense de Energia ON',        'stock_br', 'Energia Elétrica',      'BRL'),
  ('XPML11', 'XP Malls Fundo de Investimento Imobiliário', 'fii',      'Fundos Imobiliários',   'BRL')
ON CONFLICT (ticker) DO UPDATE SET
  name       = EXCLUDED.name,
  asset_type = EXCLUDED.asset_type,
  sector     = EXCLUDED.sector,
  updated_at = NOW();

-- 4b. Inserir cotações fictícias (upsert por ticker + data)
WITH assets AS (
  SELECT id, ticker FROM public.b3_asset
  WHERE ticker IN ('PETR4', 'BBAS3', 'ITUB4', 'CPLE3', 'XPML11')
)
INSERT INTO public.b3_quote (asset_id, ticker, close_price, quote_date, source)
SELECT
  a.id,
  v.ticker,
  v.close_price,
  CURRENT_DATE,
  'seed'
FROM (VALUES
  ('PETR4',   38.20),
  ('BBAS3',   16.00),
  ('ITUB4',   34.00),
  ('CPLE3',   15.20),
  ('XPML11', 118.00)
) AS v(ticker, close_price)
JOIN assets a ON a.ticker = v.ticker
ON CONFLICT (ticker, quote_date) DO UPDATE SET
  close_price = EXCLUDED.close_price,
  source      = EXCLUDED.source;


-- =============================================================================
-- FIM DA MIGRATION 009_b3_market_data.sql
-- =============================================================================
