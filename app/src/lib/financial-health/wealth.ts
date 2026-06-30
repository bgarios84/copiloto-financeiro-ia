/**
 * Financial Health Engine — Patrimonio e crescimento
 * Sprint 11.1
 *
 * Calculos:
 *   totalAssets      = liquidBalance + investmentAccountBalance + investmentPositionsValue + manualAssetsValue
 *   totalLiabilities = creditCardDebt
 *   netWorth         = totalAssets - totalLiabilities
 *   monthlyGrowthPct = variacao % m/m (requer >= 2 pontos no historico)
 *   annualGrowthPct  = variacao % a/a (requer >= 12 pontos no historico)
 *
 * Para o crescimento calculamos o resultado acumulado do fluxo de caixa como
 * proxy do crescimento patrimonial. Se houver historico de patrimonio real
 * (nao disponivel ainda), substituir pelos valores reais.
 */

import type { HealthInput, WealthResult } from "./types";

/**
 * Calcula patrimonio, patrimonio liquido e taxas de crescimento.
 *
 * Nota sobre crescimento: como nao temos historico de patrimonio no schema,
 * usamos o fluxo de caixa acumulado como proxy:
 *   crescimento_mes  = resultado_mes_atual / |patrimonio_net_worth| * 100
 *   crescimento_ano  = soma_resultado_12m / |patrimonio_net_worth| * 100
 * Isso e uma aproximacao conservadora — subtrai apenas o fluxo operacional,
 * sem valorizacao de ativos.
 */
export function computeWealth(input: HealthInput): WealthResult {
  const totalAssets =
    input.liquidBalance +
    input.investmentAccountBalance +
    input.investmentPositionsValue +
    input.manualAssetsValue;

  const totalLiabilities = Math.max(0, input.creditCardDebt);
  const netWorth         = totalAssets - totalLiabilities;

  // Crescimento mensal: resultado do mes atual relativo ao patrimonio
  let monthlyGrowthPct: number | null = null;
  const monthlyBalance = input.monthlyIncome - input.monthlyExpense;
  if (netWorth !== 0 && input.cashFlowHistory.length >= 2) {
    monthlyGrowthPct = (monthlyBalance / Math.abs(netWorth)) * 100;
  }

  // Crescimento anual: soma dos resultados dos ultimos 12 meses relativo ao patrimonio
  let annualGrowthPct: number | null = null;
  if (netWorth !== 0 && input.cashFlowHistory.length >= 12) {
    const last12 = input.cashFlowHistory.slice(-12);
    const annualFlow = last12.reduce((sum, p) => sum + (p.income - p.expense), 0);
    annualGrowthPct = (annualFlow / Math.abs(netWorth)) * 100;
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    monthlyGrowthPct,
    annualGrowthPct,
  };
}
