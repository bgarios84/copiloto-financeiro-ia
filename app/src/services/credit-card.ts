"use server";

/**
 * Service -- Credit Card
 * Sprint 5.2 / 5.2A (multi-moeda)
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import type {
  CreditCard,
  CreditCardFormData,
  ServiceResult,
} from "@/types/credit-card";

// -- Read ----------------------------------------------------------------------

export async function getCards(): Promise<ServiceResult<CreditCard[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("credit_card")
      .select(`*, institution:institution_id (id, name, short_name, logo_url, color, is_active)`)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data as CreditCard[]) ?? [], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar cartoes." };
  }
}

// -- Create -------------------------------------------------------------------

export async function createCard(
  form: CreditCardFormData
): Promise<ServiceResult<CreditCard>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const limitNum = parseFloat(form.credit_limit.replace(",", "."));
    if (isNaN(limitNum) || limitNum < 0) return { data: null, error: "Limite invalido." };
    const closingDay = parseInt(form.closing_day, 10);
    const dueDay = parseInt(form.due_day, 10);
    if (!closingDay || closingDay < 1 || closingDay > 31) return { data: null, error: "Dia de fechamento invalido (1-31)." };
    if (!dueDay || dueDay < 1 || dueDay > 31) return { data: null, error: "Dia de vencimento invalido (1-31)." };

    const payload = {
      user_id:         user.id,
      name:            form.name.trim(),
      institution_id:  form.institution_id || null,
      brand:           form.brand || null,
      last_four:       form.last_four.trim() || null,
      credit_limit:    limitNum,
      available_limit: limitNum,
      currency:        form.currency || "BRL",
      closing_day:     closingDay,
      due_day:         dueDay,
      color:           form.color || null,
      is_active:       form.is_active,
    };

    const { data, error } = await supabase
      .from("credit_card")
      .insert(payload)
      .select(`*, institution:institution_id (id, name, short_name, logo_url, color, is_active)`)
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/credit-cards");
    return { data: data as CreditCard, error: null };
  } catch {
    return { data: null, error: "Erro ao criar cartao." };
  }
}

// -- Update -------------------------------------------------------------------

export async function updateCard(
  id: string,
  form: CreditCardFormData
): Promise<ServiceResult<CreditCard>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const limitNum = parseFloat(form.credit_limit.replace(",", "."));
    if (isNaN(limitNum) || limitNum < 0) return { data: null, error: "Limite invalido." };
    const closingDay = parseInt(form.closing_day, 10);
    const dueDay = parseInt(form.due_day, 10);
    if (!closingDay || closingDay < 1 || closingDay > 31) return { data: null, error: "Dia de fechamento invalido (1-31)." };
    if (!dueDay || dueDay < 1 || dueDay > 31) return { data: null, error: "Dia de vencimento invalido (1-31)." };

    const payload = {
      name:           form.name.trim(),
      institution_id: form.institution_id || null,
      brand:          form.brand || null,
      last_four:      form.last_four.trim() || null,
      credit_limit:   limitNum,
      currency:       form.currency || "BRL",
      closing_day:    closingDay,
      due_day:        dueDay,
      color:          form.color || null,
      is_active:      form.is_active,
    };

    const { data, error } = await supabase
      .from("credit_card")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select(`*, institution:institution_id (id, name, short_name, logo_url, color, is_active)`)
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath("/credit-cards");
    return { data: data as CreditCard, error: null };
  } catch {
    return { data: null, error: "Erro ao atualizar cartao." };
  }
}

// -- Delete (soft) ------------------------------------------------------------

export async function deleteCard(id: string): Promise<ServiceResult<true>> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { error } = await supabase
      .from("credit_card")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) return { data: null, error: error.message };
    revalidatePath("/credit-cards");
    return { data: true, error: null };
  } catch {
    return { data: null, error: "Erro ao excluir cartao." };
  }
}
