import type { Metadata } from "next";
import { notFound }                  from "next/navigation";
import { requireAuth }               from "@/lib/supabase/require-auth";
import { getInvestmentPositionById } from "@/services/investment";
import { getTradesForPosition }      from "@/services/investment-trade";
import { AppLayout }                 from "@/components/layout/AppLayout";
import { TradesClient }              from "./TradesClient";

export const metadata: Metadata = { title: "Operações" };

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * /investments/[id]/trades — Server Component
 *
 * 1. requireAuth() — redireciona para /login se não autenticado
 * 2. Fetch paralelo: posição + operações
 * 3. 404 se posição não encontrada ou não pertence ao usuário (RLS)
 */
export default async function TradesPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const [positionResult, tradesResult] = await Promise.all([
    getInvestmentPositionById(id),
    getTradesForPosition(id),
  ]);

  if (positionResult.error || !positionResult.data) {
    notFound();
  }

  return (
    <AppLayout>
      <TradesClient
        position={positionResult.data}
        initialTrades={tradesResult.data ?? []}
        initialError={tradesResult.error}
      />
    </AppLayout>
  );
}
