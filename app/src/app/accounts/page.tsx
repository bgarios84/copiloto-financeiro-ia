import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getAccounts, getInstitutions } from "@/services/financial-account";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccountsClient } from "./AccountsClient";

export const metadata: Metadata = {
  title: "Contas",
};

/**
 * /accounts — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. Busca contas e instituições no Supabase (RLS filtra por user_id)
 * 3. Passa dados iniciais ao AccountsClient (Client Component)
 *
 * Mutações via Server Actions em src/services/financial-account.ts.
 */
export default async function AccountsPage() {
  await requireAuth();

  const [accountsResult, institutionsResult] = await Promise.all([
    getAccounts(),
    getInstitutions(),
  ]);

  const accounts     = accountsResult.data     ?? [];
  const institutions = institutionsResult.data  ?? [];

  return (
    <AppLayout>
      <AccountsClient
        initialAccounts={accounts}
        institutions={institutions}
      />
    </AppLayout>
  );
}
