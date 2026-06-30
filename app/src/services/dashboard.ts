"use server";

/**
 * Service — Dashboard
 * Sprint 5.4B / 7.4
 *
 * Busca dados das views de analytics + dados de patrimônio consolidado.
 * Queries agrupadas em um único Promise.all para mínima latência.
 * Dados de patrimônio são lenientes: falhas individuais retornam arrays vazios.
 */

import { createClient }    from "@/lib/supabase/server";
import { requireAuth }     from "@/lib/supabase/require-auth";
import { buildDividendMap } from "@/lib/b3-dividend";
import type {
  DashboardData,
  DashboardSummary,
  MonthlyCashFlow,
  MonthlyExpenseByCategory,
  PatrimonioData,
  ServiceResult,
} from "@/types/dashboard";
import type { InvestmentPosition } from "@/types/investment";
import type { ManualAsset }        from "@/types/manual-asset";
import type { B3QuoteMap }         from "@/types/b3-market";
import type { B3DividendEvent }    from "@/types/b3-dividend";
import type { FxRateMap }          from "@/types/fx-rate";

// ── Vazio padrão ──────────────────────────────────────────────────────────────

const EMPTY_PATRIMONIO: PatrimonioData = {
  investments:  [],
  manualAssets: [],
  b3QuoteMap:   {},
  dividendMap:  {},
  fxRateMap:    { BRL: 1 },
};

// ── Main ──────────────────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<ServiceResult<DashboardData>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    // ── Bounds de data ─────────────────────────────────────────────────────
    const now               = new Date();
    const twelveMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      .toISOString().slice(0, 10);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    const currentMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10);
    // Janela para dividendos: exatamente 12 meses atrás
    const dividendCutoff    = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      .toISOString().slice(0, 10);

    // ── 8 queries paralelas ───────────────────────────────────────────────
    const [
      summaryRes,
      cashFlowRes,
      expenseRes,
      investRes,
      manualRes,
      fxRes,
      b3QuoteRes,
      dividendRes,
    ] = await Promise.all([
      // 1. Resumo geral (views analytics)
      supabase
        .from("dashboard_summary")
        .select("*")
        .maybeSingle(),

      // 2. Fluxo mensal dos últimos 12 meses
      supabase
        .from("monthly_cash_flow")
        .select("*")
        .gte("month", twelveMonthsAgo)
        .order("month", { ascending: true }),

      // 3. Top 6 categorias de despesa do mês corrente
      supabase
        .from("monthly_expense_by_category")
        .select("*")
        .gte("month", currentMonthStart)
        .lte("month", currentMonthEnd)
        .order("total_amount", { ascending: false })
        .limit(6),

      // 4. Posições de investimento (filtradas por RLS — user_id automático)
      supabase
        .from("investment_position")
        .select("*")
        .is("deleted_at", null)
        .order("asset_class", { ascending: true })
        .order("asset_name",  { ascending: true }),

      // 5. Ativos manuais
      supabase
        .from("manual_asset")
        .select("*")
        .is("deleted_at", null)
        .order("current_value", { ascending: false }),

      // 6. Taxas de câmbio (latest per currency, tabela compartilhada)
      supabase
        .from("fx_rate")
        .select("base_currency, rate, rate_date")
        .eq("quote_currency", "BRL")
        .order("base_currency",  { ascending: true })
        .order("rate_date",      { ascending: false }),

      // 7. Cotações B3 (latest per ticker, tabela compartilhada)
      supabase
        .from("b3_quote")
        .select("ticker, close_price, quote_date")
        .order("ticker",     { ascending: true })
        .order("quote_date", { ascending: false }),

      // 8. Eventos de dividendos (janela 12m + futuros, tabela compartilhada)
      supabase
        .from("b3_dividend_event")
        .select("*")
        .or(`ex_date.gte.${dividendCutoff},payment_date.gte.${dividendCutoff}`)
        .order("ticker",       { ascending: true })
        .order("payment_date", { ascending: false }),
    ]);

    // ── Erros críticos (views analytics) ──────────────────────────────────
    if (summaryRes.error)  return { data: null, error: summaryRes.error.message  };
    if (cashFlowRes.error) return { data: null, error: cashFlowRes.error.message };
    if (expenseRes.error)  return { data: null, error: expenseRes.error.message  };

    // ── Processar patrimônio (erros lenientes) ─────────────────────────────

    // fx_rate map: { BRL: 1, USD: 5.82, EUR: 6.30, ... }
    const fxRateMap: FxRateMap = { BRL: 1 };
    if (!fxRes.error) {
      const seenFx = new Set<string>();
      for (const row of (fxRes.data ?? []) as Array<{ base_currency: string; rate: number }>) {
        if (!seenFx.has(row.base_currency)) {
          fxRateMap[row.base_currency] = row.rate;
          seenFx.add(row.base_currency);
        }
      }
    }

    // b3_quote map: { PETR4: 38.20, XPML11: 118.00, ... }
    const b3QuoteMap: B3QuoteMap = {};
    if (!b3QuoteRes.error) {
      for (const row of (b3QuoteRes.data ?? []) as Array<{ ticker: string; close_price: number }>) {
        if (!(row.ticker in b3QuoteMap)) {
          b3QuoteMap[row.ticker] = row.close_price;
        }
      }
    }

    // dividend map
    const dividendEvents: B3DividendEvent[] = dividendRes.error
      ? []
      : (dividendRes.data ?? []) as B3DividendEvent[];
    const dividendMap = buildDividendMap(dividendEvents, b3QuoteMap);

    const patrimonio: PatrimonioData = {
      investments:  investRes.error ? [] : (investRes.data ?? []) as InvestmentPosition[],
      manualAssets: manualRes.error ? [] : (manualRes.data ?? []) as ManualAsset[],
      b3QuoteMap,
      dividendMap,
      fxRateMap,
    };

    return {
      data: {
        summary:           (summaryRes.data  as DashboardSummary | null) ?? null,
        cashFlow:          (cashFlowRes.data as MonthlyCashFlow[])       ?? [],
        expenseByCategory: (expenseRes.data  as MonthlyExpenseByCategory[]) ?? [],
        patrimonio,
      },
      error: null,
    };
  } catch {
    return { data: null, error: "Erro ao carregar dados do dashboard." };
  }
}
