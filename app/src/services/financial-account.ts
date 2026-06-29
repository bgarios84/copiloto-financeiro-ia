"use server";

/**
 * Service — Financial Account
 * Sprint 5.1
 *
 * Todas as funções são Server Actions.
 * RLS do Supabase garante isolamento por user_id automaticamente.
 * requireAuth() fornece segunda camada de proteção server-side.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import type {
  FinancialAccount,
  Institution,
  AccountFormData,
  ServiceResult,
} from "@/types/financial-account";

// ── Institutions ──────────────────────────────────────────────────────────────

export async function getInstitutions(): Promise<ServiceResult<Institution[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("institution")
      .select("id, name, short_name, logo_url, color, is_active")
      .eq("is_active", true)
      .order("name");

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar instituições." };
  }
}

// ── Accounts — Read ───────────────────────────────────────────────────────────

export async function getAccounts(): Promise<ServiceResult<FinancialAccount[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("financial_account")
      .select(`
        *,
        institution:institution_id (
          id, name, short_name, logo_url, color, is_active
        )
      `)
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data as FinancialAccount[]) ?? [], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar contas." };
  }
}

// ── Accounts — Create ─────────────────────────────────────────────────────────

export async function createAccount(
  form: AccountFormData
): Promise<ServiceResult<FinancialAccount>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const balanceNum = parseFloat(form.balance.replace(",", "."));
    if (isNaN(balanceNum)) {
      return { data: null, error: "Saldo inválido." };
    }

    const payload = {
      user_id:        user.id,
      name:           form.name.trim(),
      institution_id: form.institution_id || null,
      type:           form.type,
      balance:        balanceNum,
      currency:       form.currency || "BRL",
      color:          form.color || null,
      icon:           form.icon || null,
      notes:          form.notes.trim() || null,
      is_manual:      true,
      is_active:      true,
    };

    const { data, error } = await supabase
      .from("financial_account")
      .insert(payload)
      .select(`
        *,
        institution:institution_id (
          id, name, short_name, logo_url, color, is_active
        )
      `)
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/accounts");
    return { data: data as FinancialAccount, error: null };
  } catch {
    return { data: null, error: "Erro ao criar conta." };
  }
}

// ── Accounts — Update ─────────────────────────────────────────────────────────

export async function updateAccount(
  id: string,
  form: AccountFormData
): Promise<ServiceResult<FinancialAccount>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const balanceNum = parseFloat(form.balance.replace(",", "."));
    if (isNaN(balanceNum)) {
      return { data: null, error: "Saldo inválido." };
    }

    const payload = {
      name:           form.name.trim(),
      institution_id: form.institution_id || null,
      type:           form.type,
      balance:        balanceNum,
      currency:       form.currency || "BRL",
      color:          form.color || null,
      icon:           form.icon || null,
      notes:          form.notes.trim() || null,
    };

    const { data, error } = await supabase
      .from("financial_account")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select(`
        *,
        institution:institution_id (
          id, name, short_name, logo_url, color, is_active
        )
      `)
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/accounts");
    return { data: data as FinancialAccount, error: null };
  } catch {
    return { data: null, error: "Erro ao atualizar conta." };
  }
}

// ── Accounts — Delete (soft) ──────────────────────────────────────────────────

export async function deleteAccount(
  id: string
): Promise<ServiceResult<true>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from("financial_account")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return { data: null, error: error.message };

    revalidatePath("/accounts");
    return { data: true, error: null };
  } catch {
    return { data: null, error: "Erro ao excluir conta." };
  }
}
