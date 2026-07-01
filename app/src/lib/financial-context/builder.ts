/**
 * Financial Context Engine — Builder
 * Sprint 12.1
 *
 * buildFinancialContext() é uma função pura que recebe todos os dados já
 * calculados (HealthSnapshot, Insights, Alerts, OF connections, DashboardData)
 * e monta o FinancialContext pronto para consumo pelo LLM.
 *
 * Zero I/O, zero queries ao banco — só transformação de dados.
 */

import type { HealthSnapshot }      from "@/lib/financial-health";
import type { FinancialInsight }    from "@/lib/financial-insights";
import type { InternalAlert }       from "@/services/alerts";
import type { OpenFinanceConnection } from "@/types/open-finance";
import type { DashboardData }       from "@/types/dashboard";

import type {
  FinancialContext,
  FinancialSummaryContext,
  HealthContext,
  InsightContext,
  AlertContext,
  OpenFinanceContext,
  InvestmentContext,
  CashFlowContext,
  FireContext,
  TextualSummaryContext,
  AllocationSliceContext,
} from "./types.ts";

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ── Sub-builders ──────────────────────────────────────────────────────────────

function buildSummary(health: HealthSnapshot): FinancialSummaryContext {
  const { wealth, cashFlow } = health;
  return {
    totalAssets:      wealth.totalAssets,
    netWorth:         wealth.netWorth,
    liquidCash:       health.emergencyReserve.liquidBalance,
    totalInvestments: health.portfolio.totalInvested,
    totalDebt:        wealth.totalLiabilities,
    monthlyGrowthPct: wealth.monthlyGrowthPct,
  };
}

function buildHealth(health: HealthSnapshot): HealthContext {
  const { score, emergencyReserve, savings, portfolio, passiveIncome, wealth } = health;

  const creditDebtRatio = wealth.netWorth > 0
    ? (wealth.totalLiabilities / wealth.netWorth) * 100
    : 0;

  return {
    score:      score.score,
    grade:      score.grade,
    components: {
      savingsRate:           savings.savingsRate,
      emergencyMonths:       emergencyReserve.monthsCovered,
      emergencyStatus:       emergencyReserve.status,
      creditDebtRatio,
      diversificationScore:  portfolio.diversificationScore,
      incomeReplacementRate: passiveIncome.incomeReplacementRate,
    },
    strengths:  score.strengths,
    weaknesses: score.weaknesses,
  };
}

function buildInsights(insights: FinancialInsight[]): InsightContext[] {
  return insights.map(i => ({
    id:          i.id,
    title:       i.title,
    description: i.description,
    severity:    i.severity,
    category:    i.category,
    metric:      i.metric,
  }));
}

function buildAlerts(alerts: InternalAlert[]): AlertContext[] {
  return alerts.map(a => ({
    id:          a.id,
    title:       a.title,
    description: a.description,
    severity:    a.severity,
  }));
}

function buildOpenFinance(connections: OpenFinanceConnection[]): OpenFinanceContext {
  const active       = connections.filter(c => c.status === "connected");
  const problematic  = connections.filter(c => c.status === "error" || c.status === "expired");

  // Última sync entre todas as conexões conectadas
  const syncDates = active
    .map(c => c.last_synced_at)
    .filter((d): d is string => d !== null)
    .map(d => new Date(d).getTime());
  const lastSyncedAt = syncDates.length > 0
    ? new Date(Math.max(...syncDates)).toISOString()
    : null;

  return {
    activeConnections: active.length,
    problematicCount:  problematic.length,
    lastSyncedAt,
    connections: connections.map(c => ({
      institutionId: c.institution_id,
      status:        c.status,
      lastSyncedAt:  c.last_synced_at,
    })),
  };
}

