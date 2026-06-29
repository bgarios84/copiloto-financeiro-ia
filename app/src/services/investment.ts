"use server";

/**
 * Service — Investment Position (Server Actions)
 * Sprint 6.4 — Módulo de Investimentos
 *
 * Apenas funções async — conformidade com "use server".
 * Todas as operações respeitam RLS + requireAuth() como segunda camada.
 */

import { createClient }  from "@/lib/supabase/server";
import { requireAuth }   from "@/lib/supabase/require-auth";
import { revalidatePath } from "next/cache";
import type {
  InvestmentPosition,
  InvestmentFormData,
  ServiceResult,
} from "@/types/investment";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

/**
 * Calcula current_value e acquisition_value a partir dos campos de posição.
 * Se o usuário informou diretamente, usa esses valores.
 * Senão, tenta calcular via quantity × price.
 */
function resolveValues(form: InvestmentFormData): {
  current_value:     number | null;
  acquisition_value: number | null;
} {
  const qty   = parseNum(form.quantity);
  const cp    = parseNum(form.current_price);
  const ap    = parseNum(form.average_price);
  const cv    = parseNum(form.current_value);
  const acv   = parseNum(form.acquisition_value);

  return {
    current_value:     cv  ?? (qty !== null && cp !== null ? qty * cp  : null),
    acquisition_value: acv ?? (qty !== null && ap !== null ? qty * ap  : null),
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Lista todas as posições ativas do usuário autenticado.
 * Exclui soft-deleted (deleted_at IS NULL).
 * Ordena por asset_class, depois asset_name.
 */
export async function getInvestmentPositions(): Promise<
  ServiceResult<InvestmentPosition[]>
> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_position")
      .select("*")
      .is("deleted_at", null)
      .order("asset_class", { ascending: true })
      .order("asset_name",  { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as InvestmentPosition[], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar investimentos." };
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createInvestmentPosition(
  form: InvestmentFormData
): Promise<ServiceResult<InvestmentPosition>> {
  try {
    const { id: userId } = await requireAuth();
    const supabase = await createClient();
    const { current_value, acquisition_value } = resolveValues(form);

    const { data, error } = await supabase
      .from("investment_position")
      .insert({
        user_id:           userId,
        asset_name:        form.asset_name.trim(),
        ticker:            form.ticker.trim() || null,
        asset_class:       form.asset_class,
        quantity:          parseNum(form.quantity),
        average_price:     parseNum(form.average_price),
        current_price:     parseNum(form.current_price),
        currency:          form.currency || "BRL",
        institution:       form.institution.trim() || null,
        current_value,
        acquisition_value,
        notes:             form.notes.trim() || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/investments");
    return { data: data as InvestmentPosition, error: null };
  } catch {
    return { data: null, error: "Erro ao criar posição." };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateInvestmentPosition(
  id: string,
  form: InvestmentFormData
): Promise<ServiceResult<InvestmentPosition>> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { current_value, acquisition_value } = resolveValues(form);

    const { data, error } = await supabase
      .from("investment_position")
      .update({
        asset_name:        form.asset_name.trim(),
        ticker:            form.ticker.trim() || null,
        asset_class:       form.asset_class,
        quantity:          parseNum(form.quantity),
        average_price:     parseNum(form.average_price),
        current_price:     parseNum(form.current_price),
        currency:          form.currency || "BRL",
        institution:       form.institution.trim() || null,
        current_value,
        acquisition_value,
        notes:             form.notes.trim() || null,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/investments");
    return { data: data as InvestmentPosition, error: null };
  } catch {
    return { data: null, error: "Erro ao atualizar posição." };
  }
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────

export async function deleteInvestmentPosition(
  id: string
): Promise<ServiceResult<null>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from("investment_position")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return { data: null, error: error.message };
    revalidatePath("/investments");
    return { data: null, error: null };
  } catch {
    return { data: null, error: "Erro ao excluir posição." };
  }
}
