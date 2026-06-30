/**
 * Service — Financial Insights
 * Sprint 11.3
 *
 * Mapeia DashboardData + HealthSnapshot → InsightInput e chama o engine.
 * Função pura — zero queries ao banco.
 */

import { computeInsights }  from "@/lib/financial-insights";
import type { InsightInput, FinancialInsight, TopExpenseCategory } from "@/lib/financial-insights";
import type { HealthSnapshot } from "@/lib/financial-health";
import type { DashboardData }  from "@/types/dashboard";
import type { ServiceResult }  from "@/types/common";

// ── Mapper ────────────────────────────────────────────────────────────────────

function buildInsightInput(data: DashboardData, health: HealthSnapshot): InsightInput {
  const { summary, expenseByCategory } = data;

  // ── Uso do cartão ──────────────────────────────────────────────────────────
  const creditUsagePct = summary?.credit_usage_percentage ?? 0;

  // ── Categoria de maior gasto do mês ───────────────────────────────────────
  let topExpenseCategory: TopExpenseCategory | null = null;
  if (expenseByCategory.length >= 2) {
    const total = expenseByCategory.reduce((s, c) => s + c.total_amount, 0);
    if (total > 0) {
      const top = expenseByCategory[0];          // já ordenado por total_amount desc
      const totalPct = (top.total_amount / total) * 100;
      topExpenseCategory = {
        name:     top.category_name,
        amount:   top.total_amount,
        totalPct,
      };
    }
  }

  return {
    health,
    creditUsagePct,
    topExpenseCategory,
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function computeInsightsFromDashboard(
  data:    DashboardData,
  health:  HealthSnapshot,
  maxResults = 8,
): ServiceResult<FinancialInsight[]> {
  try {
    const input    = buildInsightInput(data, health);
    const insights = computeInsights(input, maxResults);
    return { data: insights, error: null };
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Erro ao calcular insights financeiros.",
    };
  }
}
