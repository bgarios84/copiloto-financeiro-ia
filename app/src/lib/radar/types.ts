/**
 * Types — Radar Financeiro
 * Sprint 8.2
 *
 * Arquivo puro — sem "use server" / "use client".
 * Compartilhado entre src/lib/radar/rules.ts e src/services/radar.ts.
 */

import type { DashboardSummary, MonthlyCashFlow } from "@/types/dashboard";
import type { BudgetComparison }                  from "@/types/budget";
import type { FinancialAccount }                  from "@/types/financial-account";
import type { CreditCard }                        from "@/types/credit-card";
import type { InvestmentPosition }                from "@/types/investment";
import type { ManualAsset }                       from "@/types/manual-asset";
import type { B3QuoteMap }                        from "@/types/b3-market";
import type { DividendMap }                       from "@/types/b3-dividend";
import type { FxRateMap }                         from "@/types/fx-rate";

// ── Severidade ────────────────────────────────────────────────────────────────

export type InsightLevel = "danger" | "warning" | "success" | "info";

// ── Insight ───────────────────────────────────────────────────────────────────

/**
 * Um insight gerado pelo Radar Financeiro.
 *
 * severity  — usado para ordenar (danger > warning > success > info)
 * category  — mesma escala; usado para estilização visual no cliente
 * icon      — nome do ícone Lucide (string serializável — o Client Component mapeia para o componente)
 * action    — ação sugerida exibida ao usuário
 */
export interface RadarInsight {
  id:          string;
  title:       string;
  description: string;
  severity:    InsightLevel;
  category:    InsightLevel;
  icon:        string;
  action:      string;
}

// ── Input passado a cada regra ────────────────────────────────────────────────

/**
 * Dados brutos fornecidos pelo radar service (src/services/radar.ts) a cada regra.
 * Cada regra recebe este objeto e decide se deve ou não emitir um RadarInsight.
 */
export interface RadarInput {
  summary:           DashboardSummary | null;
  cashFlow:          MonthlyCashFlow[];
  budgetComparisons: BudgetComparison[];
  accounts:          FinancialAccount[];
  cards:             CreditCard[];
  investments:       InvestmentPosition[];
  manualAssets:      ManualAsset[];
  b3QuoteMap:        B3QuoteMap;
  dividendMap:       DividendMap;
  fxRateMap:         FxRateMap;
  /** true se houve ao menos um trade (buy) registrado no mês corrente */
  hasTradeThisMonth: boolean;
}

// ── Assinatura de uma regra ───────────────────────────────────────────────────

/**
 * Uma regra do Radar Financeiro.
 *
 * Função pura: recebe RadarInput, retorna RadarInsight ou null.
 *
 * Para adicionar uma nova regra:
 *   1. Crie uma função com esta assinatura em src/lib/radar/rules.ts
 *   2. Exporte-a e adicione-a ao array ALL_RULES
 *   O radar service (src/services/radar.ts) a executará automaticamente.
 */
export type RadarRule = (input: RadarInput) => RadarInsight | null;
