"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { createCard, updateCard } from "@/services/credit-card";
import type { CreditCard, CreditCardFormData, CardBrand } from "@/types/credit-card";
import { CARD_BRAND_LABELS, CARD_COLORS, CARD_CURRENCIES, DAY_OPTIONS } from "@/types/credit-card";
import type { Institution } from "@/types/financial-account";

interface CreditCardFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (card: CreditCard) => void;
  institutions: Institution[];
  card?: CreditCard | null;
}

function CardChip({ color, brand, lastFour }: { color: string; brand: string; lastFour: string }) {
  return (
    <div
      className="flex h-10 w-16 shrink-0 items-end justify-end rounded-lg p-1.5"
      style={{ background: "linear-gradient(135deg, " + color + "cc, " + color + ")" }}
      aria-hidden
    >
      <span className="text-[10px] font-bold tracking-widest text-white/90">
        {lastFour ? "..." + lastFour : brand.slice(0, 4).toUpperCase()}
      </span>
    </div>
  );
}

const EMPTY_FORM: CreditCardFormData = {
  name:           "",
  institution_id: "",
  brand:          "",
  last_four:      "",
  credit_limit:   "0",
  currency:       "BRL",
  closing_day:    "1",
  due_day:        "10",
  color:          CARD_COLORS[0],
  is_active:      true,
};

export function CreditCardFormModal({ open, onClose, onSuccess, institutions, card }: CreditCardFormModalProps) {
  const isEdit = !!card;
  const [form, setForm] = React.useState<CreditCardFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Partial<Record<keyof CreditCardFormData, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (card) {
        setForm({
          name:           card.name,
          institution_id: card.institution_id ?? "",
          brand:          card.brand ?? "",
          last_four:      card.last_four ?? "",
          credit_limit:   String(card.credit_limit),
          currency:       card.currency ?? "BRL",
          closing_day:    String(card.closing_day),
          due_day:        String(card.due_day),
          color:          card.color ?? CARD_COLORS[0],
          is_active:      card.is_active,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setServerError(null);
    }
  }, [open, card]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function set<K extends keyof CreditCardFormData>(key: K, value: CreditCardFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Nome obrigatorio.";
    const limit = parseFloat(form.credit_limit.replace(",", "."));
    if (isNaN(limit) || limit < 0) next.credit_limit = "Limite invalido.";
    const cd = parseInt(form.closing_day, 10);
    if (!cd || cd < 1 || cd > 31) next.closing_day = "Dia invalido (1-31).";
    const dd = parseInt(form.due_day, 10);
    if (!dd || dd < 1 || dd > 31) next.due_day = "Dia invalido (1-31).";
    if (form.last_four && !/^\d{4}$/.test(form.last_four)) next.last_four = "Informe os 4 ultimos digitos.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    try {
      const result = isEdit && card ? await updateCard(card.id, form) : await createCard(form);
      if (result.error) setServerError(result.error);
      else if (result.data) { onSuccess(result.data); onClose(); }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const institutionOptions = [
    { value: "", label: "Sem instituicao" },
    ...institutions.map((i) => ({ value: i.id, label: i.name })),
  ];
  const brandOptions = [
    { value: "", label: "Selecione a bandeira" },
    ...(Object.entries(CARD_BRAND_LABELS) as [CardBrand, string][]).map(([value, label]) => ({ value, label })),
  ];
  const currencyOptions = CARD_CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <CardChip color={form.color} brand={form.brand} lastFour={form.last_four} />
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">
                {isEdit ? "Editar cartao" : "Novo cartao"}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {isEdit ? "Atualize os dados do cartao" : "Adicione um cartao de credito"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
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

            <Input
              label="Nome do cartao *"
              placeholder="Ex: Nubank Roxinho"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Instituicao" options={institutionOptions} value={form.institution_id} onChange={(v) => set("institution_id", v)} />
              <Select label="Bandeira" options={brandOptions} value={form.brand} onChange={(v) => set("brand", v as CardBrand | "")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ultimos 4 digitos"
                placeholder="1234"
                value={form.last_four}
                onChange={(e) => set("last_four", e.target.value.replace(/\D/g, "").slice(0, 4))}
                error={errors.last_four}
                inputMode="numeric"
                maxLength={4}
              />
              <Select label="Moeda *" options={currencyOptions} value={form.currency} onChange={(v) => set("currency", v)} />
            </div>

            <Input
              label="Limite total *"
              placeholder="5000,00"
              value={form.credit_limit}
              onChange={(e) => set("credit_limit", e.target.value)}
              error={errors.credit_limit}
              inputMode="decimal"
            />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Dia de fechamento *" options={DAY_OPTIONS} value={form.closing_day} onChange={(v) => set("closing_day", v)} error={errors.closing_day} />
              <Select label="Dia de vencimento *" options={DAY_OPTIONS} value={form.due_day} onChange={(v) => set("due_day", v)} error={errors.due_day} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-foreground">Cor do cartao</span>
              <div className="flex flex-wrap gap-2">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    aria-label={"Cor " + c}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                      form.color === c ? "border-foreground scale-110 shadow-md" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
                <div className={cn("h-5 w-9 rounded-full transition-colors", form.is_active ? "bg-primary" : "bg-muted")} />
                <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", form.is_active ? "translate-x-4" : "translate-x-0.5")} />
              </div>
              <span className="text-[13px] font-medium text-foreground">Cartao ativo</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button type="button" onClick={onClose} disabled={loading} className="h-9 rounded-lg border border-border px-4 text-[13px] font-medium text-foreground hover:bg-secondary disabled:opacity-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn("flex h-9 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed")}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? (isEdit ? "Salvando..." : "Criando...") : (isEdit ? "Salvar alteracoes" : "Criar cartao")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
