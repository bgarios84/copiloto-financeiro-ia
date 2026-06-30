"use server";

/**
 * Service — Open Finance
 * Sprint 9.2 — Connection Flow
 *
 * Server Actions para o fluxo de conexao Open Finance.
 * Nenhum secret e exposto ao frontend.
 * Usa RLS + requireAuth() como dupla camada de protecao.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getOpenFinanceProvider } from "@/lib/open-finance";
import type { ServiceResult } from "@/types/common";
import type { OpenFinanceConnection } from "@/types/open-finance";

// ── Tipos locais ──────────────────────────────────────────────────────────────

export type OFConnectionWithInstitution = OpenFinanceConnection & {
  institution: {
    id:         string;
    name:       string;
    short_name: string;
    logo_url:   string | null;
  } | null;
};

// ── Connect Token ─────────────────────────────────────────────────────────────

/**
 * Gera um Connect Token de curta duracao (~30min) para o widget Pluggy.
 * O token e retornado ao frontend apenas para inicializar o widget.
 * Nunca armazenado no banco.
 */
export async function getConnectToken(): Promise<
  ServiceResult<{ connectToken: string; expiresAt: string }>
> {
  try {
    const user     = await requireAuth();
    const provider = await getOpenFinanceProvider();
    const result   = await provider.createConnectToken(user.id);
    return { data: result, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar token de conexao.";
    return { data: null, error: msg };
  }
}

// ── Salvar conexao ────────────────────────────────────────────────────────────

/**
 * Persiste uma nova conexao apos o usuario autorizar no widget Pluggy.
 * Chama getConnection() no provider para obter status e institutionCode.
 * Busca institution_id por ISPB se disponivel.
 *
 * @param providerItemId - item_id retornado pelo widget Pluggy (nao sensivel)
 */
export async function saveConnection(
  providerItemId: string,
): Promise<ServiceResult<OpenFinanceConnection>> {
  try {
    const user     = await requireAuth();
    const provider = await getOpenFinanceProvider();
    const supabase = await createClient();

    // Busca status e institution info no provider
    const connectionInfo = await provider.getConnection(providerItemId);

    // Tenta encontrar institution_id pelo institutionCode (ISPB)
    let institutionId: string | null = null;
    if (connectionInfo.institutionCode) {
      const { data: inst } = await supabase
        .from("institution")
        .select("id")
        .eq("ispb", connectionInfo.institutionCode)
        .single();
      institutionId = inst?.id ?? null;
    }

    // Upsert: evita duplicata se o usuario reconectar o mesmo item
    const { data, error } = await supabase
      .from("open_finance_connection")
      .upsert(
        {
          user_id:          user.id,
          provider:         provider.name,
          provider_item_id: providerItemId,
          institution_id:   institutionId,
          status:           connectionInfo.status === "connected" ? "connected" : "pending",
          error_message:    connectionInfo.errorMessage ?? null,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: "user_id,provider,provider_item_id" },
      )
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/settings/open-finance");
    return { data: data as OpenFinanceConnection, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar conexao.";
    return { data: null, error: msg };
  }
}

// ── Listar conexoes ───────────────────────────────────────────────────────────

/**
 * Lista todas as conexoes ativas do usuario autenticado.
 */
export async function getConnections(): Promise<
  ServiceResult<OFConnectionWithInstitution[]>
> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("open_finance_connection")
      .select(`
        *,
        institution:institution_id (
          id, name, short_name, logo_url
        )
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as OFConnectionWithInstitution[], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar conexoes." };
  }
}

// ── Remover conexao ───────────────────────────────────────────────────────────

/**
 * Encerra conexao: revoga consentimento no provider e aplica soft-delete local.
 * Contas e transacoes existentes permanecem — apenas a sincronizacao e interrompida.
 */
export async function deleteConnection(
  id: string,
): Promise<ServiceResult<null>> {
  try {
    const user     = await requireAuth();
    const supabase = await createClient();

    // Verifica posse antes de qualquer operacao
    const { data: conn, error: fetchErr } = await supabase
      .from("open_finance_connection")
      .select("provider_item_id, provider")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !conn) {
      return { data: null, error: "Conexao nao encontrada." };
    }

    // Revoga no provider (best-effort — nao bloqueia o soft-delete se falhar)
    try {
      const provider = await getOpenFinanceProvider();
      await provider.disconnect(conn.provider_item_id);
    } catch {
      // Continua mesmo se o provider estiver fora do ar
    }

    // Soft-delete + status disconnected
    const { error: updateErr } = await supabase
      .from("open_finance_connection")
      .update({
        status:     "disconnected",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateErr) return { data: null, error: updateErr.message };

    revalidatePath("/settings/open-finance");
    return { data: null, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao remover conexao.";
    return { data: null, error: msg };
  }
}
