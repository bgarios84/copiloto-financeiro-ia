"use server";

/**
 * Service — Timeline Financeira
 * Sprint 8.3
 *
 * Busca dados de todas as fontes em paralelo e consolida a timeline.
 * Filtragem por período e categoria é feita no Client Component.
 *
 * O service retorna eventos dos últimos 90 dias por padrão,
 * para que o client possa trocar filtros sem re-fetch.
 */

import { createClient }       from "@/lib/supabase/server";
import { requireAuth }        from "@/lib/supabase/require-auth";
import {
  buildTimeline,
  fromTransactions,
  fromTrades,
  fromDividendEvents,
  fromManualAssets,
  fromAccounts,
  fromCards,
  fromBudgets,
  fromB3Quotes,
  type TradeWithPosition,
} from "@/lib/timeline/buildTimeline";
import type { TimelineData, TimelineSummary, TimelineEvent } from "@/lib/timeline/types";
import type { ServiceResult }     from "@/types/dashboard";
import type { Transaction }       from "@/types/transaction";
import type { B3DividendEvent }   from "@/types/b3-dividend";
import type { ManualAsset }       from "@/types/manual-asset";
import type { FinancialAccount }  from "@/types/financial-account";
import type { CreditCard }        from "@/types/credit-card";
import type { BudgetComparison }  from "@/types/budget";
import type { B3Quote }           from "@/types/b3-market";
import type { InvestmentPosition } from "@/types/investment";

// ── Helper ────────────────────────────────────────────────────────────────────

function computeSummary(events: TimelineEvent[], fromDate: string, toDate: string): TimelineSummary {
  const inRange = events.filter(e => e.date >= fromDate && e.date <= toDate);

  let totalIncome    = 0;
  let totalExpense   = 0;
  let totalDividends = 0;
  let totalBuys      = 0;
  let totalSells     = 0;
  let buyCount       = 0;
  let sellCount      = 0;

  for (const e of inRange) {
    if (e.category === "finance") {
      const type   = e.metadata.type as string;
      const amount = (e.metadata.amount as number) ?? 0;
      if (type === "income")  totalIncome  += amount;
      if (type === "expense") totalExpense += amount;
    }
    if (e.category === "dividend") {
      totalDividends += (e.metadata.total_brl as number) ?? 0;
    }
    if (e.category === "investment") {
      const tt     = e.metadata.trade_type as string;
      const amount = (e.metadata.total_amount as number) ?? 0;
      if (tt === "buy")  { totalBuys  += amount; buyCount++;  }
      if (tt === "sell") { totalSells += amount; sellCount++; }
    }
  }

  return { totalIncome, totalExpense, totalDividends, totalBuys, totalSells, buyCount, sellCount };
}

// ── Server Action ─────────────────────────────────────────────────────────────

export async function getTimelineEvents(): Promise<ServiceResult<TimelineData>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const now        = new Date();
    const toDate     = now.toISOString().slice(0, 10);
    const from90     = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89)
      .toISOString().slice(0, 10);
    const from30     = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      .toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10);
    const yearAgo    = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      .toISOString().slice(0, 10);

    // ── 8 queries paralelas ──────────────────────────────────────────────────
    const [
      txnRes,
      tradeRes,
      divRes,
      assetRes,
      accountRes,
      cardRes,
      budgetRes,
      quoteRes,
      posRes,
    ] = await Promise.all([
      // 1. Transações (90 dias)
      supabase
        .from("transaction")
        .select("*, category:category_id(name, icon, color), account:account_id(id,name,color), card:card_id(id,name,color)")
        .is("deleted_at", null)
        .eq("status", "confirmed")
        .gte("date", from90)
        .lte("date", toDate)
        .order("date", { ascending: false })
        .limit(500),

      // 2. Trades com join na posição (90 dias)
      supabase
        .from("investment_trade")
        .select("*, investment_position:investment_position_id(ticker, asset_name)")
        .is("deleted_at", null)
        .gte("trade_date", from90)
        .lte("trade_date", toDate)
        .order("trade_date", { ascending: false }),

      // 3. Eventos de dividendos B3 (payment_date nos últimos 90 dias)
      supabase
        .from("b3_dividend_event")
        .select("*")
        .gte("payment_date", from90)
        .lte("payment_date", toDate)
        .order("payment_date", { ascending: false }),

      // 4. Ativos manuais criados nos últimos 90 dias
      supabase
        .from("manual_asset")
        .select("*")
        .is("deleted_at", null)
        .gte("created_at", from90)
        .order("created_at", { ascending: false }),

      // 5. Contas financeiras criadas nos últimos 90 dias
      supabase
        .from("financial_account")
        .select("*")
        .is("deleted_at", null)
        .gte("created_at", from90)
        .order("created_at", { ascending: false }),

      // 6. Cartões criados nos últimos 90 dias
      supabase
        .from("credit_card")
        .select("*")
        .is("deleted_at", null)
        .gte("created_at", from90)
        .order("created_at", { ascending: false }),

      // 7. Orçamentos do mês corrente (para detectar excedidos)
      supabase
        .from("category_budget_comparison")
        .select("*")
        .gte("month", monthStart)
        .lte("month", monthEnd),

      // 8. Cotações B3 dos últimos 90 dias (para eventos de mercado)
      supabase
        .from("b3_quote")
        .select("id, ticker, close_price, quote_date, source")
        .gte("quote_date", from90)
        .lte("quote_date", toDate)
        .order("quote_date", { ascending: false }),

      // 9. Posições ativas (para mapa ticker→quantidade nos dividendos)
      supabase
        .from("investment_position")
        .select("ticker, quantity")
        .is("deleted_at", null),
    ]);

    // ── Montar mapa ticker → quantidade ──────────────────────────────────────
    const positionQtyMap: Record<string, number> = {};
    for (const p of (posRes.data ?? []) as Pick<InvestmentPosition, "ticker" | "quantity">[]) {
      if (p.ticker && p.quantity !== null) positionQtyMap[p.ticker] = p.quantity;
    }

    // ── Executar providers (leniente — erro = [] vazio) ────────────────────
    const allGroups = [
      txnRes.error    ? [] : fromTransactions((txnRes.data   ?? []) as Transaction[]),
      tradeRes.error  ? [] : fromTrades((tradeRes.data         ?? []) as TradeWithPosition[]),
      divRes.error    ? [] : fromDividendEvents((divRes.data   ?? []) as B3DividendEvent[], positionQtyMap),
      assetRes.error  ? [] : fromManualAssets((assetRes.data   ?? []) as ManualAsset[]),
      accountRes.error? [] : fromAccounts((accountRes.data     ?? []) as FinancialAccount[]),
      cardRes.error   ? [] : fromCards((cardRes.data           ?? []) as CreditCard[]),
      budgetRes.error ? [] : fromBudgets((budgetRes.data       ?? []) as BudgetComparison[]),
      quoteRes.error  ? [] : fromB3Quotes((quoteRes.data       ?? []) as B3Quote[]),
    ];

    const events  = buildTimeline(allGroups);
    const summary = computeSummary(events, from30, toDate);

    return { data: { events, summary }, error: null };
  } catch {
    return { data: null, error: "Erro ao carregar a timeline." };
  }
}
