import { NextRequest, NextResponse } from "next/server";
import { autoSyncAllConnections } from "@/services/open-finance/auto-sync";

/**
 * GET /api/cron/open-finance-sync
 *
 * Cron endpoint para sincronizacao automatica Open Finance.
 * Protegido por CRON_SECRET (mesmo padrao do /api/cron/update-b3-quotes).
 *
 * Agendamento (vercel.json): diariamente as 04:00 UTC (01:00 Brasilia).
 * Janela incremental: 7 dias.
 * Escopo: contas, cartoes, transacoes, categorizacao, reconciliacao.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!cronSecret) {
    console.error("[cron/of-sync] CRON_SECRET nao configurado.");
    return NextResponse.json(
      { error: "Cron nao configurado corretamente no servidor." },
      { status: 500 },
    );
  }

  if (!token || token !== cronSecret) {
    console.warn("[cron/of-sync] Token invalido ou ausente.");
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  console.log("[cron/of-sync] Iniciando sincronizacao automatica Open Finance...");

  try {
    const summary = await autoSyncAllConnections(7);

    console.log(
      `[cron/of-sync] Concluido: ` +
      `${summary.connectionsProcessed}/${summary.connectionsFound} conexoes processadas, ` +
      `${summary.transactionsCreated} tx criadas, ` +
      `${summary.transactionsReconciled} reconciliadas -- ` +
      `${summary.durationMs}ms`,
    );

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro inesperado no auto-sync.";
    console.error("[cron/of-sync] Erro fatal:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
