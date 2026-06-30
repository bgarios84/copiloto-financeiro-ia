/**
 * Financial Insights Engine — Types
 * Sprint 11.3
 *
 * Insights determinísticos calculados sobre dados reais do usuário.
 * Arquivo puro — sem "use server" / "use client", sem I/O.
 */

import type { HealthSnapshot } from "@/lib/financial-health";

// ── Severidade ────────────────────────────────────────────────────────────────

export type InsightSeverity = "success" | "info" | "warning" | "danger";

// ── Categoria ─────────────────────────────────────────────────────────────────

export type InsightCategory =
  | "patrimonio"
  | "fluxo"
  | "poupanca"
  | "reserva"
  | "investimentos"
  | "credito"
  | "fire";

// ── Insight ───────────────────────────────────────────────────────────────────

export interface FinancialInsight {
  /** ID único da regra. */
  id:          string;
  title:       string;
  description: string;
  severity:    InsightSeverity;
  category:    InsightCategory;
  /** Metrica formatada exibida no card (ex: "+3.2%", "R$ 1.500/mês"). */
  metric?:     string;
  /** Ação recomendada ao usuário. */
  action?:     string;
  /** Nome do ícone Lucide (string serializável — Client Component faz o mapeamento). */
  icon:        string;
}

// ── Input ─────────────────────────────────────────────────────────────────────

/** Categoria de gasto de maior peso no mês corrente. */
export interface TopExpenseCategory {
  name:     string;
  amount:   number;
  /** % do total de despesas do mês (0–100). */
  totalPct: number;
}

/**
 * Input completo para o motor de insights.
 * Combina HealthSnapshot com campos extras do DashboardData
 * que não estão cobertos pelo Financial Health Engine.
 */
export interface InsightInput {
  health:             HealthSnapshot;
  /** DashboardSummary.credit_usage_percentage (0–100). 0 se sem cartão. */
  creditUsagePct:     number;
  /** Categoria de maior gasto no mês; null se sem dados. */
  topExpenseCategory: TopExpenseCategory | null;
}

// ── Assinatura de regra ────────────────────────────────────────────────────────

/** Função pura: recebe InsightInput, retorna FinancialInsight ou null. */
export type InsightRule = (input: InsightInput) => FinancialInsight | null;
