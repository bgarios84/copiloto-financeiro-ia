"use server";

/**
 * Service — Manual Asset
 * Sprint 6.1 — Patrimônio Manual
 *
 * Todas as funções são Server Actions assíncronas.
 * RLS filtra por user_id automaticamente.
 * requireAuth() fornece segunda camada de proteção server-side.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import type {
  ManualAsset,
  ManualAssetFormData,
  ServiceResult,
} from "@/types/manual-asset";

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Retorna todos os ativos manuais ativos do usuário,
 * ordenados por valor atual decrescente.
 */
export async function getManualAssets(): Promise<ServiceResult<ManualAsset[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("manual_asset")
      .select("*")
      .is("deleted_at", null)
      .order("current_value", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data as ManualAsset[]) ?? [], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar patrimônio." };
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createManualAsset(
  form: ManualAssetFormData
): Promise<ServiceResult<ManualAsset>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const current_value = parseFloat(form.current_value.replace(",", "."));
    if (isNaN(current_value) || current_value < 0) {
      return { data: null, error: "Valor atual inválido." };
    }
    if (!form.name.trim()) {
      return { data: null, error: "Nome do ativo é obrigatório." };
    }

    const acqValue = form.acquisition_value.trim()
      ? parseFloat(form.acquisition_value.replace(",", "."))
      : null;
    if (acqValue !== null && (isNaN(acqValue) || acqValue < 0)) {
      return { data: null, error: "Valor de aquisição inválido." };
    }

    const payload = {
      user_id:           user.id,
      name:              form.name.trim(),
      asset_type:        form.asset_type,
      current_value,
      currency:          form.currency || "BRL",
      acquisition_value: acqValue,
      acquisition_date:  form.acquisition_date || null,
      custodian:         form.custodian.trim() || null,
      notes:             form.notes.trim() || null,
    };

    const { data, error } = await supabase
      .from("manual_asset")
      .insert(payload)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/wealth");
    return { data: data as ManualAsset, error: null };
  } catch {
    return { data: null, error: "Erro ao criar ativo." };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateManualAsset(
  id: string,
  form: ManualAssetFormData
): Promise<ServiceResult<ManualAsset>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const current_value = parseFloat(form.current_value.replace(",", "."));
    if (isNaN(current_value) || current_value < 0) {
      return { data: null, error: "Valor atual inválido." };
    }
    if (!form.name.trim()) {
      return { data: null, error: "Nome do ativo é obrigatório." };
    }

    const acqValue = form.acquisition_value.trim()
      ? parseFloat(form.acquisition_value.replace(",", "."))
      : null;
    if (acqValue !== null && (isNaN(acqValue) || acqValue < 0)) {
      return { data: null, error: "Valor de aquisição inválido." };
    }

    const { data, error } = await supabase
      .from("manual_asset")
      .update({
        name:              form.name.trim(),
        asset_type:        form.asset_type,
        current_value,
        currency:          form.currency || "BRL",
        acquisition_value: acqValue,
        acquisition_date:  form.acquisition_date || null,
        custodian:         form.custodian.trim() || null,
        notes:             form.notes.trim() || null,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/wealth");
    return { data: data as ManualAsset, error: null };
  } catch {
    return { data: null, error: "Erro ao atualizar ativo." };
  }
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────

export async function deleteManualAsset(id: string): Promise<ServiceResult<true>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from("manual_asset")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return { data: null, error: error.message };
    revalidatePath("/wealth");
    return { data: true, error: null };
  } catch {
    return { data: null, error: "Erro ao excluir ativo." };
  }
}
