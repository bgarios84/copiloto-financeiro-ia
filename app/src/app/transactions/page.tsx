import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getTransactions, getCategories } from "@/services/transaction";
import { getAccounts } from "@/services/financial-account";
import { getCards } from "@/services/credit-card";
import { AppLayout } from "@/components/layout/AppLayout";
import { TransactionsClient } from "./TransactionsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transações",
};

/**
 * /transactions — Server Component
 *
 * Busca em paralelo: transações + contas + cartões + categorias.
 * Dados passados ao TransactionsClient (Client Component).
 * Mutações via Server Actions em src/services/transaction.ts.
 */
export default async function TransactionsPage() {
  await requireAuth();

  const [txResult, accountsResult, cardsResult, categoriesResult] =
    await Promise.all([
      getTransactions(),
      getAccounts(),
      getCards(),
      getCategories(),
    ]);

  return (
    <AppLayout>
      <TransactionsClient
        initialTransactions={txResult.data     ?? []}
        accounts={accountsResult.data           ?? []}
        cards={cardsResult.data                 ?? []}
        categories={categoriesResult.data       ?? []}
      />
    </AppLayout>
  );
}
