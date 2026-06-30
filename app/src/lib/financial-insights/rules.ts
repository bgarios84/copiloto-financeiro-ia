/**
 * Financial Insights Engine — Regras
 * Sprint 11.3
 *
 * 10 regras determinísticas. Cada função recebe InsightInput e retorna
 * FinancialInsight | null (null = regra não disparada).
 *
 * Ordem no array ALL_RULES define prioridade de exibição
 * (danger > warning > success > info dentro de cada categoria).
 */

import type { FinancialInsight, InsightInput, InsightRule } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ── Regra 1: Patrimônio cresceu no mês ───────────────────────────────────────

const patrimonioCresce: InsightRule = ({ health }) => {
  const g = health.wealth.monthlyGrowthPct;
  if (g === null || g <= 0) return null;
  return {
    id:          "patrimonio_cresceu",
    title:       "Patrimônio em alta",
    description: `Seu patrimônio líquido cresceu ${pct(g)} em relação ao mês anterior.`,
    severity:    "success",
    category:    "patrimonio",
    metric:      pct(g),
    action:      "Continue mantendo o ritmo de poupança e investimentos.",
    icon:        "TrendingUp",
  };
};

// ── Regra 2: Patrimônio caiu no mês ──────────────────────────────────────────

const patrimonioCaiu: InsightRule = ({ health }) => {
  const g = health.wealth.monthlyGrowthPct;
  if (g === null || g >= -1) return null;             // ignora oscilações de até -1%
  const severe = g < -5;
  return {
    id:          "patrimonio_caiu",
    title:       severe ? "Queda significativa no patrimônio" : "Patrimônio recuou este mês",
    description: `Seu patrimônio líquido recuou ${Math.abs(g).toFixed(1)}% em relação ao mês anterior.`,
    severity:    severe ? "danger" : "warning",
    category:    "patrimonio",
    metric:      `${Math.abs(g).toFixed(1)}%`,
    action:      severe
      ? "Revise despesas e alocações para conter a queda."
      : "Acompanhe se a tendência persiste nos próximos meses.",
    icon:        "TrendingDown",
  };
};

// ── Regra 3: Taxa de poupança alta ────────────────────────────────────────────

const poupancaAlta: InsightRule = ({ health }) => {
  const sr = health.savings.savingsRate;
  if (sr < 20) return null;
  return {
    id:          "poupanca_alta",
    title:       "Excelente taxa de poupança",
    description: `Você está poupando ${sr.toFixed(1)}% da sua renda — acima da meta recomendada de 20%.`,
    severity:    "success",
    category:    "poupanca",
    metric:      `${sr.toFixed(1)}%`,
    action:      sr >= 30
      ? "Considere alocar o excedente em investimentos diversificados."
      : "Mantenha a disciplina e busque aumentar para 30%.",
    icon:        "PiggyBank",
  };
};

// ── Regra 4: Taxa de poupança baixa ──────────────────────────────────────────

const poupancaBaixa: InsightRule = ({ health }) => {
  const { savingsRate, monthlySurplus } = health.savings;
  if (health.cashFlow.monthlyIncome <= 0) return null;  // sem receita, regra irrelevante
  if (savingsRate >= 10) return null;
  const noSavings = savingsRate <= 0 || monthlySurplus <= 0;
  return {
    id:          "poupanca_baixa",
    title:       noSavings ? "Sem margem de poupança" : "Taxa de poupança abaixo do recomendado",
    description: noSavings
      ? "Suas despesas estão iguais ou maiores que sua renda este mês."
      : `Você está poupando apenas ${savingsRate.toFixed(1)}% da renda — meta mínima é 10%.`,
    severity:    noSavings ? "danger" : "warning",
    category:    "poupanca",
    metric:      `${savingsRate.toFixed(1)}%`,
    action:      "Revise categorias de gasto e identifique onde é possível economizar.",
    icon:        "AlertTriangle",
  };
};

// ── Regra 5: Reserva de emergência abaixo de 6 meses ────────────────────────

const reservaInsuficiente: InsightRule = ({ health }) => {
  const { status, monthsCovered, targetMonths } = health.emergencyReserve;
  if (status === "adequate" || status === "excess") return null;
  const critical = status === "insufficient";
  return {
    id:          "reserva_insuficiente",
    title:       critical ? "Reserva de emergência crítica" : "Reserva de emergência incompleta",
    description: critical
      ? `Você tem menos de 1 mês de despesas em liquidez imediata.`
      : `Você tem ${monthsCovered.toFixed(1)} meses cobertos — meta: ${targetMonths} meses.`,
    severity:    critical ? "danger" : "warning",
    category:    "reserva",
    metric:      `${monthsCovered.toFixed(1)} meses`,
    action:      "Priorize acumular liquidez em conta corrente ou poupança antes de outros investimentos.",
    icon:        "Shield",
  };
};

// ── Regra 6: Carteira concentrada demais ─────────────────────────────────────

