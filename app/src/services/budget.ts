"use server";

/**
 * Service — Budget
 * Sprint 5.6 — Orçamentos por Categoria
 *
 * Todas as funções são Server Actions.
 * RLS filtra por user_id automaticamente.
 * requireAuth() fornece segunda camada de proteção server-side.
 *
 * Chave composta de negócio: (user_id, category_id, month)
 * O UUID (id) não é exposto na UI — operações de update/delete
 * usam a constraint UNIQUE para localizar o registro.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { toMonthDate } from "@/lib/date";
import type {
  Budget,
  BudgetComparison,
  BudgetFormData,
  ServiceResult,
} from "@/types/budget";

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Busca dados de comparação orçamento × realizado para um dado mês.
 * Usa a view category_budget_comparison (FULL OUTER JOIN).
 *
 * @param monthDate - "YYYY-MM-01"
 */
export async function getBudgetComparison(
  monthDate: string
): Promise<ServiceResult<BudgetComparison[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("category_budget_comparison")
      .select("*")
      .eq("month", monthDate)
      .order("actual_amount", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data as BudgetComparison[]) ?? [], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar orçamentos." };
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Cria um novo orçamento para a categoria/mês.
 * Falha se já existir um orçamento ativo (UNIQUE constraint).
 */
export async function createBudget(
  monthDate: string,
  form: BudgetFormData
): Promise<ServiceResult<Budget>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const planned_amount = parseFloat(form.planned_amount.replace(",", "."));
    if (isNaN(planned_amount) || planned_amount <= 0) {
      return { data: null, error: "Valor planejado deve ser maior que zero." };
    }
    if (!form.category_id) {
      return { data: null, error: "Selecione uma categoria." };
    }

    const month = toMonthDate(monthDate);

    const payload = {
      user_id:        user.id,
      category_id:    form.category_id,
      month,
      planned_amount,
      currency:       form.currency || "BRL",
      notes:          form.notes.trim() || null,
    };

    const { data, error } = await supabase
      .from("budget")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      // Violação de UNIQUE (23505) → mensagem amigável
      if (error.code === "23505") {
        return { data: null, error: "Já existe um orçamento para essa categoria neste mês." };
      }
      return { data: null, error: error.message };
    }

    revalidatePath("/budgets");
    return { data: data as Budget, error: null };
  } catch {
    return { data: null, error: "Erro ao criar orçamento." };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Atualiza planned_amount, currency e notes de um orçamento existente.
 * Localiza via composite key (user_id implícito via RLS, category_id, month).
 */
export async function updateBudget(
  categoryId: string,
  monthDate: string,
  form: Pick<BudgetFormData, "planned_amount" | "currency" | "notes">
): Promise<ServiceResult<Budget>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const planned_amount = parseFloat(form.planned_amount.replace(",", "."));
    if (isNaN(planned_amount) || planned_amount <= 0) {
      return { data: null, error: "Valor planejado deve ser maior que zero." };
    }

    const month = toMonthDate(monthDate);

    const { data, error } = await supabase
      .from("budget")
      .update({
        planned_amount,
        currency: form.currency || "BRL",
        notes:    form.notes.trim() || null,
      })
      .eq("category_id", categoryId)
      .eq("month", month)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/budgets");
    return { data: data as Budget, error: null };
  } catch {
    return { data: null, error: "Erro ao atualizar orçamento." };
  }
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────

/**
 * Soft-delete: seta deleted_at = now().
 * Localiza via composite key (user_id implícito via RLS, category_id, month).
 */
export async function deleteBudget(
  categoryId: string,
  monthDate: string
): Promise<ServiceResult<true>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const month = toMonthDate(monthDate);

    const { error } = await supabase
      .from("budget")
      .update({ deleted_at: new Date().toISOString() })
      .eq("category_id", categoryId)
      .eq("month", month)
      .is("deleted_at", null);

    if (error) return { data: null, error: error.message };

    revalidatePath("/budgets");
    return { data: true, error: null };
  } catch {
    return { data: null, error: "Erro ao excluir orçamento." };
  }
}
