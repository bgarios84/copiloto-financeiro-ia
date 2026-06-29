import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getManualAssets } from "@/services/manual-asset";
import { AppLayout } from "@/components/layout/AppLayout";
import { WealthClient } from "./WealthClient";

export const metadata: Metadata = {
  title: "Patrimônio",
};

/**
 * /wealth — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. getManualAssets() — busca ativos manuais do usuário
 * 3. Passa dados ao WealthClient (Client Component)
 */
export default async function WealthPage() {
  await requireAuth();
  const result = await getManualAssets();

  return (
    <AppLayout>
      <WealthClient
        initialAssets={result.data ?? []}
        initialError={result.error}
      />
    </AppLayout>
  );
}
