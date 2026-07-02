import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getTransactions, getCategories } from "@/services/transaction";
import { getAccounts } from "@/services/financial-account";
import { getCards } from "@/services/credit-card";
import { getBudgetComparison, getActiveBudgetCategoryIds } from "@/services/budget";
import { computeTransactionAnalytics } from "@/lib/transaction-analytics";
import { AppLayout } from "@/components/layout/AppLayout";
import { TransactionsClient } from "./TransactionsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transacoes",
};

/**
 * /transactions - Server Component
 * Sprint 14.3 - Pagina analitica
 */
export default async function TransactionsPage() {
  await requireAuth();

  const now       = new Date();
  const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [txResult, accountsResult, cardsResult, categoriesResult, budgetsResult, budgetCatIdsResult] =
    await Promise.all([
      getTransactions(),
      getAccounts(),
      getCards(),
      getCategories(),
      getBudgetComparison(monthDate),
      getActiveBudgetCategoryIds(),
    ]);

  const transactions        = txResult.data             ?? [];
  const accounts            = accountsResult.data       ?? [];
  const cards               = cardsResult.data          ?? [];
  const categories          = categoriesResult.data     ?? [];
  const budgets             = budgetsResult.data        ?? [];
  const budgetedCategoryIds = new Set(budgetCatIdsResult.data ?? []);

  const analytics = computeTransactionAnalytics(transactions, accounts, budgets, budgetedCategoryIds);

  return (
    <AppLayout>
      <TransactionsClient
        initialTransactions={transactions}
        accounts={accounts}
        cards={cards}
        categories={categories}
        analytics={analytics}
      />
    </AppLayout>
  );
}
