/**
 * Financial Health Engine — Taxa de poupanca
 * Sprint 11.1
 *
 * Calculos:
 *   savingsRate = (income - expense) / income * 100
 *   grade:
 *     excellent >= 30%
 *     good      >= 20%
 *     fair      >= 10%
 *     poor      <  10%
 *
 * Referencia: regra geral de planejamento financeiro.
 */

import type { HealthInput, SavingsResult, SavingsGrade } from "./types";

/** Taxa de poupanca segura para um ponto de fluxo. */
function savingsRateFor(income: number, expense: number): number {
  if (income <= 0) return 0;
  return Math.max(0, (income - expense) / income) * 100;
}

function gradeFromRate(rate: number): SavingsGrade {
  if (rate >= 30) return "excellent";
  if (rate >= 20) return "good";
  if (rate >= 10) return "fair";
  return "poor";
}

export function computeSavings(input: HealthInput): SavingsResult {
  const savingsRate   = savingsRateFor(input.monthlyIncome, input.monthlyExpense);
  const monthlySurplus = input.monthlyIncome - input.monthlyExpense;

  const last12 = input.cashFlowHistory.slice(-12);
  const avgSavingsRate12m =
    last12.length === 0
      ? savingsRate
      : last12.reduce((sum, p) => sum + savingsRateFor(p.income, p.expense), 0) / last12.length;

  return {
    savingsRate,
    avgSavingsRate12m,
    monthlySurplus,
    grade: gradeFromRate(savingsRate),
  };
}
