import { requireAuth } from "@/lib/supabase/require-auth";
import { AppLayout }   from "@/components/layout/AppLayout";
import { getConnectionsWithDetails } from "@/services/open-finance/queries";
import { OpenFinanceClient } from "./OpenFinanceClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Open Finance | Copiloto Financeiro",
};

export default async function OpenFinancePage() {
  await requireAuth();

  const result = await getConnectionsWithDetails();

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-white">Open Finance</h1>
          <p className="mt-1 text-[13px] text-zinc-400">
            Central de sincronização — gerencie e monitore todas as conexões bancárias.
          </p>
        </div>

        <OpenFinanceClient
          initialConnections={result.data ?? []}
          error={result.error}
        />
      </div>
    </AppLayout>
  );
}
