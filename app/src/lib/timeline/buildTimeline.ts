/**
 * buildTimeline — Providers da Timeline Financeira
 * Sprint 8.3
 *
 * Cada provider é uma função pura que converte dados brutos em TimelineEvent[].
 *
 * Para adicionar um novo provider:
 *   1. Crie uma função `from*()` neste arquivo.
 *   2. Chame-a no service (src/services/timeline.ts) e passe ao buildTimeline().
 *   Zero mudanças em outros arquivos.
 */

import type { TimelineEvent, TimelineCategory } from "./types";
import { TIMELINE_CATEGORY_COLORS }             from "./types";
import type { Transaction }        from "@/types/transaction";
import type { InvestmentTrade }    from "@/types/investment-trade";
import type { B3DividendEvent }    from "@/types/b3-dividend";
import type { ManualAsset }        from "@/types/manual-asset";
import type { FinancialAccount }   from "@/types/financial-account";
import type { CreditCard }         from "@/types/credit-card";
import type { BudgetComparison }   from "@/types/budget";
import type { B3Quote }            from "@/types/b3-market";

// ── Tipos internos ────────────────────────────────────────────────────────────

/** InvestmentTrade enriquecido com dados da posição (via join) */
export interface TradeWithPosition extends InvestmentTrade {
  investment_position: { ticker: string | null; asset_name: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 2,
  });
}

function color(cat: TimelineCategory): string {
  return TIMELINE_CATEGORY_COLORS[cat];
}

// ── Provider 1: Transações ────────────────────────────────────────────────────

export function fromTransactions(txns: Transaction[]): TimelineEvent[] {
  return txns.map(t => {
    const isIncome   = t.type === "income";
    const isTransfer = t.type === "transfer";
    const icon  = isIncome ? "ArrowDownLeft" : isTransfer ? "ArrowLeftRight" : "ArrowUpRight";
    const label = isIncome ? "Receita" : isTransfer ? "Transferência" : "Despesa";
    const cat   = (t.category?.name ?? "").toLowerCase();
    return {
      id:          `txn-${t.id}`,
      date:        t.date,
      title:       t.description || label,
      description: [
        `${label} de ${fmtBRL(t.amount)}`,
        t.category?.name ? `em ${t.category.name}` : null,
        t.account?.name  ? `via ${t.account.name}`  : null,
        t.card?.name     ? `no ${t.card.name}`       : null,
      ].filter(Boolean).join(" "),
      icon,
      color:    color("finance"),
      category: "finance" as TimelineCategory,
      metadata: {
        amount:        t.amount,
        currency:      t.currency,
        type:          t.type,
        category_name: t.category?.name ?? null,
        account_name:  t.account?.name  ?? null,
        card_name:     t.card?.name     ?? null,
        status:        t.status,
      },
    };
  });
}

// ── Provider 2: Operações de Investimento ─────────────────────────────────────

const TRADE_ICONS: Record<string, string> = {
  buy:          "TrendingUp",
  sell:         "TrendingDown",
  dividend:     "Coins",
  amortization: "Minus",
  split:        "GitFork",
  reverse_split:"GitMerge",
  bonus:        "Gift",
};

const TRADE_LABELS: Record<string, string> = {
  buy:          "Compra",
  sell:         "Venda",
  dividend:     "Dividendo",
  amortization: "Amortização",
  split:        "Desdobramento",
  reverse_split:"Grupamento",
  bonus:        "Bonificação",
};

