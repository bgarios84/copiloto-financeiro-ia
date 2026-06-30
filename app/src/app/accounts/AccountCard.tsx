"use client";

import * as React from "react";
import {
  Pencil,
  Trash2,
  Loader2,
  Wallet,
  Landmark,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Coins,
  Building2,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { FinancialAccount } from "@/types/financial-account";
import { ACCOUNT_TYPE_LABELS } from "@/types/financial-account";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  "wallet":      Wallet,
  "landmark":    Landmark,
  "credit-card": CreditCard,
  "piggy-bank":  PiggyBank,
  "trending-up": TrendingUp,
  "coins":       Coins,
  "building-2":  Building2,
  "briefcase":   Briefcase,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface AccountCardProps {
  account:   FinancialAccount;
  onEdit:    (account: FinancialAccount) => void;
  onDelete:  (id: string) => void;
  onSync?:   (connectionId: string) => void;
  syncing?:  boolean;
  deleting?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AccountCard({
  account,
  onEdit,
  onDelete,
  onSync,
  syncing  = false,
  deleting = false,
}: AccountCardProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const color = account.color ?? "#6366F1";
  const Icon  = ICON_MAP[account.icon ?? "wallet"] ?? Wallet;
  const typeLabel      = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  const currencySymbol = account.currency === "BRL" ? "R$" : account.currency;
  const isOF           = Boolean(account.of_connection_id);

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(account.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }

  React.useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card p-5 transition-all duration-200",
        "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
        (deleting || syncing) && "opacity-60 pointer-events-none"
      )}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />

      <div className="flex items-start gap-4 pl-3">
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}22` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-[14px] font-semibold text-foreground">{account.name}</p>
                {isOF && (
                  <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                    Open Finance
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground">
                {account.institution?.name ?? "Sem instituição"} · {typeLabel}
              </p>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {/* Sync button — apenas contas OF */}
              {isOF && onSync && (
                <button
                  onClick={() => onSync(account.of_connection_id!)}
                  disabled={syncing || deleting}
                  aria-label="Sincronizar conta"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                </button>
              )}

              <button
                onClick={() => onEdit(account)}
                disabled={deleting || syncing}
                aria-label="Editar conta"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleDeleteClick}
                disabled={deleting || syncing}
                aria-label={confirmDelete ? "Confirmar exclusão" : "Excluir conta"}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  confirmDelete
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-destructive"
                )}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo</p>
              <p
                className={cn(
                  "text-[20px] font-bold tabular-nums",
                  account.balance >= 0 ? "text-foreground" : "text-destructive"
                )}
              >
                {account.currency === "BRL"
                  ? formatCurrency(account.balance)
                  : `${currencySymbol} ${account.balance.toFixed(2)}`}
              </p>
            </div>

            {/* Currency badge */}
            <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {account.currency}
            </span>
          </div>

          {/* Syncing indicator */}
          {syncing && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sincronizando...
            </p>
          )}

          {/* Confirm delete hint */}
          {confirmDelete && !syncing && (
            <p className="mt-2 text-[11px] text-destructive">
              Clique novamente para confirmar a exclusão.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
