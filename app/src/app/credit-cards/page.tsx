import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getCards } from "@/services/credit-card";
import { getInstitutions } from "@/services/financial-account";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreditCardsClient } from "./CreditCardsClient";

export const metadata: Metadata = {
  title: "Cartões de Crédito",
};

/**
 * /credit-cards — Server Component
 *
 * 1. requireAuth() — protege a rota server-side
 * 2. Busca cartões + instituições em paralelo (RLS filtra por user_id)
 * 3. Passa dados ao CreditCardsClient
 */
export default async function CreditCardsPage() {
  await requireAuth();

  const [cardsResult, institutionsResult] = await Promise.all([
    getCards(),
    getInstitutions(),
  ]);

  const cards        = cardsResult.data        ?? [];
  const institutions = institutionsResult.data  ?? [];

  return (
    <AppLayout>
      <CreditCardsClient
        initialCards={cards}
        institutions={institutions}
      />
    </AppLayout>
  );
}
