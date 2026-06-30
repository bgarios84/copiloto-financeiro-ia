import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { runConnectionSync } from "@/services/open-finance/sync-orchestrator";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * POST /api/webhooks/pluggy
 *
 * Recebe eventos de webhook da Pluggy.
 *
 * Fluxo:
 *   1. Valida HMAC-SHA256 via PLUGGY_WEBHOOK_SECRET (obrigatorio em producao)
 *   2. Persiste evento em open_finance_webhook_event (service_role)
 *   3. Identifica a conexao pelo provider_item_id
 *   4. Para eventos que exigem atualizacao: dispara runConnectionSync
 *   5. Retorna 200 imediatamente (a Pluggy exige resposta rapida)
 *
 * Eventos tratados:
 *   - item/updated             -> sync completo
 *   - item/login_succeeded     -> sync completo
 *   - transactions/updated     -> sync completo
 *   - item/waiting_user_action -> atualiza status da conexao para "pending"
 *   - item/error               -> atualiza status da conexao para "error"
 *   - item/created             -> ignorado (conexao ainda sendo configurada)
 *   - connector/status_updated -> ignorado (nao afeta dados do usuario)
 *
 * Variavel de ambiente:
 *   PLUGGY_WEBHOOK_SECRET  -- segredo HMAC compartilhado com a Pluggy.
 *                             Opcional em dev (warning), obrigatorio em prod.
 */

// Eventos que disparam sync completo de contas + transacoes
const SYNC_EVENTS = new Set([
  "item/updated",
  "item/login_succeeded",
  "transactions/updated",
]);

// Eventos que marcam a conexao como "error"
const ERROR_EVENTS = new Set([
  "item/error",
]);

// Eventos que marcam a conexao como "pending" (aguardando acao do usuario)
const PENDING_EVENTS = new Set([
  "item/waiting_user_action",
]);

// Todos os eventos conhecidos (nao gera alerta de "desconhecido")
const KNOWN_EVENTS = new Set([
  "item/created",
  "item/updated",
  "item/login_succeeded",
  "item/error",
  "item/waiting_user_action",
  "transactions/updated",
  "connector/status_updated",
]);

/**
 * Verifica HMAC-SHA256.
 * A Pluggy envia o header "x-pluggy-signature" com valor "sha256=<hex>".
 * Retorna true se valido, false se invalido, null se secret nao configurado.
 */