export function fromTrades(trades: TradeWithPosition[]): TimelineEvent[] {
  return trades.map(t => {
    const ticker    = t.investment_position?.ticker    ?? null;
    const assetName = t.investment_position?.asset_name ?? "Ativo";
    const name      = ticker ?? assetName;
    const label     = TRADE_LABELS[t.trade_type] ?? t.trade_type;
    const cat: TimelineCategory = t.trade_type === "dividend" ? "dividend" : "investment";

    const parts: string[] = [`${label} de ${name}`];
    if (t.quantity !== null) parts.push(`${t.quantity} cotas`);
    if (t.unit_price !== null && t.quantity !== null) parts.push(`a ${fmtBRL(t.unit_price)}`);
    if (t.total_amount !== null) parts.push(`= ${fmtBRL(t.total_amount)}`);

    return {
      id:          `trade-${t.id}`,
      date:        t.trade_date,
      title:       `${label}: ${name}`,
      description: parts.join(" · "),
      icon:        TRADE_ICONS[t.trade_type] ?? "Activity",
      color:       color(cat),
      category:    cat,
      metadata: {
        ticker,
        asset_name:   assetName,
        trade_type:   t.trade_type,
        quantity:     t.quantity,
        unit_price:   t.unit_price,
        total_amount: t.total_amount,
        currency:     t.currency,
        fee:          t.fee,
        tax:          t.tax,
      },
    };
  });
}

// ── Provider 3: Eventos de Dividendos B3 ──────────────────────────────────────

/**
 * @param positionQtyMap  ticker → quantidade em carteira (para calcular valor total)
 */
export function fromDividendEvents(
  events: B3DividendEvent[],
  positionQtyMap: Record<string, number>,
): TimelineEvent[] {
  return events
    .filter(e => e.payment_date !== null)
    .map(e => {
      const qty    = positionQtyMap[e.ticker] ?? 0;
      const total  = e.amount_per_share * qty;
      const label  = e.event_type === "jcp" ? "JCP" :
                     e.event_type === "amortization" ? "Amortização" :
                     e.event_type === "income" ? "Rendimento" : "Dividendo";

      return {
        id:          `div-${e.id}`,
        date:        e.payment_date!,
        title:       `${label}: ${e.ticker}`,
        description: [
          `${fmtBRL(e.amount_per_share)} por cota`,
          qty > 0 ? `— total estimado ${fmtBRL(total)}` : null,
        ].filter(Boolean).join(" "),
        icon:        "Coins",
        color:       color("dividend"),
        category:    "dividend" as TimelineCategory,
        metadata: {
          ticker:           e.ticker,
          event_type:       e.event_type,
          amount_per_share: e.amount_per_share,
          quantity:         qty,
          total_brl:        total,
          ex_date:          e.ex_date,
          payment_date:     e.payment_date,
        },
      };
    });
}

// ── Provider 4: Ativos Manuais ────────────────────────────────────────────────

const ASSET_TYPE_ICONS: Record<string, string> = {
  cash: "Banknote", real_estate: "Home", vehicle: "Car",
  fixed_income: "Landmark", stock: "TrendingUp", fii: "Building2",
  crypto: "Bitcoin", other: "Package",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  cash: "Dinheiro", real_estate: "Imóvel", vehicle: "Veículo",
  fixed_income: "Renda Fixa", stock: "Ação", fii: "FII",
  crypto: "Criptomoeda", other: "Outro",
};

export function fromManualAssets(assets: ManualAsset[]): TimelineEvent[] {
  return assets.map(a => ({
    id:          `asset-${a.id}`,
    date:        a.created_at.slice(0, 10),
    title:       `Ativo adicionado: ${a.name}`,
    description: `${ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type} avaliado em ${fmtBRL(a.current_value)}`,
    icon:        ASSET_TYPE_ICONS[a.asset_type] ?? "Package",
    color:       color("asset"),
    category:    "asset" as TimelineCategory,
    metadata: {
      asset_type:    a.asset_type,
      current_value: a.current_value,
      currency:      a.currency,
    },
  }));
}

// ── Provider 5: Contas Financeiras ────────────────────────────────────────────

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  checking: "Landmark", savings: "PiggyBank", investment: "TrendingUp",
  wallet: "Wallet", cash: "Banknote",
};

export function fromAccounts(accounts: FinancialAccount[]): TimelineEvent[] {
  return accounts.map(a => ({
    id:          `acc-${a.id}`,
    date:        a.created_at.slice(0, 10),
    title:       `Conta adicionada: ${a.name}`,
    description: `${a.type === "checking" ? "Conta Corrente" : a.type === "savings" ? "Poupança" : a.type === "investment" ? "Investimento" : a.type === "wallet" ? "Carteira Digital" : "Dinheiro"} — saldo ${fmtBRL(a.balance)}`,
    icon:        ACCOUNT_TYPE_ICONS[a.type] ?? "Landmark",
    color:       color("asset"),
    category:    "asset" as TimelineCategory,
    metadata: {
      account_type: a.type,
      balance:      a.balance,
      currency:     a.currency,
    },
  }));
}

