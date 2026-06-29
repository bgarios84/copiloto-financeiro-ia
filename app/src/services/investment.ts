"use server";

/**
 * Service — Investment Position (Server Actions)
 * Sprint 6.4 — Módulo de Investimentos
 * Sprint 6.5 — adicionado getInvestmentPositionById
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
 * Resolve os valores derivados a partir do formulário.
 * Regras MVP:
 *   - current_price  = informado ?? average_price (fallback inicial)
 *   - current_value  = informado ?? quantity * current_price
 *   - acquisition_value = informado ?? quantity * average_price
 */
function resolveValues(form: InvestmentFormData): {
  current_price:     number | null;
  current_value:     number | null;
  acquisition_value: number | null;
} {
  const qty = parseNum(form.quantity);
  const ap  = parseNum(form.average_price);
  const cv  = parseNum(form.current_value);
  const acv = parseNum(form.acquisition_value);

  // Se current_price nao informado, usa average_price como fallback inicial
  const cp = parseNum(form.current_price) ?? ap;

  return {
    current_price:     cp,
    current_value:     cv  ?? (qty !== null && cp !== null ? qty * cp  : null),
    acquisition_value: acv ?? (qty !== null && ap !== null ? qty * ap  : null),
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Retorna uma posição específica pelo ID (do usuário autenticado).
 * Usado pela página /investments/[id]/trades.
 */
export async function getInvestmentPositionById(
  id: string
): Promise<ServiceResult<InvestmentPosition>> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_position")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as InvestmentPosition, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar posicao." };
  }
}

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
    const { current_price, current_value, acquisition_value } = resolveValues(form);

    const { data, error } = await supabase
      .from("investment_position")
      .insert({
        user_id:           userId,
        asset_name:        form.asset_name.trim(),
        ticker:            form.ticker.trim() || null,
        asset_class:       form.asset_class,
        quantity:          parseNum(form.quantity),
        average_price:     parseNum(form.average_price),
        current_price,
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
    return { data: null, error: "Erro ao criar posicao." };
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
    const { current_price, current_value, acquisition_value } = resolveValues(form);

    const { data, error } = await supabase
      .from("investment_position")
      .update({
        asset_name:        form.asset_name.trim(),
        ticker:            form.ticker.trim() || null,
        asset_class:       form.asset_class,
        quantity:          parseNum(form.quantity),
        average_price:     parseNum(form.average_price),
        current_price,
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
    return { data: null, error: "Erro ao atualizar posicao." };
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
    return { data: null, error: "Erro ao excluir posicao." };
  }
}
