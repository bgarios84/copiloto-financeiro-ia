/**
 * Financial Health Engine — Fluxo de caixa
 * Sprint 11.1
 *
 * Calculos:
 *   monthlyBalance       = income - expense
 *   avg12m               = media dos ultimos N meses (N <= 12)
 *   trend                = compara resultado medio dos ultimos 3m vs 3m anteriores
 *                          melhora: > +10% | piora: < -10% | estavel: entre
 */

import type { HealthInput, CashFlowResult } from "./types";

/** Media aritmetica de um array de numeros. Retorna 0 para array vazio. */
function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function computeCashFlow(input: HealthInput): CashFlowResult {
  const monthlyBalance = input.monthlyIncome - input.monthlyExpense;

  const history = input.cashFlowHistory;
  const last12  = history.slice(-12);

  const avgMonthlyIncome12m  = avg(last12.map((p) => p.income));
  const avgMonthlyExpense12m = avg(last12.map((p) => p.expense));
  const avgMonthlyBalance12m = avg(last12.map((p) => p.income - p.expense));

  // Tendencia: compara resultado medio dos ultimos 3 meses vs 3 anteriores
  let trend: CashFlowResult["trend"] = "stable";
  if (last12.length >= 6) {
    const recent3 = last12.slice(-3).map((p) => p.income - p.expense);
    const prev3   = last12.slice(-6, -3).map((p) => p.income - p.expense);
    const recentAvg = avg(recent3);
    const prevAvg   = avg(prev3);

    if (prevAvg === 0) {
      trend = recentAvg > 0 ? "improving" : recentAvg < 0 ? "deteriorating" : "stable";
    } else {
      const changePct = ((recentAvg - prevAvg) / Math.abs(prevAvg)) * 100;
      if      (changePct >  10) trend = "improving";
      else if (changePct < -10) trend = "deteriorating";
      else                      trend = "stable";
    }
  }

  return {
    monthlyIncome:   input.monthlyIncome,
    monthlyExpense:  input.monthlyExpense,
    monthlyBalance,
    avgMonthlyIncome12m,
    avgMonthlyExpense12m,
    avgMonthlyBalance12m,
    trend,
  };
}
