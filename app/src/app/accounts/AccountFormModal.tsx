"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { createAccount, updateAccount } from "@/services/financial-account";
import type {
  FinancialAccount,
  Institution,
  AccountFormData,
  AccountType,
} from "@/types/financial-account";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_COLORS,
  ACCOUNT_ICONS,
  CURRENCIES,
} from "@/types/financial-account";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AccountFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (account: FinancialAccount) => void;
  institutions: Institution[];
  /** Se fornecido, é edição. Caso contrário, criação. */
  account?: FinancialAccount | null;
}

// ── Icon map (Lucide names → SVG inline) ─────────────────────────────────────

function AccountIconPreview({ icon, color }: { icon: string; color: string }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-[15px] font-bold"
      style={{ backgroundColor: color || "#6366F1" }}
      aria-hidden
    >
      {icon ? icon.charAt(0).toUpperCase() : "C"}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM: AccountFormData = {
  name:           "",
  institution_id: "",
  type:           "checking",
  balance:        "0",
  currency:       "BRL",
  color:          ACCOUNT_COLORS[0],
  icon:           "wallet",
  notes:          "",
};

export function AccountFormModal({
  open,
  onClose,
  onSuccess,
  institutions,
  account,
}: AccountFormModalProps) {
  const isEdit = !!account;

  const [form, setForm] = React.useState<AccountFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Partial<Record<keyof AccountFormData, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Preenche form ao abrir para edição
  React.useEffect(() => {
    if (open) {
      if (account) {
        setForm({
          name:           account.name,
          institution_id: account.institution_id ?? "",
          type:           account.type,
          balance:        String(account.balance),
          currency:       account.currency,
          color:          account.color ?? ACCOUNT_COLORS[0],
          icon:           account.icon ?? "wallet",
          notes:          account.notes ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setServerError(null);
    }
  }, [open, account]);

  // Fecha com Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function set<K extends keyof AccountFormData>(key: K, value: AccountFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Nome é obrigatório.";
    if (!form.type) next.type = "Tipo é obrigatório.";
    const b = parseFloat(form.balance.replace(",", "."));
    if (isNaN(b)) next.balance = "Saldo inválido.";
    if (!form.currency) next.currency = "Moeda é obrigatória.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError(null);

    try {
      const result = isEdit && account
        ? await updateAccount(account.id, form)
        : await createAccount(form);

      if (result.error) {
        setServerError(result.error);
      } else if (result.data) {
        onSuccess(result.data);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const institutionOptions = [
    { value: "", label: "Sem instituição" },
    ...institutions.map((i) => ({ value: i.id, label: i.name })),
  ];

  const typeOptions = (Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(
    ([value, label]) => ({ value, label })
  );

  const iconOptions = ACCOUNT_ICONS.map((i) => ({ value: i.value, label: i.label }));
  const currencyOptions = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Editar conta" : "Nova conta"}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl",
          "max-h-[90vh] overflow-y-auto"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <AccountIconPreview icon={form.icon} color={form.color} />
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">
                {isEdit ? "Editar conta" : "Nova conta"}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {isEdit ? "Atualize os dados da conta" : "Adicione uma conta financeira"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-6 py-5">
            {/* Server error */}
            {serverError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                {serverError}
              </div>
            )}

            {/* Nome */}
            <Input
              label="Nome da conta *"
              placeholder="Ex: Nubank Conta"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
              autoFocus
            />

            {/* Instituição + Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Instituição"
                options={institutionOptions}
                value={form.institution_id}
                onChange={(v) => set("institution_id", v)}
                placeholder="Selecione"
              />
              <Select
                label="Tipo de conta *"
                options={typeOptions}
                value={form.type}
                onChange={(v) => set("type", v as AccountType)}
                error={errors.type}
              />
            </div>

            {/* Saldo + Moeda */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Saldo inicial *"
                placeholder="0,00"
                value={form.balance}
                onChange={(e) => set("balance", e.target.value)}
                error={errors.balance}
                inputMode="decimal"
              />
              <Select
                label="Moeda *"
                options={currencyOptions}
                value={form.currency}
                onChange={(v) => set("currency", v)}
                error={errors.currency}
              />
            </div>

            {/* Ícone */}
            <Select
              label="Ícone"
              options={iconOptions}
              value={form.icon}
              onChange={(v) => set("icon", v)}
            />

            {/* Cor */}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-foreground">Cor</span>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    aria-label={`Cor ${c}`}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                      form.color === c
                        ? "border-foreground scale-110 shadow-md"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anotações opcionais sobre a conta..."
                rows={2}
                className={cn(
                  "w-full resize-none rounded-lg border border-border bg-background px-3 py-2",
                  "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                  "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
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
              className="h-9 rounded-lg border border-border px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold text-white",
                "bg-gradient-to-r from-blue-500 to-violet-600 transition-opacity hover:opacity-90",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? isEdit ? "Salvando…" : "Criando…"
                : isEdit ? "Salvar alterações" : "Criar conta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
