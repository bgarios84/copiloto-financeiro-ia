import type { Metadata } from "next";
import { requireAuth }                  from "@/lib/supabase/require-auth";
import { getDashboardData }             from "@/services/dashboard";
import { computeHealthFromDashboard }   from "@/services/financial-health";
import { computeInsightsFromDashboard } from "@/services/financial-insights";
import { getAlerts }                    from "@/services/alerts";
import { AppLayout }                    from "@/components/layout/AppLayout";
import { HealthClient }                 from "./HealthClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Health Score | FIRE",
};

/**
 * /health — Análise completa do Health Score
 * Server Component — mesmo padrão do dashboard/page.tsx.
 */
export default async function HealthPage() {
  await requireAuth();

  const result = await getDashboardData();

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

  const alertsResult = await getAlerts(data, healthSnapshot);
  const alerts       = alertsResult.data ?? [];
  const alertCount   = alerts.filter(a => a.severity === "danger").length;

  return (
    <AppLayout hideChrome alertCount={alertCount}>
      <HealthClient
        healthSnapshot={healthSnapshot}
        financialInsights={insightsResult.data ?? []}
        error={result.error}
      />
    </AppLayout>
  );
}