const carteiraConcentrada: InsightRule = ({ health }) => {
  const { isConcentrated, topConcentration, byClass } = health.portfolio;
  if (!isConcentrated || byClass.length === 0) return null;
  const topClass = byClass[0];
  return {
    id:          "carteira_concentrada",
    title:       "Carteira concentrada",
    description: `${topClass?.assetClass ?? "Uma classe"} representa ${topConcentration.toFixed(0)}% do portfólio — risco de concentração elevado.`,
    severity:    "warning",
    category:    "investimentos",
    metric:      `${topConcentration.toFixed(0)}% em 1 classe`,
    action:      "Considere diversificar entre diferentes classes de ativos.",
    icon:        "PieChart",
  };
};

// ── Regra 7: Dividendos relevantes nos últimos 12 meses ──────────────────────

const dividendosRelevantes: InsightRule = ({ health }) => {
  const { annualPassiveIncome, monthlyPassiveIncome, incomeReplacementRate } = health.passiveIncome;
  if (annualPassiveIncome <= 0 || incomeReplacementRate < 5) return null;
  const great = incomeReplacementRate >= 25;
  return {
    id:          "dividendos_relevantes",
    title:       great ? "Renda passiva expressiva" : "Dividendos contribuindo para renda",
    description: great
      ? `Sua renda passiva cobre ${incomeReplacementRate.toFixed(0)}% das despesas mensais.`
      : `Você recebeu ${brl(annualPassiveIncome)} em dividendos nos últimos 12 meses.`,
    severity:    great ? "success" : "info",
    category:    "investimentos",
    metric:      `${brl(monthlyPassiveIncome)}/mês`,
    action:      great
      ? "Continue reinvestindo dividendos para acelerar a independência financeira."
      : "Reinvista os dividendos para potencializar o efeito dos juros compostos.",
    icon:        "Coins",
  };
};

// ── Regra 8: Cartão com uso alto ─────────────────────────────────────────────

const cartaoUsoAlto: InsightRule = ({ creditUsagePct }) => {
  if (creditUsagePct < 70) return null;
  const critical = creditUsagePct >= 90;
  return {
    id:          "cartao_uso_alto",
    title:       critical ? "Limite do cartão quase esgotado" : "Uso elevado do cartão",
    description: critical
      ? `Você está usando ${creditUsagePct.toFixed(0)}% do limite disponível nos cartões.`
      : `${creditUsagePct.toFixed(0)}% do limite de crédito já foi utilizado este mês.`,
    severity:    critical ? "danger" : "warning",
    category:    "credito",
    metric:      `${creditUsagePct.toFixed(0)}% do limite`,
    action:      "Evite comprometer mais de 30% do limite para não impactar o score de crédito.",
    icon:        "CreditCard",
  };
};

// ── Regra 9: Categoria com gasto acima da média ───────────────────────────────

const categoriaGastoAlto: InsightRule = ({ topExpenseCategory }) => {
  if (!topExpenseCategory || topExpenseCategory.totalPct < 40) return null;
  const { name, amount, totalPct } = topExpenseCategory;
  const critical = totalPct >= 60;
  return {
    id:          "categoria_gasto_alto",
    title:       `Alta concentração em "${name}"`,
    description: `A categoria "${name}" representa ${totalPct.toFixed(0)}% das despesas deste mês (${brl(amount)}).`,
    severity:    critical ? "warning" : "info",
    category:    "fluxo",
    metric:      `${totalPct.toFixed(0)}% do total`,
    action:      "Verifique se é possível reduzir ou diluir este gasto ao longo do mês.",
    icon:        "BarChart3",
  };
};

// ── Regra 10: Meta FIRE avançando ────────────────────────────────────────────

const fireAvancando: InsightRule = ({ health }) => {
  const { progressPct, fireTarget, fiLevel } = health.fireProgress;
  if (progressPct <= 0 || fireTarget <= 0) return null;
  const great = progressPct >= 50;
  return {
    id:          "fire_avancando",
    title:       great ? "Na metade do caminho para o FIRE" : "Progresso rumo à independência financeira",
    description: great
      ? `Você atingiu ${progressPct.toFixed(0)}% da meta FIRE de ${brl(fireTarget)}.`
      : `Seu patrimônio equivale a ${progressPct.toFixed(0)}% da meta FIRE necessária.`,
    severity:    great ? "success" : "info",
    category:    "fire",
    metric:      `${progressPct.toFixed(0)}% da meta`,
    action:      fiLevel === "fi" || fiLevel === "fire"
      ? "Continue com a estratégia atual — você está muito próximo da independência financeira."
      : "Aumente a taxa de poupança e os aportes para acelerar o progresso.",
    icon:        "Flame",
  };
};

// ── Todas as regras ───────────────────────────────────────────────────────────

export const ALL_RULES: InsightRule[] = [
  patrimonioCresce,
  patrimonioCaiu,
  poupancaAlta,
  poupancaBaixa,
  reservaInsuficiente,
  carteiraConcentrada,
  dividendosRelevantes,
  cartaoUsoAlto,
  categoriaGastoAlto,
  fireAvancando,
];
