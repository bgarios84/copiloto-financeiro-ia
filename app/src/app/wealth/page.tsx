import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getManualAssets } from "@/services/manual-asset";
import { getLatestRatesForBRL } from "@/services/fx-rate";
import { AppLayout } from "@/components/layout/AppLayout";
import { WealthClient } from "./WealthClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Patrimônio",
};

/**
 * /wealth — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. Fetch paralelo: ativos manuais + taxas de câmbio mais recentes
 * 3. Passa dados ao WealthClient (Client Component)
 */
export default async function WealthPage() {
  await requireAuth();

  const [assetsResult, ratesResult] = await Promise.all([
    getManualAssets(),
    getLatestRatesForBRL(),
  ]);

  return (
    <AppLayout>
      <WealthClient
        initialAssets={assetsResult.data ?? []}
        initialError={assetsResult.error}
        rateMap={ratesResult.data ?? { BRL: 1 }}
        rateError={ratesResult.error}
      />
    </AppLayout>
  );
}
