/**
 * Rules — Radar Financeiro
 * Sprint 8.2
 *
 * Cada função segue a assinatura RadarRule = (input: RadarInput) => RadarInsight | null.
 * Funções puras — sem I/O, sem efeitos colaterais.
 *
 * Como adicionar uma nova regra:
 *   1. Crie e exporte uma função com assinatura RadarRule neste arquivo.
 *   2. Adicione-a ao array ALL_RULES no final.
 *   O radar service (src/services/radar.ts) a executará automaticamente.
 */

import { B3_QUOTED_CLASSES }            from "@/types/b3-market";
import type { RadarRule, RadarInsight } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style:                 "currency",
    currency:              "BRL",
    maximumFractionDigits: 0,
  });
}

function effectiveBRL(
  pos: {
    asset_class:   string;
    ticker:        string | null;
    quantity:      number | null;
    current_value: number | null;
    current_price: number | null;
    currency:      string;
  },
  b3:  Record<string, number>,
  fx:  Record<string, number>,
): number {
  const B3 = B3_QUOTED_CLASSES as readonly string[];
  if (B3.includes(pos.asset_class) && pos.ticker && b3[pos.ticker]) {
    if (pos.quantity !== null) return pos.quantity * b3[pos.ticker];
  }
  const raw =
    pos.current_value ??
    (pos.quantity !== null && pos.current_price !== null
      ? pos.quantity * pos.current_price
      : 0);
  return raw * (fx[pos.currency] ?? 1);
}

// ── Regra 1: categoria de orçamento com uso >= 90% e < 100% ──────────────────

export const ruleOverBudget90: RadarRule = ({ budgetComparisons }) => {
  const offenders = budgetComparisons.filter(
    b =>
      b.planned_amount !== null &&
      (b.usage_percentage ?? 0) >= 90 &&
      (b.usage_percentage ?? 0) < 100,
  );
  if (offenders.length === 0) return null;

  const worst = offenders.reduce((a, b) =>
    (b.usage_percentage ?? 0) > (a.usage_percentage ?? 0) ? b : a,
  );

  return {
    id:          "budget-near-limit",
    severity:    "warning",
    category:    "warning",
    icon:        "AlertTriangle",
    title:       `Orçamento "${worst.category_name}" quase no limite`,
    description: `${(worst.usage_percentage ?? 0).toFixed(0)}% do orçamento utilizado — ${fmtBRL(worst.actual_amount)} de ${fmtBRL(worst.planned_amount!)}.`,
    action:      "Revise as despesas nesta categoria para não exceder o orçamento.",
  };
};

// ── Regra 2: categoria de orçamento com uso >= 100% ──────────────────────────

export const ruleOverBudget100: RadarRule = ({ budgetComparisons }) => {
  const offenders = budgetComparisons.filter(
    b => b.planned_amount !== null && (b.usage_percentage ?? 0) >= 100,
  );
  if (offenders.length === 0) return null;

  const worst = offenders.reduce((a, b) =>
    (b.usage_percentage ?? 0) > (a.usage_percentage ?? 0) ? b : a,
  );

  return {
    id:          "budget-exceeded",
    severity:    "danger",
    category:    "danger",
    icon:        "AlertCircle",
    title:       `Orçamento "${worst.category_name}" excedido`,
    description: `${(worst.usage_percentage ?? 0).toFixed(0)}% do orçamento utilizado — gasto de ${fmtBRL(worst.actual_amount)} vs planejado de ${fmtBRL(worst.planned_amount!)}.`,
    action:      "Reduza gastos nesta categoria imediatamente.",
  };
};

// ── Regra 3: resultado mensal positivo (patrimônio cresceu) ───────────────────

export const rulePatrimonioUp: RadarRule = ({ cashFlow }) => {
  if (cashFlow.length < 1) return null;
  const last = cashFlow[cashFlow.length - 1];
  if (!last || last.net_result <= 0) return null;

  return {
    id:          "patrimonio-up",
    severity:    "success",
    category:    "success",
    icon:        "TrendingUp",
    title:       "Resultado positivo no período",
    description: `Saldo líquido de ${fmtBRL(last.net_result)} — suas finanças estão em crescimento.`,
    action:      "Continue aportando na sua carteira de investimentos.",
  };
};

// ── Regra 4: resultado mensal negativo (patrimônio diminuiu) ──────────────────