function buildInvestments(health: HealthSnapshot, data: DashboardData): InvestmentContext {
  const { portfolio } = health;
  const top = portfolio.byClass[0] ?? null;

  // Exposição cambial a partir dos ativos manuais e posições
  const fxMap = data.patrimonio.fxRateMap;
  const currencyRaw: Record<string, number> = {};

  // contas (assumido BRL)
  const liquidBRL = health.emergencyReserve.liquidBalance;
  if (liquidBRL > 0) {
    currencyRaw["BRL"] = (currencyRaw["BRL"] ?? 0) + liquidBRL;
  }

  // posições de investimento
  for (const pos of data.patrimonio.investments) {
    const cur = pos.currency ?? "BRL";
    const raw = pos.current_value ?? (
      pos.quantity !== null && pos.current_price !== null
        ? pos.quantity * pos.current_price
        : 0
    );
    const brl = cur === "BRL" ? raw : raw * (fxMap[cur] ?? 1);
    currencyRaw[cur] = (currencyRaw[cur] ?? 0) + brl;
  }

  // ativos manuais
  for (const a of data.patrimonio.manualAssets) {
    const cur = a.currency ?? "BRL";
    const brl = cur === "BRL" ? a.current_value : a.current_value * (fxMap[cur] ?? 1);
    currencyRaw[cur] = (currencyRaw[cur] ?? 0) + brl;
  }

  const totalCurrency = Object.values(currencyRaw).reduce((s, v) => s + v, 0);
  const currencyExposure: Record<string, number> = {};
  for (const [cur, val] of Object.entries(currencyRaw)) {
    currencyExposure[cur] = totalCurrency > 0 ? (val / totalCurrency) * 100 : 0;
  }

  const allocation: AllocationSliceContext[] = portfolio.byClass.map(s => ({
    assetClass:  s.assetClass,
    valueBRL:    s.value,
    percentage:  s.percentage,
  }));

  return {
    totalValue:           portfolio.totalInvested,
    allocation,
    isConcentrated:       portfolio.isConcentrated,
    topAssetClass:        top?.assetClass ?? null,
    topAssetClassPct:     top?.percentage ?? 0,
    diversificationScore: portfolio.diversificationScore,
    currencyExposure,
  };
}

function buildCashFlow(health: HealthSnapshot): CashFlowContext {
  const { cashFlow, savings } = health;

  let trend: CashFlowContext["trend"] = "unknown";
  if (cashFlow.trend === "improving")    trend = "growing";
  else if (cashFlow.trend === "stable")  trend = "stable";
  else if (cashFlow.trend === "deteriorating") trend = "declining";

  return {
    monthlyIncome:  cashFlow.monthlyIncome,
    monthlyExpense: cashFlow.monthlyExpense,
    monthlySavings: savings.monthlySurplus,
    savingsRate:    savings.savingsRate,
    trend,
  };
}

function buildFire(health: HealthSnapshot): FireContext {
  const { fireProgress } = health;

  // Estimar ano de FIRE baseado em progressPct e crescimento mensal
  let estimatedFireYear: number | null = null;
  const growthPct = health.wealth.monthlyGrowthPct;
  if (
    fireProgress.fireTarget > 0 &&
    fireProgress.progressPct < 100 &&
    growthPct !== null &&
    growthPct > 0
  ) {
    const remaining  = fireProgress.remainingToFire;
    const netWorth   = health.wealth.netWorth;
    // meses aproximados: ln(target/current) / ln(1 + growthRate)
    const monthlyRate = growthPct / 100;
    if (netWorth > 0 && monthlyRate > 0) {
      const months = Math.log(fireProgress.fireTarget / netWorth) / Math.log(1 + monthlyRate);
      if (isFinite(months) && months > 0 && months < 600) {
        estimatedFireYear = new Date().getFullYear() + Math.ceil(months / 12);
      }
    }
  } else if (fireProgress.progressPct >= 100) {
    estimatedFireYear = new Date().getFullYear();
  }

  return {
    fireTarget:        fireProgress.fireTarget,
    progressPct:       fireProgress.progressPct,
    remainingToFire:   fireProgress.remainingToFire,
    fiLevel:           fireProgress.fiLevel,
    fiScore:           fireProgress.fiScore,
    estimatedFireYear,
  };
}

