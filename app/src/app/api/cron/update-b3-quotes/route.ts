import { NextRequest, NextResponse } from "next/server";
import { runB3Update } from "@/lib/market-data/run-b3-update";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!cronSecret) {
    console.error("[cron] CRON_SECRET nao configurado.");
    return NextResponse.json(
      { error: "Cron nao configurado corretamente no servidor." },
      { status: 500 }
    );
  }

  if (!token || token !== cronSecret) {
    console.warn("[cron] Token inválido ou ausente.");
    return NextResponse.json(
      { error: "Nao autorizado." },
      { status: 401 }
    );
  }

  const startedAt = new Date().toISOString();
  const result    = await runB3Update([]);

  if (result.error || result.data === null) {
    console.error("[cron] Erro na atualizaçao:", result.error);
    return NextResponse.json(
      { error: result.error ?? "Erro desconhecido.", startedAt },
      { status: 500 }
    );
  }

  const { updated, failed, errors, provider, updatedAt } = result.data;

  console.log(`[cron] Concluido via ${provider}: ${updated} atualizados, ${failed.length} falhas.`);

  return NextResponse.json({
    ok: true,
    provider,
    updated,
    failed,
    errors,
    startedAt,
    updatedAt,
  });
}
