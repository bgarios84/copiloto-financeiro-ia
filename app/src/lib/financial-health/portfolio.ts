/**
 * Financial Health Engine — Concentracao e diversificacao de carteira
 * Sprint 11.1
 *
 * Calculos:
 *   HHI (Herfindahl-Hirschman Index) = soma(wi^2) onde wi = value_i / total
 *   HHI normalizado = (HHI - 1/N) / (1 - 1/N)  [0 = igualmente distribuido, 1 = monopolio]
 *   diversificationScore = (1 - HHI_norm) * 100
 *
 * Referencia: medida classica de concentracao de mercado adaptada para portfolio.
 */

import type { HealthInput, PortfolioResult, PortfolioSlice } from "./types";

export function computePortfolio(input: HealthInput): PortfolioResult {
  // Total investido = posicoes + contas de investimento
  const totalInvested =
    input.investmentPositionsValue + input.investmentAccountBalance;

  const byClass: PortfolioSlice[] = [];

  if (totalInvested <= 0 || input.investmentsByClass.length === 0) {
    return {
      totalInvested: 0,
      byClass: [],
      topConcentration: 0,
      herfindahlIndex: 0,
      diversificationScore: 0,
      isConcentrated: false,
    };
  }

  // Agrupar por classe (pode haver duplicatas vindas do input)
  const grouped = new Map<string, number>();
  for (const item of input.investmentsByClass) {
    grouped.set(item.assetClass, (grouped.get(item.assetClass) ?? 0) + item.value);
  }

  // Total real a partir dos dados agrupados (pode diferir de totalInvested
  // se investment accounts nao tiverem classe definida)
  const classTotal = Array.from(grouped.values()).reduce((s, v) => s + v, 0);
  const base = classTotal > 0 ? classTotal : totalInvested;

  for (const [assetClass, value] of grouped.entries()) {
    byClass.push({
      assetClass,
      value,
      percentage: (value / base) * 100,
    });
  }

  byClass.sort((a, b) => b.value - a.value);

  // HHI
  const n   = byClass.length;
  const hhi = byClass.reduce((sum, s) => sum + Math.pow(s.percentage / 100, 2), 0);

  // HHI normalizado [0,1]
  let hhiNorm = 0;
  if (n > 1) {
    hhiNorm = (hhi - 1 / n) / (1 - 1 / n);
  } else {
    hhiNorm = 1; // single asset = fully concentrated
  }
  hhiNorm = Math.max(0, Math.min(1, hhiNorm));

  const diversificationScore = (1 - hhiNorm) * 100;
  const topConcentration     = byClass[0]?.percentage ?? 0;

  return {
    totalInvested,
    byClass,
    topConcentration,
    herfindahlIndex: hhiNorm,
    diversificationScore,
    isConcentrated: topConcentration > 50,
  };
}
