"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { createTransaction, updateTransaction } from "@/services/transaction";
import type {
  Transaction,
  TransactionFormData,
  TransactionType,
  TransactionStatus,
  Category,
} from "@/types/transaction";
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_CURRENCIES,
} from "@/types/transaction";
import type { FinancialAccount } from "@/types/financial-account";
import type { CreditCard } from "@/types/credit-card";

interface TransactionFormModalProps {
  open:         boolean;
  onClose:      () => void;
  onSuccess:    (tx: Transaction) => void;
  accounts:     FinancialAccount[];
  cards:        CreditCard[];
  categories:   Category[];
  transaction?: Transaction | null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: TransactionFormData = {
  description: "",
  amount:      "0",
  date:        todayISO(),
  type:        "expense",
  category_id: "",
  account_id:  "",
  card_id:     "",
  currency:    "BRL",
  notes:       "",
  status:      "confirmed",
};

// ── Type tabs ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<TransactionType, string> = {
  income:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  expense:  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  transfer: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

function TypeButton({
  value,
  current,
  onClick,
}: {
  value:   TransactionType;
  current: TransactionType;
  onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border py-2 text-[13px] font-semibold transition-all",
        active
          ? TYPE_COLORS[value]
          : "border-border text-muted-foreground hover:border-border/80 hover:bg-secondary/50"
      )}
    >
      {TRANSACTION_TYPE_LABELS[value]}
    </button>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function TransactionFormModal({
  open,
  onClose,
  onSuccess,
  accounts,
  cards,
  categories,
  transaction,
}: TransactionFormModalProps) {
  const isEdit = !!transaction;
  const [form, setForm] = React.useState<TransactionFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Partial<Record<keyof TransactionFormData, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (transaction) {
        setForm({
          description: transaction.description,
          amount:      String(transaction.amount),
          date:        transaction.date,
          type:        transaction.type,
          category_id: transaction.category_id ?? "",
          account_id:  transaction.account_id  ?? "",
          card_id:     transaction.card_id      ?? "",
          currency:    transaction.currency,
          notes:       transaction.notes         ?? "",
          status:      transaction.status,
        });
      } else {
        setForm({ ...EMPTY_FORM, date: todayISO() });
      }
      setErrors({});
      setServerError(null);
    }
  }, [open, transaction]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function set<K extends keyof TransactionFormData>(key: K, value: TransactionFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.description.trim()) next.description = "Descrição obrigatória.";
    const amt = parseFloat(form.amount.replace(",", "."));
    if (isNaN(amt) || amt < 0) next.amount = "Valor inválido.";
    if (!form.date) next.date = "Data obrigatória.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    try {
      const result = isEdit && transaction
        ? await updateTransaction(transaction.id, form)
        : await createTransaction(form);
      if (result.error) setServerError(result.error);
      else if (result.data) { onSuccess(result.data); onClose(); }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  // ── Derived options ─────────────────────────────────────────────────────────

  const accountOptions = [
    { value: "", label: "Nenhuma conta" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const cardOptions = [
    { value: "", label: "Nenhum cartão" },
    ...cards.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name })),
  ];

  // Filtra categorias compatíveis com o tipo selecionado
  const compatibleCategories = categories.filter(
    (c) => c.type === form.type || c.type === "both"
  );
  const categoryOptions = [
    { value: "", label: "Sem categoria" },
    ...compatibleCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const currencyOptions = TRANSACTION_CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

  const statusOptions = (Object.entries(TRANSACTION_STATUS_LABELS) as [TransactionStatus, string][]).map(
    ([value, label]) => ({ value, label })
  );

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">
              {isEdit ? "Editar transação" : "Nova transação"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isEdit ? "Atualize os dados da transação" : "Registre uma receita, despesa ou transferência"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-6 py-5">
            {serverError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                {serverError}
              </div>
            )}

            {/* Tipo */}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-foreground">Tipo *</span>
              <div className="flex gap-2">
                {(["income", "expense", "transfer"] as TransactionType[]).map((t) => (
                  <TypeButton
                    key={t}
                    value={t}
                    current={form.type}
                    onClick={() => {
                      set("type", t);
                      // Limpa categoria ao trocar tipo (pode ser incompatível)
                      set("category_id", "");
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Descrição */}
            <Input
              label="Descrição *"
              placeholder="Ex: Supermercado, Salário, Aluguel..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              error={errors.description}
              autoFocus
            />

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valor *"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                error={errors.amount}
                inputMode="decimal"
              />
              <Input
                label="Data *"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                error={errors.date}
              />
            </div>

            {/* Categoria + Moeda */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Categoria"
                options={categoryOptions}
                value={form.category_id}
                onChange={(v) => set("category_id", v)}
              />
              <Select
                label="Moeda *"
                options={currencyOptions}
                value={form.currency}
                onChange={(v) => set("currency", v)}
              />
            </div>

            {/* Conta + Cartão */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Conta"
                options={accountOptions}
                value={form.account_id}
                onChange={(v) => set("account_id", v)}
              />
              {form.type === "expense" && (
                <Select
                  label="Cartão (opcional)"
                  options={cardOptions}
                  value={form.card_id}
                  onChange={(v) => set("card_id", v)}
                />
              )}
              {form.type !== "expense" && (
                <Select
                  label="Status"
                  options={statusOptions}
                  value={form.status}
                  onChange={(v) => set("status", v as TransactionStatus)}
                />
              )}
            </div>

            {/* Status (expense) */}
            {form.type === "expense" && (
              <Select
                label="Status"
                options={statusOptions}
                value={form.status}
                onChange={(v) => set("status", v as TransactionStatus)}
              />
            )}

            {/* Transfer notice */}
            {form.type === "transfer" && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-[12px] text-blue-600 dark:text-blue-400">
                Transferências registram a saída da conta selecionada. O vínculo com a conta destino será suportado em versão futura.
              </div>
            )}

            {/* Observação */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Observação</label>
              <textarea
                placeholder="Detalhes adicionais..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className={cn(
                  "w-full resize-none rounded-lg border border-border bg-background px-3 py-2",
                  "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 rounded-lg border border-border px-4 text-[13px] font-medium text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold text-white",
                "bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? (isEdit ? "Salvando..." : "Criando...")
                : (isEdit ? "Salvar alterações" : "Criar transação")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
