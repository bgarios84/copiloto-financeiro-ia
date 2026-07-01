import type { Metadata } from "next";
import { requireAuth }                  from "@/lib/supabase/require-auth";
import { getDashboardData }             from "@/services/dashboard";
import { getRadarInsights }             from "@/services/radar";
import { computeHealthFromDashboard }   from "@/services/financial-health";
import { computeInsightsFromDashboard } from "@/services/financial-insights";
import { getOnboardingStatus }          from "@/services/onboarding";
import { getAlerts }                    from "@/services/alerts";
import { AppLayout }                    from "@/components/layout/AppLayout";
import { DashboardClient }              from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * /dashboard — Server Component
 * Sprint 11.5: adiciona alertas internos ao flow
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

  // Onboarding + Alerts: queries paralelas
  const [onboardingResult, alertsResult] = await Promise.all([
    getOnboardingStatus(data),
    getAlerts(data, healthSnapshot),
  ]);

  const alerts     = alertsResult.data ?? [];
  const alertCount = alerts.filter(a => a.severity === "danger").length;

  return (
    <AppLayout hideChrome alertCount={alertCount}>
      <DashboardClient
        data={data}
        error={result.error}
        radarInsights={radarResult.data ?? []}
        healthSnapshot={healthSnapshot}
        financialInsights={insightsResult.data ?? []}
        onboarding={onboardingResult.data ?? null}
        alerts={alerts}
      />
    </AppLayout>
  );
}