export const rulePatrimonioDown: RadarRule = ({ cashFlow }) => {
  if (cashFlow.length < 1) return null;
  const last = cashFlow[cashFlow.length - 1];
  if (!last || last.net_result >= 0) return null;

  return {
    id:          "patrimonio-down",
    severity:    "warning",
    category:    "warning",
    icon:        "TrendingDown",
    title:       "Resultado negativo no período",
    description: `Déficit de ${fmtBRL(Math.abs(last.net_result))} — despesas superaram receitas.`,
    action:      "Revise suas despesas e identifique cortes possíveis.",
  };
};

// ── Regra 5: investimento individual representa > 20% da carteira ─────────────

export const ruleConcentration: RadarRule = ({ investments, b3QuoteMap, fxRateMap }) => {
  if (investments.length === 0) return null;

  const values = investments.map(p => ({ pos: p, brl: effectiveBRL(p, b3QuoteMap, fxRateMap) }));
  const total  = values.reduce((s, { brl }) => s + brl, 0);
  if (total === 0) return null;

  const concentrated = values
    .map(({ pos, brl }) => ({ pos, pct: (brl / total) * 100 }))
    .filter(({ pct }) => pct > 20)
    .sort((a, b) => b.pct - a.pct);

  if (concentrated.length === 0) return null;

  const top  = concentrated[0];
  const name = top.pos.ticker ?? top.pos.asset_name;

  return {
    id:          "concentration-risk",
    severity:    "warning",
    category:    "warning",
    icon:        "PieChart",
    title:       `Concentração elevada em ${name}`,
    description: `${name} representa ${top.pct.toFixed(1)}% dos investimentos — acima do limite recomendado de 20%.`,
    action:      "Considere diversificar a carteira para reduzir o risco de concentração.",
  };
};

// ── Regra 6: conta com saldo negativo ─────────────────────────────────────────

export const ruleNegativeBalance: RadarRule = ({ accounts }) => {
  const negative = accounts.filter(a => a.balance < 0 && !a.deleted_at);
  if (negative.length === 0) return null;

  const worst = negative.reduce((a, b) => (b.balance < a.balance ? b : a));

  return {
    id:          "negative-balance",
    severity:    "danger",
    category:    "danger",
    icon:        "AlertCircle",
    title:       `Saldo negativo em "${worst.name}"`,
    description: `Conta com saldo de ${fmtBRL(worst.balance)}.${negative.length > 1 ? ` ${negative.length} contas no negativo.` : ""}`,
    action:      "Transfira fundos para cobrir o saldo negativo e evitar encargos.",
  };
};

// ── Regra 7: cartão com utilização > 80% ──────────────────────────────────────

export const ruleHighCreditUsage: RadarRule = ({ cards }) => {
  const high = cards.filter(c => {
    if (c.credit_limit <= 0 || c.deleted_at) return false;
    return ((c.credit_limit - c.available_limit) / c.credit_limit) * 100 > 80;
  });
  if (high.length === 0) return null;

  const worst = high.reduce((a, b) => {
    const pA = (a.credit_limit - a.available_limit) / a.credit_limit;
    const pB = (b.credit_limit - b.available_limit) / b.credit_limit;
    return pB > pA ? b : a;
  });
  const usedPct = ((worst.credit_limit - worst.available_limit) / worst.credit_limit) * 100;

  return {
    id:          "high-credit-usage",
    severity:    "warning",
    category:    "warning",
    icon:        "CreditCard",
    title:       `Cartão "${worst.name}" com alta utilização`,
    description: `${usedPct.toFixed(0)}% do limite utilizado. Utilização elevada pode afetar seu score de crédito.`,
    action:      "Quite parte da fatura para reduzir a utilização abaixo de 30%.",
  };
};

// ── Regra 8: ativo B3 sem cotação atualizada ──────────────────────────────────

export const ruleMissingB3Quote: RadarRule = ({ investments, b3QuoteMap }) => {
  const B3 = B3_QUOTED_CLASSES as readonly string[];
  const missing = investments
    .filter(p => B3.includes(p.asset_class) && p.ticker && !b3QuoteMap[p.ticker])
    .map(p => p.ticker!);

  if (missing.length === 0) return null;

  const preview =
    missing.slice(0, 4).join(", ") +
    (missing.length > 4 ? ` e +${missing.length - 4}` : "");

  return {
    id:          "missing-b3-quote",
    severity:    "info",
    category:    "info",
    icon:        "BarChart3",
    title:       "Ativos sem cotação B3 atualizada",
    description: `${preview}. Os valores exibidos podem estar desatualizados.`,
    action:      "Acesse a página de admin para atualizar as cotações B3.",
  };
};

