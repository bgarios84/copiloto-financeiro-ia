import type { Metadata } from "next";
import { requireAuth }       from "@/lib/supabase/require-auth";
import { AppLayout }         from "@/components/layout/AppLayout";
import { MarketDataClient }  from "./MarketDataClient";

export const metadata: Metadata = { title: "Admin — Market Data" };

export default async function MarketDataAdminPage() {
  await requireAuth();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Market Data
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Administração de cotações e dados de mercado B3
          </p>
        </div>
        <MarketDataClient />
      </div>
    </AppLayout>
  );
}
