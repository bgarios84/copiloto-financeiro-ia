import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getDashboardData } from "@/services/dashboard";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * /dashboard — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. getDashboardData() — busca dados reais das views de analytics
 * 3. Passa dados ao DashboardClient (Client Component)
 */
export default async function DashboardPage() {
  await requireAuth();
  const result = await getDashboardData();
  const data = result.data ?? { summary: null, cashFlow: [], expenseByCategory: [] };

  return (
    <AppLayout>
      <DashboardClient data={data} error={result.error} />
    </AppLayout>
  );
}
