"use client";

/**
 * TradeFormModal — modal de criação/edição de operação
 * Sprint 6.5
 */

import { useState, useEffect } from "react";
import { X, Loader2, Info } from "lucide-react";
import type { InvestmentTrade, TradeFormData, TradeType } from "@/types/investment-trade";
import { TRADE_TYPE_LABELS, TRADE_TYPE_ICONS, TRADE_TYPES_CASHFLOW_ONLY } from "@/types/investment-trade";
import { createTrade, updateTrade } from "@/services/investment-trade";
import { SUPPORTED_CURRENCIES } from "@/lib/fx-rate";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_TYPES = Object.keys(TRADE_TYPE_LABELS) as TradeType[];

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: TradeFormData = {
  trade_type:   "buy",
  trade_date:   TODAY,
  quantity:     "",
  unit_price:   "",
  total_amount: "",
  fee:          "",
  tax:          "",
  currency:     "BRL",
  notes:        "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Campos relevantes por tipo de trade */
function fieldsFor(type: TradeType): {
  showQty:    boolean;
  showPrice:  boolean;
  showTotal:  boolean;
  showFee:    boolean;
  showTax:    boolean;
  qtyLabel:   string;
  priceLabel: string;
  totalLabel: string;
} {
  switch (type) {
    case "buy":
      return { showQty: true, showPrice: true, showTotal: true, showFee: true, showTax: true,
               qtyLabel: "Quantidade", priceLabel: "Preço unitário", totalLabel: "Custo total" };
    case "sell":
      return { showQty: true, showPrice: true, showTotal: true, showFee: true, showTax: true,
               qtyLabel: "Quantidade vendida", priceLabel: "Preço de venda", totalLabel: "Receita" };
    case "dividend":
      return { showQty: false, showPrice: false, showTotal: true, showFee: false, showTax: true,
               qtyLabel: "", priceLabel: "", totalLabel: "Valor recebido" };
    case "amortization":
      return { showQty: false, showPrice: false, showTotal: true, showFee: false, showTax: true,
               qtyLabel: "", priceLabel: "", totalLabel: "Valor amortizado" };
    case "split":
      return { showQty: false, showPrice: true, showTotal: false, showFee: false, showTax: false,
               qtyLabel: "", priceLabel: "Fator (ex: 3 = 1 ação vira 3)", totalLabel: "" };
    case "reverse_split":
      return { showQty: false, showPrice: true, showTotal: false, showFee: false, showTax: false,
               qtyLabel: "", priceLabel: "Fator (ex: 0.5 = 2 ações viram 1)", totalLabel: "" };
    case "bonus":
      return { showQty: true, showPrice: false, showTotal: false, showFee: false, showTax: false,
               qtyLabel: "Quantidade bonificada", priceLabel: "", totalLabel: "" };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  positionId: string;
  currency:   string;
  editing:    InvestmentTrade | null;
  onClose:    () => void;
  onSaved:    (t: InvestmentTrade) => void;
}

export function TradeFormModal({ positionId, currency, editing, onClose, onSaved }: Props) {
  const [form, setForm]       = useState<TradeFormData>({ ...EMPTY_FORM, currency });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        trade_type:   editing.trade_type,
        trade_date:   editing.trade_date,
        quantity:     editing.quantity     !== null ? String(editing.quantity)     : "",
        unit_price:   editing.unit_price   !== null ? String(editing.unit_price)   : "",
        total_amount: editing.total_amount !== null ? String(editing.total_amount) : "",
        fee:          editing.fee > 0 ? String(editing.fee) : "",
        tax:          editing.tax > 0 ? String(editing.tax) : "",
        currency:     editing.currency,
        notes:        editing.notes ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM, currency });
    }
  }, [editing, currency]);

  const set = (key: keyof TradeFormData, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const fields = fieldsFor(form.trade_type);
  const isCashflowOnly = TRADE_TYPES_CASHFLOW_ONLY.includes(form.trade_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trade_date) { setError("Data é obrigatória."); return; }

    setLoading(true);
    setError(null);

    const result = editing
      ? await updateTrade(editing.id, positionId, form)
      : await createTrade(positionId, form);

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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {editing ? "Editar Operação" : "Nova Operação"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("trade_type", type)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors text-left ${
                    form.trade_type === type
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{TRADE_TYPE_ICONS[type]}</span>
                  <span>{TRADE_TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cashflow info */}
          {isCashflowOnly && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Esta operação é apenas registro financeiro — não altera quantidade ou preço médio da posição.</span>
            </div>
          )}

          {/* Data + Moeda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.trade_date}
                onChange={e => set("trade_date", e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Qty */}
          {fields.showQty && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {fields.qtyLabel}
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
          )}

          {/* Price */}
          {fields.showPrice && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {fields.priceLabel}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.unit_price}
                onChange={e => set("unit_price", e.target.value)}
                placeholder={form.trade_type === "split" ? "3" : "38.50"}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Total */}
          {fields.showTotal && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {fields.totalLabel}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.total_amount}
                onChange={e => set("total_amount", e.target.value)}
                placeholder="3850.00"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Fee + Tax */}
          {(fields.showFee || fields.showTax) && (
            <div className="grid grid-cols-2 gap-3">
              {fields.showFee && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Corretagem / Taxa
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.fee}
                    onChange={e => set("fee", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {fields.showTax && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Imposto (IR)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.tax}
                    onChange={e => set("tax", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notas */}
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
              {editing ? "Salvar" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
