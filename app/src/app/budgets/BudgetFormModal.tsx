"use client";

/**
 * BudgetFormModal — Sprint 5.6
 *
 * Modal para criar e editar orçamentos mensais por categoria.
 *
 * - Criação: categoria select (tipo expense/both), valor, moeda, notas
 * - Edição: categoria read-only, valor editável, moeda, notas
 * - Mês: sempre read-only (vem do contexto do mês selecionado)
 * - Categoria filtrada: apenas expense + both (sem income-only)
 */

import * as React from "react";
import { X, PiggyBank, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBudget, updateBudget } from "@/services/budget";
import type { BudgetComparison, BudgetFormData } from "@/types/budget";
import type { Category } from "@/types/transaction";

// ── Month label helper ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function monthLabel(monthDate: string): string {
  const [year, month] = monthDate.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface BudgetFormModalProps {
  open:       boolean;
  onClose:    () => void;
  onSuccess:  (item: BudgetComparison) => void;
  categories: Category[];
  /** Mês selecionado — "YYYY-MM-01" */
  month:      string;
  /** Se preenchido, modo de edição */
  editing:    BudgetComparison | null;
}

// ── Currencies ─────────────────────────────────────────────────────────────────

const CURRENCIES = ["BRL", "USD", "EUR", "GBP"];

// Verifica se o valor é um emoji (não um nome de ícone Lucide como "home")
function isCategoryEmoji(str: string | null | undefined): boolean {
  if (!str) return false;
  // Emojis têm code points > 0xFF e geralmente ≤ 2 chars de comprimento visual
  return /\p{Emoji}/u.test(str) && str.replace(/\s/g, "").length <= 4;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BudgetFormModal({
  open, onClose, onSuccess, categories, month, editing,
}: BudgetFormModalProps) {
  const isEditing = editing !== null;

  // ── Form state ─────────────────────────────────────────────────────────────

  const [form, setForm] = React.useState<BudgetFormData>({
    category_id:    "",
    planned_amount: "",
    currency:       "BRL",
    notes:          "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState<string | null>(null);

  // ── Sync form when editing changes ─────────────────────────────────────────

  React.useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }
    if (isEditing && editing) {
      setForm({
        category_id:    editing.category_id ?? "",
        planned_amount: String(editing.planned_amount ?? ""),
        currency:       "BRL",
        notes:          "",
      });
    } else {
      setForm({ category_id: "", planned_amount: "", currency: "BRL", notes: "" });
    }
    setError(null);
  }, [open, editing, isEditing]);

  // ── Filtered categories: expense + both ───────────────────────────────────

  const expenseCategories = React.useMemo(
    () => categories.filter((c) => c.type === "expense" || c.type === "both"),
    [categories]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  function set(field: keyof BudgetFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let result;

    if (isEditing && editing) {
      result = await updateBudget(editing.category_id ?? "", month, {
        planned_amount: form.planned_amount,
        currency:       form.currency,
        notes:          form.notes,
      });
    } else {
      result = await createBudget(month, form);
    }

    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Erro inesperado.");
      return;
    }

    const saved = result.data;

    // Monta BudgetComparison local para atualização otimista
    const category = expenseCategories.find((c) => c.id === form.category_id)
      ?? (isEditing && editing ? { name: editing.category_name, color: editing.category_color, icon: editing.category_icon } : null);

    const optimistic: BudgetComparison = {
      user_id:           saved.user_id,
      month,
      category_id:       saved.category_id,
      category_name:     (category as Category)?.name  ?? editing?.category_name  ?? "Sem categoria",
      category_color:    (category as Category)?.color ?? editing?.category_color ?? null,
      category_icon:     (category as Category)?.icon  ?? editing?.category_icon  ?? null,
      planned_amount:    saved.planned_amount,
      actual_amount:     editing?.actual_amount     ?? 0,
      transaction_count: editing?.transaction_count ?? 0,
      difference_amount: saved.planned_amount - (editing?.actual_amount ?? 0),
      usage_percentage:
        saved.planned_amount > 0
          ? Math.round(((editing?.actual_amount ?? 0) / saved.planned_amount) * 10000) / 100
          : null,
    };

    onSuccess(optimistic);
    onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative z-10 w-full max-w-md rounded-2xl border border-border",
        "bg-card shadow-2xl"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <PiggyBank className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">
                {isEditing ? "Editar orçamento" : "Novo orçamento"}
              </p>
              <p className="text-[11px] text-muted-foreground">{monthLabel(month)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Categoria <span className="text-destructive">*</span>
            </label>
            {isEditing ? (
              <div className={cn(
                "flex h-9 items-center rounded-lg border border-border bg-muted/50 px-3",
                "text-[13px] text-muted-foreground"
              )}>
                {editing?.category_icon && isCategoryEmoji(editing.category_icon) && (
                  <span className="mr-2">{editing.category_icon}</span>
                )}
                {editing?.category_name}
              </div>
            ) : (
              <select
                value={form.category_id}
                onChange={(e) => set("category_id", e.target.value)}
                required
                className={cn(
                  "h-9 w-full rounded-lg border border-border bg-background px-3",
                  "text-[13px] text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
                  "transition-colors"
                )}
              >
                <option value="">Selecione uma categoria</option>
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Planned amount + currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Valor planejado <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.planned_amount}
                onChange={(e) => set("planned_amount", e.target.value)}
                required
                autoFocus={!isEditing}
                className={cn(
                  "h-9 w-full rounded-lg border border-border bg-background px-3",
                  "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
                  "transition-colors"
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Moeda
              </label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-border bg-background px-3",
                  "text-[13px] text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
                  "transition-colors"
                )}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Observações
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Opcional..."
              rows={2}
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-background px-3 py-2",
                "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
                "transition-colors"
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "h-9 rounded-lg px-4 text-[13px] font-medium",
                "text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              )}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "h-9 rounded-lg px-5 text-[13px] font-semibold text-white",
                "bg-gradient-to-r from-blue-500 to-violet-600",
                "transition-opacity hover:opacity-90 disabled:opacity-60"
              )}
            >
              {loading
                ? "Salvando..."
                : isEditing
                ? "Salvar alterações"
                : "Criar orçamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
