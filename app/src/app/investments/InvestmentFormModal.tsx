"use client";

/**
 * InvestmentFormModal — modal de criação/edição de posição
 * Sprint 6.4
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

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  editing:  InvestmentPosition | null;
  onClose:  () => void;
  onSaved:  (p: InvestmentPosition) => void;
}

export function InvestmentFormModal({ editing, onClose, onSaved }: Props) {
  const [form, setForm]       = useState<InvestmentFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Populate form on edit
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

  // Auto-fill currency when asset_class changes (only on create)
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
    if (!form.asset_name.trim()) { setError("Nome do ativo é obrigatório."); return; }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {editing ? "Editar Posição" : "Nova Posição"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Asset class grid */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Classe do Ativo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ASSET_CLASSES.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => handleClassChange(cls)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors text-left ${
                    form.asset_class === cls
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-700 dark:text-zinc-300"
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
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Nome do Ativo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.asset_name}
                onChange={e => set("asset_name", e.target.value)}
                placeholder="Ex: Petrobras PN, Tesouro IPCA 2035"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Ticker / Código
              </label>
              <input
                type="text"
                value={form.ticker}
                onChange={e => set("ticker", e.target.value.toUpperCase())}
                placeholder="PETR4"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Moeda
              </label>
              <select
                value={form.currency}
                onChange={e => set("currency", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantidade e Preços */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Quantidade
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.quantity}
                onChange={e => set("quantity", e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Preço Médio
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.average_price}
                onChange={e => set("average_price", e.target.value)}
                placeholder="35.50"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Preço Atual
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.current_price}
                onChange={e => set("current_price", e.target.value)}
                placeholder="38.20"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Valores totais (override) */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <p className="col-span-2 text-xs text-zinc-500 dark:text-zinc-400">
              Opcional: informe os valores totais diretamente (sobrepõe qtd × preço)
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Valor Atual Total
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.current_value}
                onChange={e => set("current_value", e.target.value)}
                placeholder="3820.00"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Custo Total
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.acquisition_value}
                onChange={e => set("acquisition_value", e.target.value)}
                placeholder="3550.00"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Instituição e Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Corretora / Instituição
              </label>
              <input
                type="text"
                value={form.institution}
                onChange={e => set("institution", e.target.value)}
                placeholder="XP Investimentos"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Observações
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Anotação opcional"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
