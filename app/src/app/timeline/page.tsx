import type { Metadata } from "next";
import { requireAuth }          from "@/lib/supabase/require-auth";
import { getTimelineEvents }    from "@/services/timeline";
import { AppLayout }            from "@/components/layout/AppLayout";
import { TimelineClient }       from "./TimelineClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeline Financeira",
};

export default async function TimelinePage() {
  await requireAuth();
  const result = await getTimelineEvents();
  return (
    <AppLayout>
      <TimelineClient
        events={result.data?.events ?? []}
        summary={result.data?.summary ?? {
          totalIncome: 0, totalExpense: 0, totalDividends: 0,
          totalBuys: 0, totalSells: 0, buyCount: 0, sellCount: 0,
        }}
        error={result.error}
      />
    </AppLayout>
  );
}
