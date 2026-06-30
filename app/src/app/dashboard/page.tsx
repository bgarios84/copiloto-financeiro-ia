import type { Metadata } from "next";
import { requireAuth }                  from "@/lib/supabase/require-auth";
import { getDashboardData }             from "@/services/dashboard";
import { getRadarInsights }             from "@/services/radar";
import { computeHealthFromDashboard }   from "@/services/financial-health";
import { computeInsightsFromDashboard } from "@/services/financial-insights";
import { getOnboardingStatus }          from "@/services/onboarding";
import { AppLayout }                    from "@/components/layout/AppLayout";
import { DashboardClient }              from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * /dashboard — Server Component
 * Sprint 11.4: adiciona onboarding status ao flow
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

  // Health + Insights: funções puras, zero queries extras
  const healthResult   = computeHealthFromDashboard(data);
  const healthSnapshot = healthResult.data ?? null;

  const insightsResult = healthSnapshot
    ? computeInsightsFromDashboard(data, healthSnapshot)
    : { data: [], error: null };

  // Onboarding: queries mínimas paralelas (OF connection, tx count, budget count)
  const onboardingResult = await getOnboardingStatus(data);

  return (
    <AppLayout>
      <DashboardClient
        data={data}
        error={result.error}
        radarInsights={radarResult.data ?? []}
        healthSnapshot={healthSnapshot}
        financialInsights={insightsResult.data ?? []}
        onboarding={onboardingResult.data ?? null}
      />
    </AppLayout>
  );
}
