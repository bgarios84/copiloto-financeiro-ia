import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getAccounts, getInstitutions } from "@/services/financial-account";
import { getConnections } from "@/services/open-finance";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccountsClient } from "./AccountsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contas",
};

export default async function AccountsPage() {
  await requireAuth();

  const [accountsResult, institutionsResult, connectionsResult] = await Promise.all([
    getAccounts(),
    getInstitutions(),
    getConnections(),
  ]);

  const accounts     = accountsResult.data     ?? [];
  const institutions = institutionsResult.data  ?? [];
  const connections  = connectionsResult.data   ?? [];

  return (
    <AppLayout>
      <AccountsClient
        initialAccounts={accounts}
        institutions={institutions}
        initialConnections={connections}
      />
    </AppLayout>
  );
}
