"use client";

/**
 * WealthFormModal — Sprint 6.1
 *
 * Modal para criar e editar ativos patrimoniais manuais.
 */

import * as React from "react";
import { X, Landmark, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createManualAsset, updateManualAsset } from "@/services/manual-asset";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_ICONS,
} from "@/types/manual-asset";
import type { ManualAsset, ManualAssetFormData, AssetType } from "@/types/manual-asset";

// ── Constants ──────────────────────────────────────────────────────────────────

const ASSET_TYPES = Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][];
const CURRENCIES = ["BRL", "USD", "EUR", "GBP", "BTC", "ETH"];

const EMPTY_FORM: ManualAssetFormData = {
  name:              "",
  asset_type:        "cash",
  current_value:     "",
  currency:          "BRL",
  acquisition_value: "",
  acquisition_date:  "",
  custodian:         "",
  notes:             "",
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface WealthFormModalProps {
  open:      boolean;
  onClose:   () => void;
  onSuccess: (asset: ManualAsset) => void;
  editing:   ManualAsset | null;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WealthFormModal({ open, onClose, onSuccess, editing }: WealthFormModalProps) {
  const isEditing = editing !== null;

  const [form, setForm]       = React.useState<ManualAssetFormData>(EMPTY_FORM);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState<string | null>(null);

  // Sync form quando modal abre / muda de ativo
  React.useEffect(() => {
    if (!open) { setError(null); return; }
    if (isEditing && editing) {
      setForm({
        name:              editing.name,
        asset_type:        editing.asset_type,
        current_value:     String(editing.current_value),
        currency:          editing.currency,
        acquisition_value: editing.acquisition_value !== null ? String(editing.acquisition_value) : "",
        acquisition_date:  editing.acquisition_date ?? "",
        custodian:         editing.custodian ?? "",
        notes:             editing.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, editing, isEditing]);

  function set(field: keyof ManualAssetFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = isEditing && editing
      ? await updateManualAsset(editing.id, form)
      : await createManualAsset(form);

    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Erro inesperado.");
      return;
    }

    onSuccess(result.data);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={cn(
        "relative z-10 w-full max-w-lg rounded-2xl border border-border",
        "bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Landmark className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">
              {isEditing ? "Editar ativo" : "Novo ativo"}
            </p>
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

          {/* Asset type buttons */}
          <div>
            <label className="mb-2 block text-[12px] font-medium text-foreground">
              Tipo de ativo <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {ASSET_TYPES.map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("asset_type", type)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all",
                    form.asset_type === type
                      ? "border-blue-500/50 bg-blue-500/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-accent/50"
                  )}
                >
                  <span className="text-lg">{ASSET_TYPE_ICONS[type]}</span>
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Nome do ativo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={
                form.asset_type === "real_estate" ? "Ex: Apartamento Av. Paulista" :
                form.asset_type === "vehicle"      ? "Ex: Honda Civic 2022" :
                form.asset_type === "stock"        ? "Ex: PETR4, VALE3" :
                form.asset_type === "crypto"       ? "Ex: Bitcoin, Ethereum" :
                "Nome do ativo"
              }
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              autoFocus
              className={cn(
                "h-9 w-full rounded-lg border border-border bg-background px-3",
                "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              )}
            />
          </div>

          {/* Current value + currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Valor atual <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.current_value}
                onChange={(e) => set("current_value", e.target.value)}
                required
                className={cn(
                  "h-9 w-full rounded-lg border border-border bg-background px-3",
                  "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Moeda</label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-border bg-background px-3",
                  "text-[13px] text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                )}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Acquisition value + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Valor de aquisição
                <span className="ml-1 text-[10px] text-muted-foreground">(opcional)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.acquisition_value}
                onChange={(e) => set("acquisition_value", e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-border bg-background px-3",
                  "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Data de aquisição
                <span className="ml-1 text-[10px] text-muted-foreground">(opcional)</span>
              </label>
              <input
                type="date"
                value={form.acquisition_date}
                onChange={(e) => set("acquisition_date", e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-border bg-background px-3",
                  "text-[13px] text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                )}
              />
            </div>
          </div>

          {/* Custodian */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Instituição / Custodiante
              <span className="ml-1 text-[10px] text-muted-foreground">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder={
                form.asset_type === "fixed_income" || form.asset_type === "stock" || form.asset_type === "fii"
                  ? "Ex: XP, NuInvest, Clear"
                  : form.asset_type === "crypto"
                  ? "Ex: Binance, Coinbase, self-custody"
                  : "Ex: Banco, cartório, etc."
              }
              value={form.custodian}
              onChange={(e) => set("custodian", e.target.value)}
              className={cn(
                "h-9 w-full rounded-lg border border-border bg-background px-3",
                "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              )}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-background px-3 py-2",
                "text-[13px] text-foreground placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg px-4 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "h-9 rounded-lg px-5 text-[13px] font-semibold text-white",
                "bg-gradient-to-r from-emerald-500 to-blue-600",
                "transition-opacity hover:opacity-90 disabled:opacity-60"
              )}
            >
              {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar ativo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
