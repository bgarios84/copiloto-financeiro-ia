-- =============================================================================
-- Migration: 002_currency_support.sql
-- Project  : Copiloto Financeiro IA
-- Sprint   : 5.2A — Suporte Multi-moeda
-- Date     : 2026-06-29
--
-- Contexto:
--   financial_account já possui: currency CHAR(3) NOT NULL DEFAULT 'BRL' ✅
--   credit_card NÃO possui campo de moeda → ADD COLUMN
--   transaction já possui: currency CHAR(3) NOT NULL DEFAULT 'BRL' ✅
--   transaction NÃO possui campos de conversão → ADD COLUMN (4 campos)
--
-- Regras:
--   • Apenas ADD COLUMN com DEFAULT — zero impacto em dados existentes
--   • Sem alteração de RLS
--   • Sem recriação de tabelas
--   • Sem alteração de constraints existentes
-- =============================================================================


-- =============================================================================
-- 1. credit_card — adicionar currency
-- =============================================================================
-- Cartões internacionais (AMEX, etc.) têm limite em moeda estrangeira.
-- DEFAULT 'BRL' garante compatibilidade total com dados existentes.

ALTER TABLE public.credit_card
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'BRL';

COMMENT ON COLUMN public.credit_card.currency IS
  'Moeda do limite do cartão. DEFAULT BRL. Cartões internacionais usam USD/EUR.';


-- =============================================================================
-- 2. transaction — adicionar campos de conversão multi-moeda
-- =============================================================================
-- Cenário: usuário tem conta em USD e lança uma transação de $100.
--   • currency          = 'USD'  (já existia — moeda da conta/transação)
--   • amount            = 100.00 (já existia — valor na moeda original)
--   • original_amount   = 100.00 (espelho de amount, preserva intenção original)
--   • original_currency = 'USD'  (moeda no momento do lançamento)
--   • exchange_rate     = 5.2134 (cotação USD→BRL no momento do lançamento)
--   • amount_brl        = 521.34 (valor convertido para relatórios consolidados)
--
-- Todos NULL por padrão: transações BRL puras não precisam preencher esses campos.
-- Relatórios de patrimônio consolidado usam amount_brl quando preenchido,
-- e amount como fallback para transações BRL.

ALTER TABLE public.transaction
  ADD COLUMN IF NOT EXISTS original_amount   NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS original_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS exchange_rate     NUMERIC(18,8),
  ADD COLUMN IF NOT EXISTS amount_brl        NUMERIC(18,2);

COMMENT ON COLUMN public.transaction.original_amount IS
  'Valor na moeda original do lançamento. NULL para transações em BRL.';

COMMENT ON COLUMN public.transaction.original_currency IS
  'Código ISO 4217 da moeda original. NULL para transações em BRL.';

COMMENT ON COLUMN public.transaction.exchange_rate IS
  'Cotação original_currency → BRL no momento do lançamento. Precisão 8 casas para cripto.';

COMMENT ON COLUMN public.transaction.amount_brl IS
  'Valor convertido para BRL (original_amount * exchange_rate). Usado em relatórios consolidados.';


-- =============================================================================
-- 3. Índice auxiliar para relatórios consolidados
-- =============================================================================
-- Permite filtrar eficientemente transações em moeda estrangeira.

CREATE INDEX IF NOT EXISTS idx_transaction_currency
  ON public.transaction (user_id, original_currency)
  WHERE original_currency IS NOT NULL;


-- =============================================================================
-- FIM DA MIGRATION 002_currency_support.sql
-- Próxima migration: 003_v2_investments.sql (Sprint futura)
-- =============================================================================
