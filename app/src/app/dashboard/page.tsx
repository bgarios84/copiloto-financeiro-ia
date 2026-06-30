import type { Metadata } from "next";
import { requireAuth }                  from "@/lib/supabase/require-auth";
import { getDashboardData }             from "@/services/dashboard";
import { getRadarInsights }             from "@/services/radar";
import { computeHealthFromDashboard }   from "@/services/financial-health";
import { computeInsightsFromDashboard } from "@/services/financial-insights";
import { AppLayout }                    from "@/components/layout/AppLayout";
import { DashboardClient }              from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * /dashboard — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. Promise.all — busca dados do dashboard e insights do Radar em paralelo
 * 3. Computa Health + Financial Insights com os dados já carregados (zero queries extras)
 * 4. Passa dados ao DashboardClient (Client Component)
 */
export default async function DashboardPage() {
  await requireAuth();

  const [result, radarResult] = await Promise.all([
    getDashboardData(),
    getRadarInsights(),
  ]);

  const data = result.data ?? {
    summary:           null,
    cashFlow:          [],
    expenseByCategory: [],
    patrimonio: {
      investments:  [],
      manualAssets: [],
      b3QuoteMap:   {},
      dividendMap:  {},
      fxRateMap:    { BRL: 1 },
    },
  };

  const healthResult   = computeHealthFromDashboard(data);
  const healthSnapshot = healthResult.data ?? null;

  const insightsResult = healthSnapshot
    ? computeInsightsFromDashboard(data, healthSnapshot)
    : { data: [], error: null };

  return (
    <AppLayout>
      <DashboardClient
        data={data}
        error={result.error}
        radarInsights={radarResult.data ?? []}
        healthSnapshot={healthSnapshot}
        financialInsights={insightsResult.data ?? []}
      />
    </AppLayout>
  );
}
