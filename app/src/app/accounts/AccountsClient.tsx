"use client";

import * as React from "react";
import { Plus, Search, Building2, RefreshCw } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Loading } from "@/components/feedback/Loading";
import { deleteAccount } from "@/services/financial-account";
import { AccountCard } from "./AccountCard";
import { AccountFormModal } from "./AccountFormModal";
import type { FinancialAccount, Institution } from "@/types/financial-account";
import { ACCOUNT_TYPE_LABELS } from "@/types/financial-account";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AccountsClientProps {
  initialAccounts: FinancialAccount[];
  institutions: Institution[];
}

// ── Totals card ───────────────────────────────────────────────────────────────

function TotalCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "red";
}) {
  const colors = {
    blue:  "from-blue-500/10 to-violet-500/10 border-blue-500/20",
    green: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
    red:   "from-rose-500/10 to-pink-500/10 border-rose-500/20",
  };
  const textColors = {
    blue:  "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    red:   "text-rose-600 dark:text-rose-400",
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4",
        colors[color]
      )}
    >
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[22px] font-bold tabular-nums", textColors[color])}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export function AccountsClient({ initialAccounts, institutions }: AccountsClientProps) {
  const [accounts, setAccounts] = React.useState<FinancialAccount[]>(initialAccounts);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<FinancialAccount | null>(null);
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.institution?.name.toLowerCase().includes(q) ||
        ACCOUNT_TYPE_LABELS[a.type]?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const totalBalance    = accounts.reduce((s, a) => s + a.balance, 0);
  const totalPositive   = accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0);
  const totalNegative   = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingAccount(null);
    setModalOpen(true);
  }

  function openEdit(account: FinancialAccount) {
    setEditingAccount(account);
    setModalOpen(true);
  }

  function handleSuccess(account: FinancialAccount) {
    setAccounts((prev) => {
      const exists = prev.findIndex((a) => a.id === account.id);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = account;
        return next;
      }
      return [...prev, account];
    });
    setGlobalError(null);
  }

  async function handleDelete(id: string) {
    setDeletingIds((s) => new Set(s).add(id));
    setGlobalError(null);

    const result = await deleteAccount(id);

    if (result.error) {
      setGlobalError(result.error);
    } else {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    }

    setDeletingIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Contas Financeiras</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {accounts.length === 0
              ? "Adicione sua primeira conta para começar."
              : `${accounts.length} conta${accounts.length > 1 ? "s" : ""} cadastrada${accounts.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <button
          onClick={openCreate}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white",
            "bg-gradient-to-r from-blue-500 to-violet-600 transition-opacity hover:opacity-90"
          )}
        >
          <Plus className="h-4 w-4" />
          Nova conta
        </button>
      </div>

      {/* Summary cards */}
      {accounts.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TotalCard label="Saldo Total"    value={totalBalance}  color="blue"  />
          <TotalCard label="Total Positivo" value={totalPositive} color="green" />
          <TotalCard label="Total Negativo" value={totalNegative} color="red"   />
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <span>{globalError}</span>
          <button
            onClick={() => setGlobalError(null)}
            className="ml-3 font-medium underline underline-offset-2"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Search — só exibe quando há contas */}
      {accounts.length > 0 && (
        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, banco ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2",
              "text-[13px] text-foreground placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            )}
          />
        </div>
      )}

      {/* Content */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma conta cadastrada"
          description="Adicione sua primeira conta bancária, carteira ou investimento para começar a acompanhar seu patrimônio."
          action={{ label: "Adicionar conta", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma conta encontrada"
          description={`Nenhum resultado para "${search}". Tente outro termo.`}
          action={{ label: "Limpar busca", onClick: () => setSearch("") }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deletingIds.has(account.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AccountFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        institutions={institutions}
        account={editingAccount}
      />
    </>
  );
}
