/**
 * Service — Financial Health
 * Sprint 11.2
 *
 * Mapeia DashboardData → HealthInput e chama o engine para retornar HealthSnapshot.
 * Funcao pura — zero queries ao banco (reutiliza dados ja buscados pelo getDashboardData).
 */

import { computeHealthSnapshot } from "@/lib/financial-health";
import type { HealthInput, HealthSnapshot } from "@/lib/financial-health";
import type { DashboardData } from "@/types/dashboard";
import type { InvestmentPosition } from "@/types/investment";
import type { ServiceResult } from "@/types/common";
import { B3_QUOTED_CLASSES } from "@/types/b3-market";
import type { B3QuoteMap } from "@/types/b3-market";
import type { FxRateMap } from "@/types/fx-rate";

// ── Helpers ───────────────────────────────────────────────────────────────────

function effectivePrice(pos: InvestmentPosition, b3QuoteMap: B3QuoteMap): number {
  if (
    pos.ticker &&
    (B3_QUOTED_CLASSES as readonly string[]).includes(pos.asset_class) &&
    b3QuoteMap[pos.ticker]
  ) {
    return b3QuoteMap[pos.ticker];
  }
  return pos.current_price ?? pos.average_price ?? 0;
}

function toBRL(value: number, currency: string, fxRateMap: FxRateMap): number {
  if (currency === "BRL") return value;
  return value * (fxRateMap[currency] ?? 1);
}

function positionValueBRL(pos: InvestmentPosition, b3QuoteMap: B3QuoteMap, fxRateMap: FxRateMap): number {
  const price    = effectivePrice(pos, b3QuoteMap);
  const quantity = pos.quantity ?? 1;
  return toBRL(price * quantity, pos.currency, fxRateMap);
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function buildHealthInput(data: DashboardData): HealthInput {
  const { summary, cashFlow, patrimonio } = data;
  const { investments, manualAssets, b3QuoteMap, fxRateMap, dividendMap } = patrimonio;

  // ── Valores de investimento em BRL ─────────────────────────────────────────
  const investmentPositionsValue = investments.reduce(
    (sum, pos) => sum + positionValueBRL(pos, b3QuoteMap, fxRateMap),
    0,
  );

  // ── Ativos manuais em BRL ──────────────────────────────────────────────────
  const manualAssetsValue = manualAssets.reduce(
    (sum, a) => sum + toBRL(a.current_value, a.currency, fxRateMap),
    0,
  );

  // ── Investimentos por classe (para concentracao/diversificacao) ────────────
  const byClassMap: Record<string, number> = {};
  for (const pos of investments) {
    const v = positionValueBRL(pos, b3QuoteMap, fxRateMap);
    byClassMap[pos.asset_class] = (byClassMap[pos.asset_class] ?? 0) + v;
  }
  const investmentsByClass = Object.entries(byClassMap).map(
    ([assetClass, value]) => ({ assetClass, value }),
  );

  // ── Dividendos recebidos nos ultimos 12 meses (estimativa) ─────────────────
  // Usa totalPerShare12m do dividendMap × quantidade de cada posicao
  const dividendsLast12m = investments.reduce((sum, pos) => {
    const divSummary = dividendMap[pos.ticker ?? ""];
    if (!divSummary || !pos.quantity) return sum;
    return sum + divSummary.totalPerShare12m * pos.quantity;
  }, 0);

  return {
    // total_balance da view inclui todas as contas bancarias do usuario
    liquidBalance:            summary?.total_balance ?? 0,
    // posicoes de corretora sao cobertas por investmentPositionsValue
    investmentAccountBalance: 0,
    investmentPositionsValue,
    manualAssetsValue,
    creditCardDebt:           summary?.total_credit_used ?? 0,
    monthlyIncome:            summary?.monthly_income ?? 0,
    monthlyExpense:           summary?.monthly_expense ?? 0,
    cashFlowHistory:          cashFlow.map((m) => ({
      month:   m.month,
      income:  m.total_income,
      expense: m.total_expense,
    })),
    investmentsByClass,
    dividendsLast12m,
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function computeHealthFromDashboard(
  data: DashboardData,
): ServiceResult<HealthSnapshot> {
  try {
    const input    = buildHealthInput(data);
    const snapshot = computeHealthSnapshot(input);
    return { data: snapshot, error: null };
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Erro ao calcular saude financeira.",
    };
  }
}
