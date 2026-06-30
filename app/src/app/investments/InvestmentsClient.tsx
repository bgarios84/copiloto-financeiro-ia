"use client";

/**
 * InvestmentsClient — Sprint 10.1 premium dark redesign
 * Sprint 7.1   — cotacoes B3 aplicadas na consolidacao
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

function formatBRL(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);
}

interface Props {
  initialPositions: InvestmentPosition[];
  initialError:     string | null;
  rateMap:          FxRateMap;
  rateError:        string | null;
  b3QuoteMap:       B3QuoteMap;
  b3QuoteError:     string | null;
  dividendMap:      DividendMap;
}

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

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (p: InvestmentPosition) => { setEditing(p); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSaved = (saved: InvestmentPosition) => {
    setPositions(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
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

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Investimentos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Posicoes em corretoras e exchanges</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Posicao
        </button>
      </div>

      {/* ── Errors ─────────────────────────────────────────────────────────── */}
      {(initialError || deleteErr || rateError) && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[13px] text-red-400">
          {initialError ?? deleteErr ?? rateError}
        </div>
      )}
      {b3QuoteError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[13px] text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Cotacoes B3 indisponiveis: {b3QuoteError}. Usando precos manuais.</span>
        </div>
      )}
      {missing.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[13px] text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Sem cotacao para: <strong className="text-amber-300">{missing.join(", ")}</strong>. Esses ativos nao estao incluidos no total em BRL.
          </span>
        </div>
      )}

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {positions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total BRL — destaque */}
          <div className="col-span-2 md:col-span-1 rounded-xl border border-blue-500/25 bg-blue-500/8 p-4">
            <p className="text-[11px] uppercase tracking-wide text-blue-400 font-medium">Total em BRL</p>
            <p className="text-xl font-bold text-blue-300 mt-1">{formatBRL(totalBRL)}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-[11px] uppercase tracking-wide text-zinc-600">Posicoes</p>
            <p className="text-xl font-bold text-zinc-100 mt-1">{positions.length}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-[11px] uppercase tracking-wide text-zinc-600">Classes</p>
            <p className="text-xl font-bold text-zinc-100 mt-1">{byClass.length}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 overflow-hidden">
            <p className="text-[11px] uppercase tracking-wide text-zinc-600">Maior posicao</p>
            {topPosition ? (
              <p className="text-[13px] font-semibold text-zinc-200 mt-1 truncate">
                {ASSET_CLASS_ICONS[topPosition.asset_class]} {topPosition.asset_name}
              </p>
            ) : (
              <p className="text-[13px] text-zinc-500 mt-1">—</p>
            )}
          </div>
        </div>
      )}

      {/* ── Allocation bar ─────────────────────────────────────────────────── */}
      {byClass.length > 1 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[13px] font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            Alocacao por classe
          </p>
          {/* Bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px mb-3">
            {byClass.map(c => (
              <div
                key={c.asset_class}
                style={{ width: `${c.percentage}%`, backgroundColor: ASSET_CLASS_COLORS[c.asset_class] }}
                title={`${ASSET_CLASS_LABELS[c.asset_class]}: ${c.percentage.toFixed(1)}%`}
                className="transition-all"
              />
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {byClass.map(c => (
              <div key={c.asset_class} className="flex items-center gap-1.5 text-[12px]">
                <div
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: ASSET_CLASS_COLORS[c.asset_class] }}
                />
                <span className="text-zinc-400">
                  {ASSET_CLASS_ICONS[c.asset_class]} {ASSET_CLASS_LABELS[c.asset_class]}
                </span>
                <span className="font-semibold text-zinc-200">{c.percentage.toFixed(1)}%</span>
                <span className="text-zinc-600">{formatBRL(c.totalBRL)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Positions table ────────────────────────────────────────────────── */}
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-[14px] font-medium text-zinc-300">Nenhuma posicao cadastrada</p>
          <p className="mt-1 text-[12px] text-zinc-500">Adicione seu primeiro ativo para comecar.</p>
          <button
            onClick={openCreate}
            className="mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors"
          >
            Adicionar Primeira Posicao
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Desktop header */}
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-zinc-800 bg-zinc-800/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Ativo</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Classe</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Qtd</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Preco Medio</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Preco Atual</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Valor Atual</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Proventos 12m</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Moeda</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Resultado</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Instituicao</th>
                  <th className="px-3 py-3 w-24" />
                </tr>
              </thead>

              {/* Mobile header */}
              <thead className="md:hidden">
                <tr className="border-b border-zinc-800 bg-zinc-800/60">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {positions.length} {positions.length === 1 ? "posicao" : "posicoes"}
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
