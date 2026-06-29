import { NextRequest, NextResponse } from "next/server";
import { runB3Update } from "@/lib/market-data/run-b3-update";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  // ── DIAGNOSTICO (remover apos fix) ───────────────────────────────────────
  const authHeader  = request.headers.get("authorization") ?? "";
  const startsBearer = authHeader.startsWith("Bearer ");
  const token        = startsBearer ? authHeader.slice(7) : "";

  console.log("[cron-diag] CRON_SECRET exists :", !!cronSecret);
  console.log("[cron-diag] CRON_SECRET length  :", cronSecret?.length ?? 0);
  console.log("[cron-diag] Authorization header:", JSON.stringify(authHeader));
  console.log("[cron-diag] Starts with Bearer  :", startsBearer);
  console.log("[cron-diag] Token length         :", token.length);
  console.log("[cron-diag] Token === secret     :", !!cronSecret && token === cronSecret);
  // Primeiros 4 chars de cada (safe para comparar formato sem expor valor)
  console.log("[cron-diag] Secret prefix        :", cronSecret ? cronSecret.slice(0, 4) + "..." : "(nulo)");
  console.log("[cron-diag] Token  prefix        :", token ? token.slice(0, 4) + "..." : "(vazio)");
  // ── FIM DIAGNOSTICO ───────────────────────────────────────────────────────

  if (!cronSecret) {
    console.error("[cron] CRON_SECRET nao configurado. Endpoint bloqueado.");
    return NextResponse.json(
      { error: "Cron nao configurado corretamente no servidor." },
      { status: 500 }
    );
  }

  if (!token || token !== cronSecret) {
    console.warn("[cron] Token invalido ou ausente.");
    return NextResponse.json(
      { error: "Nao autorizado." },
      { status: 401 }
    );
  }

  console.log("[cron] Iniciando atualizacao de cotacoes B3...");
  const startedAt = new Date().toISOString();

  const result = await runB3Update([]);

  if (result.error || result.data === null) {
    console.error("[cron] Erro na atualizacao:", result.error);
    return NextResponse.json(
      { error: result.error ?? "Erro desconhecido.", startedAt },
      { status: 500 }
    );
  }

  const { updated, failed, errors, provider, updatedAt } = result.data;

  console.log(
    "[cron] Concluido via " + provider + ": " + updated + " atualizados, " + failed.length + " falhas."
  );

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
