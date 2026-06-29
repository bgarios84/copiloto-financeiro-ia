"use server";

/**
 * Service — Transaction
 * Sprint 5.3
 *
 * Todas as funções são Server Actions.
 * RLS filtra por user_id automaticamente.
 * requireAuth() fornece segunda camada de proteção server-side.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import type {
  Transaction,
  TransactionFormData,
  Category,
  ServiceResult,
} from "@/types/transaction";

// ── Categories ────────────────────────────────────────────────────────────────

/**
 * Retorna categorias do sistema + categorias do usuário autenticado.
 * Ordenadas por type (expense → income → both) e sort_order.
 */
export async function getCategories(): Promise<ServiceResult<Category[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("category")
      .select("id, user_id, parent_id, name, icon, color, type, is_system, sort_order")
      .is("deleted_at", null)
      .is("parent_id", null)          // apenas categorias pai
      .order("sort_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data as Category[]) ?? [], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar categorias." };
  }
}

// ── Transactions — Read ───────────────────────────────────────────────────────

export interface TransactionFilters {
  type?:  "income" | "expense" | "transfer";
  year?:  number;
  month?: number;   // 1-12
  limit?: number;
}

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<ServiceResult<Transaction[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    let query = supabase
      .from("transaction")
      .select(`
        *,
        category:category_id (id, user_id, parent_id, name, icon, color, type, is_system, sort_order),
        account:account_id   (id, name, color),
        card:card_id         (id, name, color)
      `)
      .is("deleted_at", null)
      .eq("is_ignored", false)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.year && filters.month) {
      const start = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
      const end   = new Date(filters.year, filters.month, 0)
        .toISOString()
        .slice(0, 10);
      query = query.gte("date", start).lte("date", end);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data as Transaction[]) ?? [], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar transações." };
  }
}

// ── Summary por mês (hook para relatórios futuros) ────────────────────────────

export interface CategorySummary {
  category_id:   string | null;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  type:          "income" | "expense";
  total:         number;
  count:         number;
}

/**
 * Retorna totais por categoria para um dado mês.
 * Usado por relatórios de categoria mês a mês (Sprint futura).
 */
export async function getTransactionSummaryByMonth(
  year: number,
  month: number
): Promise<ServiceResult<CategorySummary[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end   = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("transaction")
      .select(`
        type, amount, category_id,
        category:category_id (name, color, icon)
      `)
      .is("deleted_at", null)
      .eq("is_ignored", false)
      .in("type", ["income", "expense"])
      .gte("date", start)
      .lte("date", end);

    if (error) return { data: null, error: error.message };

    // Agrupa por category_id + type em memória
    const map = new Map<string, CategorySummary>();
    for (const row of (data ?? []) as unknown as Array<{
      type: "income" | "expense";
      amount: number;
      category_id: string | null;
      category: { name: string; color: string | null; icon: string | null } | null;
    }>) {
      const key = `${row.category_id ?? "null"}_${row.type}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += row.amount;
        existing.count += 1;
      } else {
        map.set(key, {
          category_id:    row.category_id,
          category_name:  row.category?.name ?? "Sem categoria",
          category_color: row.category?.color ?? null,
          category_icon:  row.category?.icon  ?? null,
          type:           row.type,
          total:          row.amount,
          count:          1,
        });
      }
    }

    const result = Array.from(map.values()).sort((a, b) => b.total - a.total);
    return { data: result, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar resumo do mês." };
  }
}

// ── Transactions — Create ─────────────────────────────────────────────────────

export async function createTransaction(
  form: TransactionFormData
): Promise<ServiceResult<Transaction>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const amount = parseFloat(form.amount.replace(",", "."));
    if (isNaN(amount) || amount < 0) {
      return { data: null, error: "Valor inválido." };
    }
    if (!form.description.trim()) {
      return { data: null, error: "Descrição obrigatória." };
    }
    if (!form.date) {
      return { data: null, error: "Data obrigatória." };
    }

    const payload = {
      user_id:     user.id,
      description: form.description.trim(),
      amount,
      date:        form.date,
      type:        form.type,
      currency:    form.currency || "BRL",
      category_id: form.category_id || null,
      account_id:  form.account_id  || null,
      card_id:     form.card_id     || null,
      notes:       form.notes.trim() || null,
      status:      form.status || "confirmed",
      origin:      "manual",
    };

    const { data, error } = await supabase
      .from("transaction")
      .insert(payload)
      .select(`
        *,
        category:category_id (id, user_id, parent_id, name, icon, color, type, is_system, sort_order),
        account:account_id   (id, name, color),
        card:card_id         (id, name, color)
      `)
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/transactions");
    return { data: data as Transaction, error: null };
  } catch {
    return { data: null, error: "Erro ao criar transação." };
  }
}

// ── Transactions — Update ─────────────────────────────────────────────────────

export async function updateTransaction(
  id: string,
  form: TransactionFormData
): Promise<ServiceResult<Transaction>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const amount = parseFloat(form.amount.replace(",", "."));
    if (isNaN(amount) || amount < 0) {
      return { data: null, error: "Valor inválido." };
    }
    if (!form.description.trim()) {
      return { data: null, error: "Descrição obrigatória." };
    }

    const payload = {
      description: form.description.trim(),
      amount,
      date:        form.date,
      type:        form.type,
      currency:    form.currency || "BRL",
      category_id: form.category_id || null,
      account_id:  form.account_id  || null,
      card_id:     form.card_id     || null,
      notes:       form.notes.trim() || null,
      status:      form.status || "confirmed",
    };

    const { data, error } = await supabase
      .from("transaction")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select(`
        *,
        category:category_id (id, user_id, parent_id, name, icon, color, type, is_system, sort_order),
        account:account_id   (id, name, color),
        card:card_id         (id, name, color)
      `)
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/transactions");
    return { data: data as Transaction, error: null };
  } catch {
    return { data: null, error: "Erro ao atualizar transação." };
  }
}

// ── Transactions — Delete (soft) ──────────────────────────────────────────────

export async function deleteTransaction(
  id: string
): Promise<ServiceResult<true>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from("transaction")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return { data: null, error: error.message };
    revalidatePath("/transactions");
    return { data: true, error: null };
  } catch {
    return { data: null, error: "Erro ao excluir transação." };
  }
}
