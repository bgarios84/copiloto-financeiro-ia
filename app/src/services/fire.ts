"use server";

/**
 * Service — FIRE Planning
 * Sprint 8.4 / 8.5
 *
 * Busca dados financeiros reais e retorna FireData para o FireClient.
 * O cálculo de cenários / indicadores ocorre no cliente.
 */

import { createClient }       from "@/lib/supabase/server";
import { requireAuth }        from "@/lib/supabase/require-auth";
import type { FireData }      from "@/lib/fire/types";
import type { ServiceResult } from "@/types/dashboard";

// ── Types locais ───────────────────────────────────────────────────────────────

interface AccountRow  { balance: number; currency: string; }
interface PositionRow { current_value: number | null; currency: string; ticker: string | null; quantity: number | null; }
interface AssetRow    { current_value: number; currency: string; }
interface FxRow       { base_currency: string; rate: number; }
interface DivRow      { amount_per_share: number; ticker: string; }
interface SummaryRow  { monthly_income: number; monthly_expense: number; }
interface CardRow     { credit_limit: number; available_limit: number; currency: string; }

// ── Server Action ──────────────────────────────────────────────────────────────

export async function getFireData(): Promise<ServiceResult<FireData>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const now     = new Date();
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      .toISOString().slice(0, 10);
    const toDate  = now.toISOString().slice(0, 10);

    const [summaryRes, accountRes, investRes, assetRes, fxRes, divRes, cardRes] = await Promise.all([
      // 1. Resumo financeiro (renda + despesa)
      supabase
        .from("dashboard_summary")
        .select("monthly_income, monthly_expense")
        .maybeSingle(),

      // 2. Saldos das contas
      supabase
        .from("financial_account")
        .select("balance, currency")
        .is("deleted_at", null),

      // 3. Posições de investimento (com current_value para total e para dividend yield)
      supabase
        .from("investment_position")
        .select("current_value, currency, ticker, quantity")
        .is("deleted_at", null),

      // 4. Ativos manuais
      supabase
        .from("manual_asset")
        .select("current_value, currency")
        .is("deleted_at", null),

      // 5. Taxas de câmbio (para BRL)
      supabase
        .from("fx_rate")
        .select("base_currency, rate")
        .eq("quote_currency", "BRL"),

      // 6. Dividendos B3 últimos 12 meses
      supabase
        .from("b3_dividend_event")
        .select("amount_per_share, ticker")
        .gte("payment_date", yearAgo)
        .lte("payment_date", toDate),

      // 7. Cartões de crédito (para calcular dívida = limite - disponível)
      supabase
        .from("credit_card")
        .select("credit_limit, available_limit, currency")
        .is("deleted_at", null)
        .eq("is_active", true),
    ]);

    const summary   = summaryRes.data as SummaryRow  | null;
    const accounts  = (accountRes.data ?? []) as AccountRow[];
    const positions = (investRes.data  ?? []) as PositionRow[];
    const assets    = (assetRes.data   ?? []) as AssetRow[];
    const fxRows    = (fxRes.data      ?? []) as FxRow[];
    const divRows   = (divRes.data     ?? []) as DivRow[];
    const cards     = (cardRes.data    ?? []) as CardRow[];

    // FX map: base_currency → rate (BRL)
    const fx: Record<string, number> = { BRL: 1 };
    for (const r of fxRows) fx[r.base_currency] = r.rate;

    // Patrimônio total em BRL
    const accountTotal = accounts.reduce(
      (s, a) => s + a.balance * (fx[a.currency] ?? 1), 0,
    );
    const investTotal = positions.reduce(
      (s, p) => s + (p.current_value ?? 0) * (fx[p.currency ?? "BRL"] ?? 1), 0,
    );
    const assetTotal = assets.reduce(
      (s, a) => s + a.current_value * (fx[a.currency] ?? 1), 0,
    );
    const currentPatrimonio = accountTotal + investTotal + assetTotal;

    // Dívida total em cartões = soma(credit_limit - available_limit)
    const totalDebt = cards.reduce(
      (s, c) => s + Math.max(0, c.credit_limit - c.available_limit) * (fx[c.currency] ?? 1), 0,
    );

    // Renda / despesa mensal
    const monthlyIncome  = summary?.monthly_income  ?? 0;
    const monthlyExpense = summary?.monthly_expense ?? 0;

    // Dividendos: ticker → quantidade da carteira
    const qtyMap: Record<string, number> = {};
    for (const p of positions) {
      if (p.ticker && p.quantity !== null) qtyMap[p.ticker] = p.quantity;
    }
    const totalDivs12m = divRows.reduce(
      (s, d) => s + d.amount_per_share * (qtyMap[d.ticker] ?? 0), 0,
    );
    const monthlyDividends    = totalDivs12m / 12;
    const defaultContribution = Math.max(0, monthlyIncome - monthlyExpense);

    return {
      data: {
        currentPatrimonio:   Math.round(currentPatrimonio),
        monthlyIncome:       Math.round(monthlyIncome),
        monthlyExpense:      Math.round(monthlyExpense),
        monthlyDividends:    Math.round(monthlyDividends),
        defaultContribution: Math.round(defaultContribution),
        investTotal:         Math.round(investTotal),
        totalDebt:           Math.round(totalDebt),
      },
      error: null,
    };
  } catch {
    return { data: null, error: "Erro ao carregar dados FIRE." };
  }
}
