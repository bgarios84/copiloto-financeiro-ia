/**
 * Financial Insights Engine — Orquestrador
 * Sprint 11.3
 *
 * computeInsights() executa todas as regras e retorna os insights ativos,
 * ordenados por severidade (danger → warning → success → info).
 * Função pura — sem I/O.
 */

import type { FinancialInsight, InsightInput } from "./types.ts";
import { ALL_RULES } from "./rules.ts";

// ── Ordem de severidade (menor índice = maior prioridade) ────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  danger:  0,
  warning: 1,
  success: 2,
  info:    3,
};

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Executa todas as regras e retorna os insights disparados,
 * ordenados por severidade decrescente.
 *
 * @param input   Dados consolidados (HealthSnapshot + campos extras)
 * @param maxResults  Limite de insights retornados (padrão: 8)
 */
export function computeInsights(
  input:      InsightInput,
  maxResults  = 8,
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  for (const rule of ALL_RULES) {
    try {
      const result = rule(input);
      if (result !== null) insights.push(result);
    } catch {
      // regra com erro silenciosa — não bloqueia as demais
    }
  }

  return insights
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    .slice(0, maxResults);
}
