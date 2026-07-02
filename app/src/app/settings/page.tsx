import { requireAuth }            from "@/lib/supabase/require-auth";
import { AppLayout }              from "@/components/layout/AppLayout";
import { getConnectionsWithDetails } from "@/services/open-finance/queries";
import { OpenFinanceClient }      from "@/app/settings/open-finance/OpenFinanceClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configurações | Copiloto Financeiro",
};

/**
 * /settings — Hub de configurações.
 *
 * Renderiza o Sync Center (OpenFinanceClient) diretamente nesta página,
 * restaurando o fluxo anterior (1 clique em "Configurações" → ver status
 * das conexões bancárias e sincronizar transações).
 *
 * /settings/open-finance continua existindo como URL direta.
 */
export default async function SettingsPage() {
  await requireAuth();

  const result = await getConnectionsWithDetails();

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-white">Configurações</h1>
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
