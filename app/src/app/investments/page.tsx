import type { Metadata } from "next";
import { requireAuth }            from "@/lib/supabase/require-auth";
import { getInvestmentPositions } from "@/services/investment";
import { getLatestRatesForBRL }   from "@/services/fx-rate";
import { AppLayout }              from "@/components/layout/AppLayout";
import { InvestmentsClient }      from "./InvestmentsClient";

export const metadata: Metadata = {
  title: "Investimentos",
};

/**
 * /investments — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. Fetch paralelo: posições + taxas de câmbio
 * 3. Passa dados ao InvestmentsClient (Client Component)
 */
export default async function InvestmentsPage() {
  await requireAuth();

  const [positionsResult, ratesResult] = await Promise.all([
    getInvestmentPositions(),
    getLatestRatesForBRL(),
  ]);

  return (
    <AppLayout>
      <InvestmentsClient
        initialPositions={positionsResult.data ?? []}
        initialError={positionsResult.error}
        rateMap={ratesResult.data ?? { BRL: 1 }}
        rateError={ratesResult.error}
      />
    </AppLayout>
  );
}
