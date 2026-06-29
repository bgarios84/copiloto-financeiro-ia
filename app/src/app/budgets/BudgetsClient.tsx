"use client";

/**
 * BudgetsClient — Sprint 5.6
 *
 * Client Component da página /budgets.
 *
 * - Seletor de mês (mês atual + 5 anteriores + 1 futuro)
 * - 4 cards de resumo: Total planejado / Gasto / Dentro do orçamento / Excedidos
 * - Lista de BudgetItem (comparação orçamento × realizado)
 * - Modal de criação/edição
 * - Busca dados do servidor ao trocar de mês via Server Action
 */

import * as React from "react";
import { PiggyBank, Plus, ChevronDown, AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getBudgetComparison, deleteBudget } from "@/services/budget";
import { toMonthDate } from "@/lib/date";
import { getBudgetStatus } from "@/types/budget";
import type { BudgetComparison } from "@/types/budget";
import type { Category } from "@/types/transaction";
import { BudgetItem }      from "./BudgetItem";
import { BudgetFormModal } from "./BudgetFormModal";

// ── Month helpers ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function monthLabel(monthDate: string): string {
  const [year, month] = monthDate.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Gera lista de meses: 5 passados + atual + 1 futuro */
function buildMonthOptions(): string[] {
  const now = new Date();
  const months: string[] = [];
  // 1 mês futuro
  const future = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  months.push(toMonthDate(future.getFullYear(), future.getMonth() + 1));
  // atual + 5 passados
  for (let i = 0; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(toMonthDate(d.getFullYear(), d.getMonth() + 1));
  }
  return months;
}

