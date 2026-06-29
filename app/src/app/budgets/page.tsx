import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getBudgetComparison } from "@/services/budget";
import { toMonthDate } from "@/lib/date";
import { getCategories } from "@/services/transaction";
import { AppLayout } from "@/components/layout/AppLayout";
import { BudgetsClient } from "./BudgetsClient";

export const metadata: Metadata = {
  title: "Orçamentos",
};

/**
 * /budgets — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. Busca comparação orçamento × realizado do mês atual
 * 3. Busca categorias para o formulário de criação/edição
 */
export default async function BudgetsPage() {
  await requireAuth();

  const now = new Date();
  const currentMonth = toMonthDate(now.getFullYear(), now.getMonth() + 1);

  const [comparisonResult, categoriesResult] = await Promise.all([
    getBudgetComparison(currentMonth),
    getCategories(),
  ]);

  return (
    <AppLayout>
      <BudgetsClient
        initialComparison={comparisonResult.data ?? []}
        initialError={comparisonResult.error}
        categories={categoriesResult.data ?? []}
        currentMonth={currentMonth}
      />
    </AppLayout>
  );
}
