"use client";

/**
 * BudgetItem — Sprint 5.6
 *
 * Linha da lista de orçamentos com:
 *   - Ícone + nome da categoria
 *   - Barra de progresso colorida pelo status
 *   - Valores: planejado / realizado / diferença / % de uso
 *   - Badge de status: Dentro / Atenção / Excedido / Sem orçamento
 *   - Hover: botões de editar e excluir (com confirmação 4 s)
 */

import * as React from "react";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getBudgetStatus, BUDGET_STATUS_LABELS } from "@/types/budget";
import type { BudgetComparison } from "@/types/budget";
import type { Category } from "@/types/transaction";

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  dentro:        { bar: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
  atencao:       { bar: "bg-amber-500",   badge: "bg-amber-500/10   text-amber-600   dark:text-amber-400",   text: "text-amber-600   dark:text-amber-400"   },
  excedido:      { bar: "bg-rose-500",    badge: "bg-rose-500/10    text-rose-600    dark:text-rose-500",    text: "text-rose-600    dark:text-rose-500"    },
  sem_orcamento: { bar: "bg-zinc-400",    badge: "bg-zinc-500/10    text-zinc-500    dark:text-zinc-400",    text: "text-zinc-500    dark:text-zinc-400"    },
} as const;

// Verifica se o valor é um emoji (não um nome de ícone Lucide como "home")
function isCategoryEmoji(str: string | null | undefined): boolean {
  if (!str) return false;
  return /\p{Emoji}/u.test(str) && str.replace(/\s/g, "").length <= 4;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface BudgetItemProps {
  item:          BudgetComparison;
  categories:    Category[];
  onEdit:        (item: BudgetComparison) => void;
  onDelete:      (categoryId: string, month: string) => Promise<void>;
  onDefine:      (item: BudgetComparison) => void;
  deleting:      boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BudgetItem({
  item, categories: _categories, onEdit, onDelete, onDefine, deleting,
}: BudgetItemProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = getBudgetStatus(item.usage_percentage);
  const cfg    = STATUS_CONFIG[status];
  const barPct = item.usage_percentage !== null
    ? Math.min(item.usage_percentage, 100)
    : 0;

  // ── Delete confirmation ────────────────────────────────────────────────────

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      timerRef.current = setTimeout(() => setConfirmDelete(false), 4000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirmDelete(false);
      void onDelete(item.category_id ?? "", item.month);
    }
  }

  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "group relative rounded-xl border border-border bg-card px-4 py-3.5",
      "transition-all hover:border-border/80 hover:shadow-sm",
      deleting && "opacity-50 pointer-events-none"
    )}>
      {/* Row: icon + name | amounts | status badge | actions */}
      <div className="flex items-center gap-3">
        {/* Icon + category name */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{ backgroundColor: item.category_color ? `${item.category_color}20` : "#71717a20" }}
        >
          <span>{isCategoryEmoji(item.category_icon) ? item.category_icon : "💰"}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {item.category_name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {item.transaction_count}{" "}
            {item.transaction_count === 1 ? "transação" : "transações"}
          </p>
        </div>

        {/* Amount columns */}
        <div className="hidden sm:flex items-center gap-6 text-right">
          <div>
            <p className="text-[10px] text-muted-foreground">Planejado</p>
            <p className="text-[13px] font-semibold tabular-nums text-foreground">
              {item.planned_amount !== null ? formatCurrency(item.planned_amount) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Realizado</p>
            <p className="text-[13px] font-semibold tabular-nums text-foreground">
              {formatCurrency(item.actual_amount)}
            </p>
          </div>
          {item.difference_amount !== null && (
            <div>
              <p className="text-[10px] text-muted-foreground">Diferença</p>
              <p className={cn("text-[13px] font-semibold tabular-nums", cfg.text)}>
                {item.difference_amount >= 0 ? "+" : ""}
                {formatCurrency(item.difference_amount)}
              </p>
            </div>
          )}
          {item.usage_percentage !== null && (
            <div>
              <p className="text-[10px] text-muted-foreground">Uso</p>
              <p className={cn("text-[13px] font-bold tabular-nums", cfg.text)}>
                {item.usage_percentage.toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        {/* Status badge */}
        <span className={cn(
          "hidden lg:inline-flex shrink-0 items-center rounded-full px-2 py-0.5",
          "text-[10px] font-semibold",
          cfg.badge
        )}>
          {BUDGET_STATUS_LABELS[status]}
        </span>

        {/* Actions — visible on hover */}
        <div className={cn(
          "flex shrink-0 items-center gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}>
          {item.planned_amount === null ? (
            // Sem orçamento → botão "Definir"
            <button
              onClick={() => onDefine(item)}
              className={cn(
                "flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium",
                "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
              )}
              title="Definir orçamento"
            >
              <PlusCircle className="h-3 w-3" />
              Definir
            </button>
          ) : (
            <>
              <button
                onClick={() => onEdit(item)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  "text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                )}
                title="Editar orçamento"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDeleteClick}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  confirmDelete
                    ? "bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                    : "text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                )}
                title={confirmDelete ? "Clique novamente para confirmar" : "Excluir orçamento"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(item.planned_amount !== null || item.actual_amount > 0) && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500", cfg.bar)}
              style={{ width: `${barPct}%` }}
            />
          </div>
          {/* Mobile amounts */}
          <div className="mt-2 flex items-center justify-between sm:hidden text-[11px]">
            <span className="text-muted-foreground">
              {formatCurrency(item.actual_amount)} gastos
            </span>
            {item.planned_amount !== null && (
              <span className="text-muted-foreground">
                de {formatCurrency(item.planned_amount)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete tooltip */}
      {confirmDelete && (
        <div className="absolute right-3 -top-7 z-10 rounded-md bg-rose-500 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
          Clique novamente para confirmar
        </div>
      )}
    </div>
  );
}