// ── Summary card ───────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "blue" | "violet" | "emerald" | "rose";
}) {
  const colors = {
    blue:    "from-blue-500/10   to-blue-600/5   border-blue-500/20",
    violet:  "from-violet-500/10 to-violet-600/5 border-violet-500/20",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    rose:    "from-rose-500/10   to-rose-600/5   border-rose-500/20",
  };
  const textColors = {
    blue:    "text-blue-600   dark:text-blue-400",
    violet:  "text-violet-600 dark:text-violet-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose:    "text-rose-600   dark:text-rose-500",
  };
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", colors[color])}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[18px] font-bold tabular-nums", textColors[color])}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface BudgetsClientProps {
  initialComparison: BudgetComparison[];
  initialError:      string | null;
  categories:        Category[];
  currentMonth:      string;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function BudgetsClient({
  initialComparison,
  initialError,
  categories,
  currentMonth,
}: BudgetsClientProps) {
  const monthOptions = React.useMemo(buildMonthOptions, []);

  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);
  const [comparison,    setComparison]    = React.useState<BudgetComparison[]>(initialComparison);
  const [loadError,     setLoadError]     = React.useState<string | null>(initialError);
  const [loading,       setLoading]       = React.useState(false);

  // Modal
  const [modalOpen,   setModalOpen]   = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<BudgetComparison | null>(null);

  // Deleting set
  const [deletingKeys, setDeletingKeys] = React.useState<Set<string>>(new Set());

  // ── Month change ────────────────────────────────────────────────────────────

  async function handleMonthChange(month: string) {
    setSelectedMonth(month);
    setLoading(true);
    setLoadError(null);
    const result = await getBudgetComparison(month);
    setLoading(false);
    if (result.error) {
      setLoadError(result.error);
    } else {
      setComparison(result.data ?? []);
    }
  }

  // ── Optimistic success (create / edit) ─────────────────────────────────────

  function handleSuccess(item: BudgetComparison) {
    setComparison((prev) => {
      const key = item.category_id ?? "__null__";
      const idx  = prev.findIndex(
        (r) => (r.category_id ?? "__null__") === key
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx]  = item;
        return next;
      }
      return [...prev, item].sort((a, b) => b.actual_amount - a.actual_amount);
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(categoryId: string, month: string) {
    const key = `${categoryId}_${month}`;
    setDeletingKeys((s) => new Set(s).add(key));
    const result = await deleteBudget(categoryId, month);
    setDeletingKeys((s) => { const n = new Set(s); n.delete(key); return n; });
    if (result.error) {
      setLoadError(result.error);
    } else {
      // Remove planned_amount → vira "sem orçamento" se ainda há actual
      setComparison((prev) =>
        prev.map((r) =>
          (r.category_id ?? "__null__") === (categoryId ?? "__null__") && r.month === month
            ? { ...r, planned_amount: null, difference_amount: null, usage_percentage: null }
            : r
        ).filter((r) => r.actual_amount > 0 || r.planned_amount !== null)
      );
    }
  }

  // ── Handlers: open modal ────────────────────────────────────────────────────

  function openCreate() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEdit(item: BudgetComparison) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function openDefine(item: BudgetComparison) {
    // "Definir" para linha sem orçamento usa o item como contexto mas category deve ser selecionado já
    // Pre-fill a category_id no modal de criação, mas category select é readonly-ish
    setEditingItem({ ...item, planned_amount: null });
    setModalOpen(true);
  }

  // ── Summary stats ───────────────────────────────────────────────────────────

  const withBudget   = comparison.filter((r) => r.planned_amount !== null);
  const totalPlanned = withBudget.reduce((s, r) => s + (r.planned_amount ?? 0), 0);
  const totalActual  = comparison.reduce((s, r) => s + r.actual_amount, 0);
  const dentroCount  = withBudget.filter((r) => getBudgetStatus(r.usage_percentage) === "dentro").length;
  const excCount     = withBudget.filter((r) => getBudgetStatus(r.usage_percentage) === "excedido").length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Orçamentos</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Defina metas e acompanhe seus gastos por categoria
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month picker */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => void handleMonthChange(e.target.value)}
              className={cn(
                "h-9 appearance-none rounded-xl border border-border bg-background",
                "pl-3 pr-8 text-[13px] font-medium text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              )}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* New budget */}
          <button
            onClick={openCreate}
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white",
              "bg-gradient-to-r from-blue-500 to-violet-600 transition-opacity hover:opacity-90"
            )}
          >
            <Plus className="h-4 w-4" />
            Novo orçamento
          </button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
          <button
            onClick={() => setLoadError(null)}
            className="ml-auto font-medium underline underline-offset-2"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Summary cards */}
      {comparison.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Total planejado" value={formatCurrency(totalPlanned)} color="blue" />
          <SummaryCard label="Total gasto"     value={formatCurrency(totalActual)}  color="violet"
            sub={totalPlanned > 0 ? `${Math.round((totalActual / totalPlanned) * 100)}% do orçamento` : undefined}
          />
          <SummaryCard
            label="Dentro do orçamento"
            value={String(dentroCount)}
            sub={withBudget.length > 0 ? `de ${withBudget.length} com orçamento` : undefined}
            color="emerald"
          />
          <SummaryCard
            label="Excedidos"
            value={String(excCount)}
            sub={excCount > 0 ? "acima do planejado" : "nenhum excedido"}
            color="rose"
          />
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="mb-4 flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-blue-500" />
        </div>
      )}

      {/* List */}
      {!loading && comparison.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
            <PiggyBank className="h-6 w-6 text-violet-500" />
          </div>
          <p className="text-[15px] font-semibold text-foreground">
            Nenhum orçamento em {monthLabel(selectedMonth)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Defina um orçamento por categoria para acompanhar seus gastos.
          </p>
          <button
            onClick={openCreate}
            className={cn(
              "mt-5 flex h-9 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold text-white",
              "bg-gradient-to-r from-blue-500 to-violet-600 transition-opacity hover:opacity-90"
            )}
          >
            <Plus className="h-4 w-4" />
            Criar primeiro orçamento
          </button>
        </div>
      ) : !loading ? (
        <div className="flex flex-col gap-2">
          {comparison.map((item) => {
            const key = `${item.category_id ?? "null"}_${item.month}`;
            return (
              <BudgetItem
                key={key}
                item={item}
                categories={[]}
                onEdit={openEdit}
                onDelete={handleDelete}
                onDefine={openDefine}
                deleting={deletingKeys.has(key)}
              />
            );
          })}
        </div>
      ) : null}

      {/* Modal */}
      <BudgetFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        categories={categories}
        month={selectedMonth}
        editing={editingItem?.planned_amount !== undefined && editingItem.planned_amount !== null ? editingItem : null}
      />
    </>
  );
}
