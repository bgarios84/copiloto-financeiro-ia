/**
 * Financial Health Engine — Renda passiva e dividend yield
 * Sprint 11.1
 *
 * Calculos:
 *   monthlyPassiveIncome   = dividendsLast12m / 12
 *   portfolioDividendYield = dividendsLast12m / totalInvested * 100
 *   incomeReplacementRate  = monthlyPassiveIncome / monthlyExpense * 100
 *
 * A renda passiva aqui e baseada em dividendos/proventos recebidos
 * nos ultimos 12 meses. Nao inclui retiradas de renda fixa.
 */

import type { HealthInput, PassiveIncomeResult } from "./types";

export function computePassiveIncome(input: HealthInput): PassiveIncomeResult {
  const dividends   = Math.max(0, input.dividendsLast12m);
  const monthly     = dividends / 12;
  const totalInvested =
    input.investmentPositionsValue + input.investmentAccountBalance;

  const portfolioDividendYield =
    totalInvested > 0 ? (dividends / totalInvested) * 100 : 0;

  const incomeReplacementRate =
    input.monthlyExpense > 0 ? (monthly / input.monthlyExpense) * 100 : 0;

  return {
    monthlyPassiveIncome:  monthly,
    annualPassiveIncome:   dividends,
    portfolioDividendYield,
    incomeReplacementRate,
  };
}