// ── Gerador de texto resumido ─────────────────────────────────────────────────

function buildTextual(
  summary:    FinancialSummaryContext,
  health:     HealthContext,
  alerts:     AlertContext[],
  investments: InvestmentContext,
  fire:       FireContext,
  cashFlow:   CashFlowContext,
): TextualSummaryContext {
  const lines: string[] = [];

  // Patrimônio
  lines.push(
    `O usuário possui patrimônio líquido de ${fmtBRL(summary.netWorth)}, com ${fmtBRL(summary.liquidCash)} em caixa e ${fmtBRL(summary.totalInvestments)} investidos.`
  );

  // Crescimento
  if (summary.monthlyGrowthPct !== null) {
    const dir = summary.monthlyGrowthPct >= 0 ? "cresceu" : "caiu";
    lines.push(`O patrimônio ${dir} ${fmtPct(Math.abs(summary.monthlyGrowthPct))} no último mês.`);
  }

  // Saúde financeira
  lines.push(
    `Seu Health Score é ${health.score}/100 (nota ${health.grade}).`
  );

  // Fluxo
  lines.push(
    `Receita mensal: ${fmtBRL(cashFlow.monthlyIncome)}. Despesa mensal: ${fmtBRL(cashFlow.monthlyExpense)}. Taxa de poupança: ${fmtPct(cashFlow.savingsRate)}.`
  );

  // Alertas
  const dangerAlerts = alerts.filter(a => a.severity === "danger");
  if (alerts.length > 0) {
    lines.push(
      `Existem ${alerts.length} ${alerts.length === 1 ? "alerta" : "alertas"} ativos` +
      (dangerAlerts.length > 0 ? `, sendo ${dangerAlerts.length} crítico${dangerAlerts.length > 1 ? "s" : ""}` : "") +
      "."
    );
  }

  // Investimentos
  if (investments.totalValue > 0) {
    if (investments.isConcentrated && investments.topAssetClass) {
      lines.push(
        `A carteira está concentrada em ${investments.topAssetClass} (${fmtPct(investments.topAssetClassPct, 0)}). Score de diversificação: ${investments.diversificationScore.toFixed(0)}/100.`
      );
    } else {
      lines.push(`Score de diversificação da carteira: ${investments.diversificationScore.toFixed(0)}/100.`);
    }
  }

  // FIRE
  if (fire.fireTarget > 0) {
    const fireStr = fire.estimatedFireYear
      ? `prevista para ${fire.estimatedFireYear}`
      : "ainda não estimada com dados atuais";
    lines.push(
      `Progresso FIRE: ${fmtPct(fire.progressPct, 0)} (${fmtBRL(fire.remainingToFire)} restantes). Meta ${fireStr}.`
    );
  }

  return { paragraphPT: lines.join(" ") };
}

// ── Entry point ───────────────────────────────────────────────────────────────

export interface BuildContextInput {
  health:      HealthSnapshot;
  insights:    FinancialInsight[];
  alerts:      InternalAlert[];
  connections: OpenFinanceConnection[];
  data:        DashboardData;
}

export function buildFinancialContext(input: BuildContextInput): FinancialContext {
  const { health, insights, alerts, connections, data } = input;

  const summary     = buildSummary(health);
  const healthCtx   = buildHealth(health);
  const insightsCtx = buildInsights(insights);
  const alertsCtx   = buildAlerts(alerts);
  const ofCtx       = buildOpenFinance(connections);
  const investCtx   = buildInvestments(health, data);
  const cashFlowCtx = buildCashFlow(health);
  const fireCtx     = buildFire(health);
  const textual     = buildTextual(summary, healthCtx, alertsCtx, investCtx, fireCtx, cashFlowCtx);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    health:      healthCtx,
    insights:    insightsCtx,
    alerts:      alertsCtx,
    openFinance: ofCtx,
    investments: investCtx,
    cashFlow:    cashFlowCtx,
    fire:        fireCtx,
    textual,
  };
}
