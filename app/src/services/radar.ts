"use server";

/**
 * Service — Radar Financeiro
 * Sprint 8.2
 *
 * Coleta os dados necessários do banco em paralelo, monta o RadarInput
 * e executa todas as regras registradas em src/lib/radar/rules.ts.
 *
 * Ordenação final: danger > warning > success > info
 * Limite: MAX_INSIGHTS insights retornados
 */

import { createClient }     from "@/lib/supabase/server";
import { requireAuth }      from "@/lib/supabase/require-auth";
import { buildDividendMap } from "@/lib/b3-dividend";
import { ALL_RULES }        from "@/lib/radar/rules";
import type { RadarInsight, RadarInput, InsightLevel } from "@/lib/radar/types";
import type { DashboardSummary, MonthlyCashFlow, ServiceResult } from "@/types/dashboard";
import type { BudgetComparison }   from "@/types/budget";
import type { FinancialAccount }   from "@/types/financial-account";
import type { CreditCard }         from "@/types/credit-card";
import type { InvestmentPosition } from "@/types/investment";
import type { ManualAsset }        from "@/types/manual-asset";
import type { B3QuoteMap }         from "@/types/b3-market";
import type { B3DividendEvent }    from "@/types/b3-dividend";
import type { FxRateMap }          from "@/types/fx-rate";

// ── Configuração ──────────────────────────────────────────────────────────────

const MAX_INSIGHTS = 6;

const SEVERITY_ORDER: Record<InsightLevel, number> = {
  danger:  0,
  warning: 1,
  success: 2,
  info:    3,
};

// ── Server Action ─────────────────────────────────────────────────────────────

/**
 * Busca dados do banco, executa todas as regras e retorna os insights
 * ordenados por severidade (danger > warning > success > info), limitados a MAX_INSIGHTS.
 *
 * Erros individuais de query são lenientes — a regra recebe um array vazio
 * e retorna null, evitando que uma falha parcial quebre o radar inteiro.
 */
export async function getRadarInsights(): Promise<ServiceResult<RadarInsight[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const now               = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    const currentMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10);
    const twelveMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      .toISOString().slice(0, 10);
    const dividendCutoff    = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      .toISOString().slice(0, 10);

    // ── 11 queries paralelas ──────────────────────────────────────────────────
    const [
      summaryRes,
      cashFlowRes,
      budgetRes,
      accountsRes,
      cardsRes,
      investRes,
      manualRes,
      fxRes,
      b3QuoteRes,
      dividendRes,
      tradeRes,
    ] = await Promise.all([
      // 1. Resumo analítico
      supabase
        .from("dashboard_summary")
        .select("*")
        .maybeSingle(),

      // 2. Fluxo dos últimos 12 meses
      supabase
        .from("monthly_cash_flow")
        .select("*")
        .gte("month", twelveMonthsAgo)
        .order("month", { ascending: true }),

      // 3. Comparação orçamento × realizado do mês corrente
      supabase
        .from("category_budget_comparison")
        .select("*")
        .gte("month", currentMonthStart)
        .lte("month", currentMonthEnd),

      // 4. Contas financeiras ativas
      supabase
        .from("financial_account")
        .select("*")
        .is("deleted_at", null)
        .eq("is_active", true),

      // 5. Cartões de crédito
      supabase
        .from("credit_card")
        .select("*")
        .is("deleted_at", null),

      // 6. Posições de investimento
      supabase
        .from("investment_position")
        .select("*")
        .is("deleted_at", null),

      // 7. Ativos manuais
      supabase
        .from("manual_asset")
        .select("*")
        .is("deleted_at", null),

      // 8. Taxas de câmbio (mais recente por moeda)
      supabase
        .from("fx_rate")
        .select("base_currency, rate, rate_date")
        .eq("quote_currency", "BRL")
        .order("base_currency", { ascending: true })
        .order("rate_date",     { ascending: false }),

      // 9. Cotações B3 (mais recente por ticker)
      supabase
        .from("b3_quote")
        .select("ticker, close_price, quote_date")
        .order("ticker",     { ascending: true })
        .order("quote_date", { ascending: false }),

      // 10. Eventos de dividendos (janela 12m + futuros)
      supabase
        .from("b3_dividend_event")
        .select("*")
        .or(`ex_date.gte.${dividendCutoff},payment_date.gte.${dividendCutoff}`)
        .order("ticker",       { ascending: true })
        .order("payment_date", { ascending: false }),

      // 11. Trades de compra no mês corrente (apenas 1 resultado para flag)
      supabase
        .from("investment_trade")
        .select("id")
        .eq("trade_type", "buy")
        .gte("trade_date", currentMonthStart)
        .lte("trade_date", currentMonthEnd)
        .limit(1),
    ]);

    // ── Montar mapas ──────────────────────────────────────────────────────────

    const fxRateMap: FxRateMap = { BRL: 1 };
    if (!fxRes.error) {
      const seen = new Set<string>();
      for (const row of (fxRes.data ?? []) as Array<{ base_currency: string; rate: number }>) {
        if (!seen.has(row.base_currency)) {
          fxRateMap[row.base_currency] = row.rate;
          seen.add(row.base_currency);
        }
      }
    }

    const b3QuoteMap: B3QuoteMap = {};
    if (!b3QuoteRes.error) {
      for (const row of (b3QuoteRes.data ?? []) as Array<{ ticker: string; close_price: number }>) {
        if (!(row.ticker in b3QuoteMap)) b3QuoteMap[row.ticker] = row.close_price;
      }
    }

    const dividendEvents: B3DividendEvent[] = dividendRes.error
      ? []
      : (dividendRes.data ?? []) as B3DividendEvent[];
    const dividendMap = buildDividendMap(dividendEvents, b3QuoteMap);

    // ── Montar input ──────────────────────────────────────────────────────────

    const input: RadarInput = {
      summary:           (summaryRes.data as DashboardSummary | null) ?? null,
      cashFlow:          cashFlowRes.error ? [] : (cashFlowRes.data ?? []) as MonthlyCashFlow[],
      budgetComparisons: budgetRes.error   ? [] : (budgetRes.data   ?? []) as BudgetComparison[],
      accounts:          accountsRes.error ? [] : (accountsRes.data ?? []) as FinancialAccount[],
      cards:             cardsRes.error    ? [] : (cardsRes.data    ?? []) as CreditCard[],
      investments:       investRes.error   ? [] : (investRes.data   ?? []) as InvestmentPosition[],
      manualAssets:      manualRes.error   ? [] : (manualRes.data   ?? []) as ManualAsset[],
      b3QuoteMap,
      dividendMap,
      fxRateMap,
      hasTradeThisMonth: !tradeRes.error && (tradeRes.data?.length ?? 0) > 0,
    };

    // ── Executar regras ───────────────────────────────────────────────────────

    const insights = ALL_RULES
      .map(rule => {
        try { return rule(input); }
        catch { return null; }  // regra com erro não quebra o radar
      })
      .filter((ins): ins is RadarInsight => ins !== null)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
      .slice(0, MAX_INSIGHTS);

    return { data: insights, error: null };
  } catch {
    return { data: null, error: "Erro ao processar o Radar Financeiro." };
  }
}