// ── Regra 9: moeda sem taxa de câmbio ─────────────────────────────────────────

export const ruleMissingFxRate: RadarRule = ({ investments, manualAssets, fxRateMap }) => {
  const allCur = new Set([
    ...investments.map(p => p.currency),
    ...manualAssets.map(a => a.currency),
  ]);
  const missing = [...allCur].filter(c => c !== "BRL" && !fxRateMap[c]);
  if (missing.length === 0) return null;

  return {
    id:          "missing-fx-rate",
    severity:    "info",
    category:    "info",
    icon:        "Globe2",
    title:       "Moedas sem cotação de câmbio",
    description: `${missing.join(", ")} sem taxa FX — valores convertidos em 1:1 com BRL.`,
    action:      "Atualize as taxas de câmbio para obter valores precisos em BRL.",
  };
};

// ── Regra 10: dividendo previsto nos próximos 15 dias ─────────────────────────

export const ruleUpcomingDividend: RadarRule = ({ investments, dividendMap }) => {
  const today  = new Date();
  const in15   = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
  const isoNow = today.toISOString().slice(0, 10);
  const iso15  = in15.toISOString().slice(0, 10);

  const upcoming = investments.filter(p => {
    if (!p.ticker) return false;
    const ds = dividendMap[p.ticker];
    if (!ds?.nextEvent?.payment_date) return false;
    const pd = ds.nextEvent.payment_date;
    return pd >= isoNow && pd <= iso15;
  });

  if (upcoming.length === 0) return null;

  const first   = upcoming[0];
  const ds      = dividendMap[first.ticker!]!;
  const total   = ds.nextEvent!.amount_per_share * (first.quantity ?? 0);
  const dateStr = new Date(ds.nextEvent!.payment_date + "T12:00:00").toLocaleDateString("pt-BR");

  return {
    id:          "upcoming-dividend",
    severity:    "success",
    category:    "success",
    icon:        "Coins",
    title:       `Dividendo de ${first.ticker} em breve`,
    description: `Pagamento previsto para ${dateStr}${total > 0 ? ` — estimado ${fmtBRL(total)}` : ""}.`,
    action:      "Verifique se sua posição está registrada antes da data ex.",
  };
};

// ── Regra 11: nenhum aporte registrado no mês ─────────────────────────────────

export const ruleNoInvestmentThisMonth: RadarRule = ({ investments, hasTradeThisMonth }) => {
  if (investments.length === 0) return null;  // sem carteira, não se aplica
  if (hasTradeThisMonth) return null;

  return {
    id:          "no-investment-this-month",
    severity:    "info",
    category:    "info",
    icon:        "TrendingUp",
    title:       "Nenhum aporte registrado no mês",
    description: "Você ainda não registrou nenhuma compra ou aporte em investimentos este mês.",
    action:      "Considere realizar um aporte regular para manter a disciplina de investimento.",
  };
};

// ── Regra 12: reserva de emergência inferior a 6 meses ───────────────────────

export const ruleEmergencyFund: RadarRule = ({ summary }) => {
  if (!summary) return null;
  const { total_balance, monthly_expense } = summary;
  if (monthly_expense <= 0) return null;

  const months = total_balance / monthly_expense;
  if (months >= 6) return null;

  return {
    id:          "emergency-fund",
    severity:    months < 3 ? "danger" : "warning",
    category:    months < 3 ? "danger" : "warning",
    icon:        "ShieldCheck",
    title:       "Reserva de emergência insuficiente",
    description: `Saldo cobre apenas ${months.toFixed(1)} meses de despesas. O recomendado é ao menos 6 meses.`,
    action:      "Priorize a construção da reserva de emergência antes de novos investimentos.",
  };
};

// ── Array com todas as regras registradas ─────────────────────────────────────

/**
 * Todas as regras ativas do Radar Financeiro.
 * Para adicionar uma nova regra: crie a função acima e insira-a aqui.
 * O radar service a executará automaticamente.
 */
export const ALL_RULES: RadarRule[] = [
  ruleOverBudget100,
  ruleOverBudget90,
  ruleNegativeBalance,
  ruleHighCreditUsage,
  ruleEmergencyFund,
  ruleConcentration,
  rulePatrimonioDown,
  rulePatrimonioUp,
  ruleUpcomingDividend,
  ruleNoInvestmentThisMonth,
  ruleMissingB3Quote,
  ruleMissingFxRate,
];
