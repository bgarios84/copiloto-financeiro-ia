import { requireAuth } from "@/lib/supabase/require-auth";
import { getConnections } from "@/services/open-finance";
import { OpenFinanceClient } from "./OpenFinanceClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Open Finance | Copiloto Financeiro",
};

export default async function OpenFinancePage() {
  await requireAuth();

  const result = await getConnections();
  const connections = result.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-white">Open Finance</h1>
        <p className="mt-1 text-[13px] text-zinc-400">
          Conecte suas contas bancarias para sincronizar saldo e transacoes automaticamente.
        </p>
      </div>

      <OpenFinanceClient
        initialConnections={connections}
        error={result.error}
      />
    </div>
  );
}
