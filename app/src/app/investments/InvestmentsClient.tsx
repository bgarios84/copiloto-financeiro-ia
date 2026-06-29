"use client";

/**
 * InvestmentsClient — shell client do módulo /investments
 * Sprint 7.1   — cotações B3 aplicadas na consolidação
 * Sprint 7.1.1 — dividendMap repassado para cada InvestmentItem
 */

import { useState, useMemo } from "react";
import { Plus, AlertTriangle, TrendingUp } from "lucide-react";
import type { InvestmentPosition, PositionByClass, AssetClass } from "@/types/investment";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ICONS, ASSET_CLASS_COLORS } from "@/types/investment";
import type { FxRateMap }    from "@/types/fx-rate";
import type { B3QuoteMap }   from "@/types/b3-market";
import type { DividendMap }  from "@/types/b3-dividend";
import { consolidateInBRL, convertToBRL } from "@/lib/fx-rate";
import { effectiveCurrentValue } from "@/lib/b3-market";
import { deleteInvestmentPosition } from "@/services/investment";
import { InvestmentItem }       from "./InvestmentItem";
import { InvestmentFormModal }  from "./InvestmentFormModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBRL(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialPositions: InvestmentPosition[];
  initialError:     string | null;
  rateMap:          FxRateMap;
  rateError:        string | null;
  b3QuoteMap:       B3QuoteMap;
  b3QuoteError:     string | null;
  dividendMap:      DividendMap;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvestmentsClient({
  initialPositions,
  initialError,
  rateMap,
  rateError,
  b3QuoteMap,
  b3QuoteError,
  dividendMap,
}: Props) {
  const [positions, setPositions] = useState<InvestmentPosition[]>(initialPositions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<InvestmentPosition | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────────

  const { totalBRL, missing } = useMemo(() => {
    const items = positions
      .map(p => {
        const val = effectiveCurrentValue(p, b3QuoteMap);
        return val !== null ? { amount: val, currency: p.currency } : null;
      })
      .filter((x): x is { amount: number; currency: string } => x !== null);
    return consolidateInBRL(items, rateMap);
  }, [positions, rateMap, b3QuoteMap]);

  const byClass = useMemo((): PositionByClass[] => {
    const map: Partial<Record<AssetClass, { totalBRL: number; count: number }>> = {};
    for (const p of positions) {
      const val = effectiveCurrentValue(p, b3QuoteMap);
      if (val === null) continue;
      const brl = convertToBRL(val, p.currency, rateMap);
      if (brl === null) continue;
      const cls = p.asset_class;
      if (!map[cls]) map[cls] = { totalBRL: 0, count: 0 };
      map[cls]!.totalBRL += brl;
      map[cls]!.count    += 1;
    }
    const total = Object.values(map).reduce((s, v) => s + (v?.totalBRL ?? 0), 0);
    return (Object.entries(map) as [AssetClass, { totalBRL: number; count: number }][])
      .map(([cls, v]) => ({
        asset_class: cls,
        totalBRL:    v.totalBRL,
        count:       v.count,
        percentage:  total > 0 ? (v.totalBRL / total) * 100 : 0,
      }))
      .sort((a, b) => b.totalBRL - a.totalBRL);
  }, [positions, rateMap, b3QuoteMap]);

  const topPosition = useMemo(() => {
    return positions
      .map(p => {
        const val = effectiveCurrentValue(p, b3QuoteMap);
        return { p, brl: val !== null ? (convertToBRL(val, p.currency, rateMap) ?? 0) : 0 };
      })
      .sort((a, b) => b.brl - a.brl)[0]?.p ?? null;
  }, [positions, rateMap, b3QuoteMap]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (p: InvestmentPosition) => { setEditing(p); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSaved = (saved: InvestmentPosition) => {
    setPositions(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDelete = async (p: InvestmentPosition) => {
    setPositions(prev => prev.filter(x => x.id !== p.id));
    const result = await deleteInvestmentPosition(p.id);
    if (result.error) {
      setDeleteErr(result.error);
      setPositions(prev => [...prev, p].sort((a, b) => a.asset_name.localeCompare(b.asset_name)));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Investimentos
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Posições financeiras em corretoras e exchanges
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Posição
        </button>
      </div>

      {/* Errors */}
      {(initialError || deleteErr || rateError) && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {initialError ?? deleteErr ?? rateError}
        </div>
      )}

      {/* B3 quote error (non-blocking) */}
      {b3QuoteError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Cotações B3 indisponíveis: {b3QuoteError}. Usando preços manuais.</span>
        </div>
      )}

      {/* Missing FX currencies warning */}
      {missing.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Sem cotação para: <strong>{missing.join(", ")}</strong>. Esses ativos não estão incluídos no total em BRL.
          </span>
        </div>
      )}

      {/* Summary cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
            <p className="text-xs font-medium text-blue-100">Total em BRL</p>
            <p className="text-xl font-bold mt-1">{formatBRL(totalBRL)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Posições</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {positions.length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Classes</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {byClass.length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Maior posição</p>
            {topPosition ? (
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                {ASSET_CLASS_ICONS[topPosition.asset_class]} {topPosition.asset_name}
              </p>
            ) : (
              <p className="text-sm text-zinc-400 mt-1">—</p>
            )}
          </div>
        </div>
      )}

      {/* Allocation bar */}
      {byClass.length > 1 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Alocação por classe
          </p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
            {byClass.map(c => (
              <div
                key={c.asset_class}
                style={{ width: `${c.percentage}%`, backgroundColor: ASSET_CLASS_COLORS[c.asset_class] }}
                title={`${ASSET_CLASS_LABELS[c.asset_class]}: ${c.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {byClass.map(c => (
              <div key={c.asset_class} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: ASSET_CLASS_COLORS[c.asset_class] }}
                />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {ASSET_CLASS_ICONS[c.asset_class]} {ASSET_CLASS_LABELS[c.asset_class]}
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {c.percentage.toFixed(1)}%
                </span>
                <span className="text-zinc-400">{formatBRL(c.totalBRL)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positions table */}
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">📈</span>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Nenhuma posição cadastrada ainda.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Adicionar Primeira Posição
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Desktop header */}
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ativo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">Classe</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">Qtd</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden xl:table-cell">Preço Médio</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden xl:table-cell">Preço Atual</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Valor Atual</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">Proventos 12m</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Moeda</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Resultado</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden xl:table-cell">Instituição</th>
                  <th className="px-3 py-3 w-24" />
                </tr>
              </thead>

              {/* Mobile header */}
              <thead className="md:hidden">
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {positions.length} {positions.length === 1 ? "posição" : "posições"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {positions.map(p => (
                  <InvestmentItem
                    key={p.id}
                    position={p}
                    rateMap={rateMap}
                    b3QuoteMap={b3QuoteMap}
                    dividendMap={dividendMap}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <InvestmentFormModal
          editing={editing}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
