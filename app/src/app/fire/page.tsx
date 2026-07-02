import type { Metadata } from "next";
import { requireAuth }   from "@/lib/supabase/require-auth";
import { getFireData }   from "@/services/fire";
import { FireClient }    from "./FireClient";
import { AppLayout }     from "@/components/layout/AppLayout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "FIRE Planner | Copiloto" };

export default async function FirePage() {
  await requireAuth();
  const result = await getFireData();
  return (
    <AppLayout>
      <FireClient
        data={result.data}
        error={result.error}
      />
    </AppLayout>
  );
}
