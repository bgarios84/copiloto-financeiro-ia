"use client";

/**
 * InvestmentFormModal — Sprint 10.1 premium dark redesign
 * Sprint 6.4 — modal de criacao/edicao de posicao
 */

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type { InvestmentPosition, InvestmentFormData, AssetClass } from "@/types/investment";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_ICONS,
  ASSET_CLASS_CURRENCY,
} from "@/types/investment";
import { createInvestmentPosition, updateInvestmentPosition } from "@/services/investment";
import { SUPPORTED_CURRENCIES } from "@/lib/fx-rate";

const ASSET_CLASSES = Object.keys(ASSET_CLASS_LABELS) as AssetClass[];

const EMPTY_FORM: InvestmentFormData = {
  asset_name:        "",
  ticker:            "",
  asset_class:       "stock_br",
  quantity:          "",
  average_price:     "",
  current_price:     "",
  currency:          "BRL",
  institution:       "",
  current_value:     "",
  acquisition_value: "",
  notes:             "",
};

interface Props {
  editing:  InvestmentPosition | null;
  onClose:  () => void;
  onSaved:  (p: InvestmentPosition) => void;
}

// Shared input/select class
const INPUT = "w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 text-[13px] placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition";
const LABEL = "block text-[12px] font-medium text-zinc-400 mb-1";

export function InvestmentFormModal({ editing, onClose, onSaved }: Props) {
  const [form, setForm]       = useState<InvestmentFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        asset_name:        editing.asset_name,
        ticker:            editing.ticker            ?? "",
        asset_class:       editing.asset_class,
        quantity:          editing.quantity           !== null ? String(editing.quantity)           : "",
        average_price:     editing.average_price      !== null ? String(editing.average_price)      : "",
        current_price:     editing.current_price      !== null ? String(editing.current_price)      : "",
        currency:          editing.currency,
        institution:       editing.institution        ?? "",
        current_value:     editing.current_value      !== null ? String(editing.current_value)      : "",
        acquisition_value: editing.acquisition_value  !== null ? String(editing.acquisition_value)  : "",
        notes:             editing.notes              ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing]);

  const handleClassChange = (cls: AssetClass) => {
    const suggestedCurrency = ASSET_CLASS_CURRENCY[cls] ?? "BRL";
    setForm(prev => ({
      ...prev,
      asset_class: cls,
      currency:    editing ? prev.currency : suggestedCurrency,
    }));
  };

  const set = (key: keyof InvestmentFormData, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_name.trim()) { setError("Nome do ativo e obrigatorio."); return; }

    setLoading(true);
    setError(null);

    const result = editing
      ? await updateInvestmentPosition(editing.id, form)
      : await createInvestmentPosition(form);

    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Erro desconhecido.");
      return;
    }

    onSaved(result.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <h2 className="text-[15px] font-bold text-zinc-100">
            {editing ? "Editar Posicao" : "Nova Posicao"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

          {/* Classe do ativo */}
          <div>
            <label className={LABEL}>Classe do Ativo</label>
            <div className="grid grid-cols-2 gap-2">
              {ASSET_CLASSES.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => handleClassChange(cls)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] transition-colors text-left ${
                    form.asset_class === cls
                      ? "border-blue-500/60 bg-blue-500/10 text-blue-300 font-medium"
                      : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-600 text-zinc-300"
                  }`}
                >
                  <span className="text-base">{ASSET_CLASS_ICONS[cls]}</span>
                  <span className="truncate">{ASSET_CLASS_LABELS[cls]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome e Ticker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>
                Nome do Ativo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.asset_name}
                onChange={e => set("asset_name", e.target.value)}
                placeholder="Ex: Petrobras PN, Tesouro IPCA 2035"
                className={INPUT}
                required
              />
            </div>
            <div>
              <label className={LABEL}>Ticker / Codigo</label>
              <input
                type="text"
                value={form.ticker}
                onChange={e => set("ticker", e.target.value.toUpperCase())}
                placeholder="PETR4"
                className={INPUT + " font-mono"}
              />
            </div>
            <div>
              <label className={LABEL}>Moeda</label>
              <select
                value={form.currency}
                onChange={e => set("currency", e.target.value)}
                className={INPUT}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantidade e Precos */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Quantidade</label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.quantity}
                onChange={e => set("quantity", e.target.value)}
                placeholder="100"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Preco Medio</label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.average_price}
                onChange={e => set("average_price", e.target.value)}
                placeholder="35.50"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Preco Atual</label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.current_price}
                onChange={e => set("current_price", e.target.value)}
                placeholder="38.20"
                className={INPUT}
              />
            </div>
          </div>

          {/* Valores totais (override) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <p className="text-[11px] text-zinc-500">
              Opcional: informe os valores totais diretamente (sobrepos qtd x preco)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Valor Atual Total</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.current_value}
                  onChange={e => set("current_value", e.target.value)}
                  placeholder="3820.00"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Custo Total</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.acquisition_value}
                  onChange={e => set("acquisition_value", e.target.value)}
                  placeholder="3550.00"
                  className={INPUT}
                />
              </div>
            </div>
          </div>

          {/* Instituicao e Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Corretora / Instituicao</label>
              <input
                type="text"
                value={form.institution}
                onChange={e => set("institution", e.target.value)}
                placeholder="XP Investimentos"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Observacoes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Anotacao opcional"
                className={INPUT}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[13px] text-red-400">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-[13px] font-medium hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