// ── Provider 6: Cartões de Crédito ────────────────────────────────────────────

export function fromCards(cards: CreditCard[]): TimelineEvent[] {
  return cards.map(c => ({
    id:          `card-${c.id}`,
    date:        c.created_at.slice(0, 10),
    title:       `Cartão adicionado: ${c.name}`,
    description: `Limite de ${fmtBRL(c.credit_limit)}${c.brand ? ` · ${c.brand.toUpperCase()}` : ""}`,
    icon:        "CreditCard",
    color:       color("asset"),
    category:    "asset" as TimelineCategory,
    metadata: {
      brand:        c.brand,
      credit_limit: c.credit_limit,
      currency:     c.currency,
    },
  }));
}

// ── Provider 7: Orçamentos Excedidos ──────────────────────────────────────────

export function fromBudgets(comparisons: BudgetComparison[]): TimelineEvent[] {
  return comparisons
    .filter(b => b.planned_amount !== null && (b.usage_percentage ?? 0) >= 100)
    .map(b => ({
      id:          `budget-${b.category_id ?? b.category_name}-${b.month}`,
      date:        b.month,
      title:       `Orçamento excedido: ${b.category_name}`,
      description: `${(b.usage_percentage ?? 0).toFixed(0)}% do orçamento utilizado — gasto ${fmtBRL(b.actual_amount)} de ${fmtBRL(b.planned_amount!)} planejado`,
      icon:        "AlertTriangle",
      color:       color("budget"),
      category:    "budget" as TimelineCategory,
      metadata: {
        category_name:    b.category_name,
        usage_percentage: b.usage_percentage,
        actual_amount:    b.actual_amount,
        planned_amount:   b.planned_amount,
        month:            b.month,
      },
    }));
}

// ── Provider 8: Atualizações de Mercado (cotações B3) ─────────────────────────

export function fromB3Quotes(quotes: B3Quote[]): TimelineEvent[] {
  // Agrupar por quote_date — 1 evento por dia de atualização
  const byDate = new Map<string, { tickers: string[]; source: string }>();
  for (const q of quotes) {
    const entry = byDate.get(q.quote_date) ?? { tickers: [], source: q.source };
    if (!entry.tickers.includes(q.ticker)) entry.tickers.push(q.ticker);
    byDate.set(q.quote_date, entry);
  }

  return [...byDate.entries()].map(([date, { tickers, source }]) => {
    const preview = tickers.slice(0, 4).join(", ") +
      (tickers.length > 4 ? ` +${tickers.length - 4}` : "");
    return {
      id:          `market-${date}`,
      date,
      title:       `Cotações B3 atualizadas`,
      description: `${tickers.length} ${tickers.length === 1 ? "ativo atualizado" : "ativos atualizados"}: ${preview}`,
      icon:        "RefreshCw",
      color:       color("market"),
      category:    "market" as TimelineCategory,
      metadata: {
        ticker_count: tickers.length,
        tickers,
        source,
      },
    };
  });
}

// ── Combiner ──────────────────────────────────────────────────────────────────

/**
 * Consolida e ordena todos os eventos por data decrescente.
 *
 * @param groups  Arrays de TimelineEvent[] de cada provider
 * @returns       Array único, ordenado desc por date
 */
export function buildTimeline(groups: TimelineEvent[][]): TimelineEvent[] {
  return groups
    .flat()
    .sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      // Desempate: categoria finance primeiro (transações são mais relevantes)
      const order: Record<TimelineCategory, number> = {
        finance: 0, investment: 1, dividend: 2,
        budget: 3, asset: 4, market: 5, system: 6,
      };
      return (order[a.category] ?? 9) - (order[b.category] ?? 9);
    });
}