function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | null,
  secret: string | null,
): boolean | null {
  if (!secret) return null;
  if (!signatureHeader) return false;

  const expected = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  const digest = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"));
  } catch {
    // Comprimentos diferentes => assinaturas incompativeis
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const db     = createServiceRoleClient();
  const secret = process.env.PLUGGY_WEBHOOK_SECRET ?? null;
  const isProd = process.env.NODE_ENV === "production";

  // 1. Ler body como Buffer para validacao HMAC
  let rawBody: Buffer;
  try {
    const arrayBuffer = await request.arrayBuffer();
    rawBody = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: "Falha ao ler corpo da requisicao." }, { status: 400 });
  }

  const signatureHeader = request.headers.get("x-pluggy-signature");

  // 2. Validar assinatura
  const sigResult = verifySignature(rawBody, signatureHeader, secret);

  if (sigResult === null) {
    // Secret nao configurado
    if (isProd) {
      console.error("[webhook/pluggy] PLUGGY_WEBHOOK_SECRET nao configurado em producao.");
      return NextResponse.json({ error: "Webhook nao configurado corretamente." }, { status: 500 });
    }
    console.warn("[webhook/pluggy] PLUGGY_WEBHOOK_SECRET ausente -- aceitando em dev.");
  } else if (sigResult === false) {
    console.warn("[webhook/pluggy] Assinatura HMAC invalida.");
    return NextResponse.json({ error: "Assinatura invalida." }, { status: 401 });
  }

  // 3. Parsear payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload nao e JSON valido." }, { status: 400 });
  }

  const eventType      = String(payload["event"]  ?? payload["type"]  ?? "unknown");
  const providerItemId = String(payload["itemId"] ?? payload["id"]    ?? "");

  if (!providerItemId) {
    console.warn("[webhook/pluggy] Evento sem itemId -- tipo:", eventType);
    return NextResponse.json({ ok: true, warning: "itemId ausente -- ignorado." });
  }

  // 4. Persistir evento (fire-and-forget; nao deixa falha de DB bloquear resposta)
  let webhookEventId: string | null = null;
  try {
    const { data: evt } = await db
      .from("open_finance_webhook_event")
      .insert({
        provider:         "pluggy",
        event_type:       eventType,
        provider_item_id: providerItemId,
        payload,
        signature:        signatureHeader,
        status:           "pending",
        received_at:      new Date().toISOString(),
      })
      .select("id")
      .single();
    webhookEventId = evt?.id ?? null;
  } catch (err) {
    console.error("[webhook/pluggy] Falha ao persistir evento:", err);
    // Continua mesmo sem persistir
  }

  // 5. Identificar conexao pelo provider_item_id
  const { data: connection } = await db
    .from("open_finance_connection")
    .select("id, user_id, status")
    .eq("provider_item_id", providerItemId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!connection) {
    console.warn(`[webhook/pluggy] Conexao nao encontrada para itemId=${providerItemId}`);
    await markWebhookEvent(db, webhookEventId, "ignored", "Conexao nao encontrada.");
    return NextResponse.json({ ok: true, warning: "Conexao nao encontrada." });
  }

  if (!KNOWN_EVENTS.has(eventType)) {
    console.warn(`[webhook/pluggy] Evento desconhecido: ${eventType}`);
  }

  // 6. Processar evento
  if (SYNC_EVENTS.has(eventType)) {
    // Dispara sync em background -- nao aguarda (retorna 200 imediatamente)
    runConnectionSync(db, connection.user_id, connection.id, 7, "webhook")
      .then(async (result) => {
        const status = result.skipped ? "ignored" : result.errors.length === 0 ? "processed" : "processed";
        const errMsg = result.errors.length > 0 ? result.errors.slice(0, 2).join("; ") : null;
        await markWebhookEvent(db, webhookEventId, status, errMsg);
        console.log(
          `[webhook/pluggy] ${eventType} / ${connection.id}: ` +
          `${result.transactionsCreated} tx criadas, skipped=${result.skipped}`,
        );
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Erro no sync pos-webhook.";
        console.error(`[webhook/pluggy] Sync falhou para ${connection.id}:`, msg);
        markWebhookEvent(db, webhookEventId, "failed", msg).catch(() => undefined);
      });

  } else if (ERROR_EVENTS.has(eventType)) {
    const errMsg = String(payload["error"] ?? payload["message"] ?? "Erro reportado pelo provider.");
    await db
      .from("open_finance_connection")
      .update({
        status:        "error",
        error_message: errMsg,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", connection.id);
    await markWebhookEvent(db, webhookEventId, "processed", null);
    console.log(`[webhook/pluggy] item/error para ${connection.id}: ${errMsg}`);

  } else if (PENDING_EVENTS.has(eventType)) {
    await db
      .from("open_finance_connection")
      .update({
        status:     "pending_user_action",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    await markWebhookEvent(db, webhookEventId, "processed", null);
    console.log(`[webhook/pluggy] item/waiting_user_action para ${connection.id}`);

  } else {
    // Evento conhecido mas sem acao necessaria (item/created, connector/status_updated)
    await markWebhookEvent(db, webhookEventId, "ignored", null);
  }

  // Retorna 200 imediatamente (a Pluggy re-tenta se receber 4xx/5xx)
  return NextResponse.json({ ok: true });
}

// -- Helper -------------------------------------------------------------------

async function markWebhookEvent(
  db:      ReturnType<typeof createServiceRoleClient>,
  id:      string | null,
  status:  "processed" | "failed" | "ignored",
  errMsg:  string | null,
): Promise<void> {
  if (!id) return;
  try {
    await db
      .from("open_finance_webhook_event")
      .update({
        status,
        processed_at:  new Date().toISOString(),
        error_message: errMsg,
      })
      .eq("id", id);
  } catch {
    // Nao critico
  }
}
