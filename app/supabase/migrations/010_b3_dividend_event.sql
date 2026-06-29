-- =============================================================================
-- Migration: 010_b3_dividend_event.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 7.1.1 — Dividendos e Proventos B3
-- Date     : 2026-06-29
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria tabela public.b3_dividend_event (eventos de proventos B3)
--   2. RLS: leitura para authenticated, escrita exclusiva do service_role
--   3. Seed: 4 eventos fictícios para CPLE3, PETR4, BBAS3, XPML11
--
-- event_type:
--   dividend    : dividendo (acao ON/PN, ETF, BDR)
--   jcp         : juros sobre capital proprio
--   amortization: amortizacao de capital (renda fixa, CRI, CRA)
--   income      : rendimento de FII (mensal)
--
-- NÃO ALTERA: nenhuma tabela existente.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS, ON CONFLICT DO NOTHING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.b3_dividend_event (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID          NOT NULL
                     REFERENCES public.b3_asset(id) ON DELETE CASCADE,
  ticker           TEXT          NOT NULL,
  event_type       TEXT          NOT NULL
                     CHECK (event_type IN ('dividend', 'jcp', 'amortization', 'income')),
  amount_per_share NUMERIC(18,8) NOT NULL CHECK (amount_per_share > 0),
  declared_date    DATE,
  ex_date          DATE,
  payment_date     DATE,
  source           TEXT          NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('seed', 'b3', 'brapi', 'manual')),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT b3_dividend_event_unique
    UNIQUE (ticker, event_type, amount_per_share, ex_date, payment_date)
);

COMMENT ON TABLE public.b3_dividend_event IS
  'Eventos de proventos/dividendos de ativos B3. '
  'Dados de mercado compartilhados (sem user_id). '
  'Escrita exclusiva do service_role.';

COMMENT ON COLUMN public.b3_dividend_event.event_type IS
  'dividend: dividendo | jcp: juros s/ capital proprio | '
  'amortization: amortizacao | income: rendimento FII';

COMMENT ON COLUMN public.b3_dividend_event.amount_per_share IS
  'Valor bruto por cota/acao em BRL. Para JCP, ja considera o IR na fonte externamente.';

-- RLS
ALTER TABLE public.b3_dividend_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY b3_dividend_event_select_authenticated
  ON public.b3_dividend_event
  FOR SELECT
  TO authenticated
  USING (true);

-- Indices
CREATE INDEX IF NOT EXISTS idx_b3_dividend_event_ticker_ex
  ON public.b3_dividend_event (ticker, ex_date DESC);

CREATE INDEX IF NOT EXISTS idx_b3_dividend_event_ticker_payment
  ON public.b3_dividend_event (ticker, payment_date ASC)
  WHERE payment_date IS NOT NULL;

-- =============================================================================
-- SEED — eventos fictícios para desenvolvimento
-- =============================================================================

WITH assets AS (
  SELECT id, ticker FROM public.b3_asset
  WHERE ticker IN ('CPLE3', 'PETR4', 'BBAS3', 'XPML11')
)
INSERT INTO public.b3_dividend_event
  (asset_id, ticker, event_type, amount_per_share,
   declared_date, ex_date, payment_date, source)
SELECT a.id, v.ticker, v.event_type, v.amount_per_share,
       v.declared_date::DATE, v.ex_date::DATE, v.payment_date::DATE, 'seed'
FROM (VALUES
  -- CPLE3: dividendo pago recentemente + proximo pagamento
  ('CPLE3', 'dividend',  0.28000000, '2026-04-10', '2026-04-30', '2026-05-15'),
  ('CPLE3', 'dividend',  0.31000000, '2026-01-10', '2026-01-31', '2026-02-14'),
  ('CPLE3', 'dividend',  0.25000000, '2025-10-08', '2025-10-31', '2025-11-14'),
  ('CPLE3', 'dividend',  0.30000000, '2026-07-02', '2026-07-31', '2026-08-15'),

  -- PETR4: JCP trimestral
  ('PETR4', 'jcp',       0.45000000, '2026-05-01', '2026-05-16', '2026-06-02'),
  ('PETR4', 'jcp',       0.38000000, '2026-02-03', '2026-02-21', '2026-03-10'),
  ('PETR4', 'jcp',       0.52000000, '2025-11-04', '2025-11-21', '2025-12-09'),
  ('PETR4', 'jcp',       0.48000000, '2026-08-01', '2026-08-15', '2026-09-01'),

  -- BBAS3: dividendo semestral
  ('BBAS3', 'dividend',  0.72000000, '2026-03-15', '2026-03-31', '2026-04-30'),
  ('BBAS3', 'dividend',  0.68000000, '2025-09-12', '2025-09-30', '2025-10-31'),
  ('BBAS3', 'dividend',  0.75000000, '2026-09-10', '2026-09-30', '2026-10-31'),

  -- XPML11: rendimento FII mensal
  ('XPML11', 'income',   0.10200000, '2026-06-02', '2026-06-13', '2026-06-30'),
  ('XPML11', 'income',   0.10000000, '2026-05-02', '2026-05-14', '2026-05-30'),
  ('XPML11', 'income',   0.09800000, '2026-04-02', '2026-04-15', '2026-04-30'),
  ('XPML11', 'income',   0.10500000, '2026-03-03', '2026-03-14', '2026-03-31'),
  ('XPML11', 'income',   0.09900000, '2026-02-03', '2026-02-14', '2026-02-28'),
  ('XPML11', 'income',   0.10100000, '2026-01-02', '2026-01-15', '2026-01-31'),
  ('XPML11', 'income',   0.10200000, '2025-12-02', '2025-12-13', '2025-12-30'),
  ('XPML11', 'income',   0.09700000, '2025-11-03', '2025-11-14', '2025-11-28'),
  ('XPML11', 'income',   0.09800000, '2025-10-02', '2025-10-14', '2025-10-31'),
  ('XPML11', 'income',   0.10300000, '2025-09-01', '2025-09-13', '2025-09-30'),
  ('XPML11', 'income',   0.10000000, '2025-08-01', '2025-08-13', '2025-08-29'),
  ('XPML11', 'income',   0.09600000, '2025-07-01', '2025-07-14', '2025-07-31'),
  ('XPML11', 'income',   0.10400000, '2026-07-02', '2026-07-14', '2026-07-31')
) AS v(ticker, event_type, amount_per_share, declared_date, ex_date, payment_date)
JOIN assets a ON a.ticker = v.ticker
ON CONFLICT (ticker, event_type, amount_per_share, ex_date, payment_date)
  DO NOTHING;

-- =============================================================================
-- FIM DA MIGRATION 010_b3_dividend_event.sql
-- =============================================================================
