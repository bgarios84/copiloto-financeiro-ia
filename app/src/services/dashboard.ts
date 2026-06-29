"use server";

/**
 * Service — Dashboard
 * Sprint 5.4B
 *
 * Busca dados das views de analytics em 3 queries paralelas.
 * Views herdam RLS das tabelas base — dados são automaticamente
 * filtrados pelo user_id do usuário autenticado.
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import type {
  DashboardData,
  DashboardSummary,
  MonthlyCashFlow,
  MonthlyExpenseByCategory,
  ServiceResult,
} from "@/types/dashboard";

export async function getDashboardData(): Promise<ServiceResult<DashboardData>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    // Bounds de data
    const now              = new Date();
    const twelveMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      .toISOString().slice(0, 10);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    const currentMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10);

    const [summaryRes, cashFlowRes, expenseRes] = await Promise.all([
      // 1. Resumo geral (1 linha por usuário)
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
    ]);

    if (summaryRes.error)  return { data: null, error: summaryRes.error.message  };
    if (cashFlowRes.error) return { data: null, error: cashFlowRes.error.message };
    if (expenseRes.error)  return { data: null, error: expenseRes.error.message  };

    return {
      data: {
        summary:           (summaryRes.data  as DashboardSummary | null) ?? null,
        cashFlow:          (cashFlowRes.data as MonthlyCashFlow[])       ?? [],
        expenseByCategory: (expenseRes.data  as MonthlyExpenseByCategory[]) ?? [],
      },
      error: null,
    };
  } catch {
    return { data: null, error: "Erro ao carregar dados do dashboard." };
  }
}
