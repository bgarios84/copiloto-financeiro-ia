"use client";

import * as React from "react";
import { Pencil, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/transaction";

interface TransactionItemProps {
  transaction: Transaction;
  onEdit:      (tx: Transaction) => void;
  onDelete:    (id: string) => void;
  deleting:    boolean;
  /** Badge opcional renderizado entre o valor e os botões de ação */
  badge?:      React.ReactNode;
}

// ── Type visual config ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  TransactionType,
  { icon: React.ElementType; color: string; amountColor: string; prefix: string }
> = {
  income: {
    icon:        ArrowUpRight,
    color:       "bg-emerald-500/10 text-emerald-500",
    amountColor: "text-emerald-600 dark:text-emerald-400",
    prefix:      "+ ",
  },
  expense: {
    icon:        ArrowDownRight,
    color:       "bg-rose-500/10 text-rose-500",
    amountColor: "text-rose-600 dark:text-rose-400",
    prefix:      "- ",
  },
  transfer: {
    icon:        ArrowLeftRight,
    color:       "bg-blue-500/10 text-blue-500",
    amountColor: "text-blue-600 dark:text-blue-400",
    prefix:      "",
  },
};

// ── Date formatter ────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  // iso = "YYYY-MM-DD"
  const [year, month, day] = iso.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") return null;
  const styles =
    status === "pending"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-secondary text-muted-foreground line-through";
  const labels: Record<string, string> = { pending: "Pendente", cancelled: "Cancelado" };
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", styles)}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TransactionItem({
  transaction: tx,
  onEdit,
  onDelete,
  deleting,
  badge,
}: TransactionItemProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cfg = TYPE_CONFIG[tx.type];
  const Icon = cfg.icon;

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      timerRef.current = setTimeout(() => setConfirmDelete(false), 4000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      onDelete(tx.id);
    }
  }

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3",
        "transition-all hover:border-border/80 hover:bg-card/80",
        deleting && "pointer-events-none opacity-50",
        tx.status === "cancelled" && "opacity-60"
      )}
    >
      {/* Type icon */}
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.color)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-[13px] font-medium text-foreground",
              tx.status === "cancelled" && "line-through text-muted-foreground"
            )}
          >
            {tx.description}
          </p>
          <StatusBadge status={tx.status} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{formatDate(tx.date)}</span>
          {tx.category && (
            <>
              <span>·</span>
              <span
                className="flex items-center gap-1"
                style={{ color: tx.category.color ?? undefined }}
              >
                {tx.category.name}
              </span>
            </>
          )}
          {tx.account && (
            <>
              <span>·</span>
              <span>{tx.account.name}</span>
            </>
          )}
          {tx.card && (
            <>
              <span>·</span>
              <span>{tx.card.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Right side: valor · badge · ações — nunca sobrepõem */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Valor */}
        <p className={cn(
          "font-bold tabular-nums whitespace-nowrap text-right text-[14px]",
          cfg.amountColor
        )}>
          {cfg.prefix}{formatCurrency(tx.amount)}
          {tx.currency !== "BRL" && (
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">{tx.currency}</span>
          )}
        </p>

        {/* Badge opcional (Status IA) */}
        {badge}

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(tx)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className={cn(
              "flex h-7 items-center justify-center rounded-lg text-[10px] font-semibold transition-all",
              confirmDelete
                ? "w-auto px-2 bg-destructive text-white"
                : "w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            )}
            aria-label="Excluir"
          >
            {confirmDelete ? "Confirmar?" : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
