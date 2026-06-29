"use client";

import * as React from "react";
import { Plus, Search, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/feedback/EmptyState";
import { deleteTransaction } from "@/services/transaction";
import { TransactionItem } from "./TransactionItem";
import { TransactionFormModal } from "./TransactionFormModal";
import type { Transaction, TransactionType, Category } from "@/types/transaction";
import type { FinancialAccount } from "@/types/financial-account";
import type { CreditCard } from "@/types/credit-card";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  accounts:            FinancialAccount[];
  cards:               CreditCard[];
  categories:          Category[];
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon:  React.ElementType;
  color: "blue" | "emerald" | "rose";
}) {
  const colors = {
    blue:    "from-blue-500/10 to-violet-500/5 border-blue-500/20",
    emerald: "from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
    rose:    "from-rose-500/10 to-pink-500/5 border-rose-500/20",
  };
  const textColors = {
    blue:    "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose:    "text-rose-600 dark:text-rose-400",
  };
  const iconColors = {
    blue:    "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    rose:    "bg-rose-500/10 text-rose-500",
  };

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-gradient-to-br p-4", colors[color])}>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconColors[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <p className={cn("text-[18px] font-bold tabular-nums", textColors[color])}>
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTER_TABS: { value: TransactionType | "all"; label: string }[] = [
  { value: "all",      label: "Todos"          },
  { value: "income",   label: "Receitas"       },
  { value: "expense",  label: "Despesas"       },
  { value: "transfer", label: "Transferências" },
];

// ── Month picker ──────────────────────────────────────────────────────────────

function getMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  opts.push({ value: "all", label: "Todos os períodos" });
  return opts;
}

// ── Main component ────────────────────────────────────────────────────────────

export function TransactionsClient({
  initialTransactions,
  accounts,
  cards,
  categories,
}: TransactionsClientProps) {
  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactions);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TransactionType | "all">("all");
  const [monthFilter, setMonthFilter] = React.useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    let result = transactions;

    // Filtro de mês
    if (monthFilter !== "all") {
      result = result.filter((tx) => tx.date.startsWith(monthFilter));
    }

    // Filtro de tipo
    if (typeFilter !== "all") {
      result = result.filter((tx) => tx.type === typeFilter);
    }

    // Busca
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          tx.category?.name.toLowerCase().includes(q) ||
          tx.account?.name.toLowerCase().includes(q) ||
          tx.card?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, typeFilter, monthFilter, search]);

  // Totais do mês filtrado (sem filtro de tipo)
  const monthTransactions = React.useMemo(() => {
    if (monthFilter === "all") return transactions;
    return transactions.filter((tx) => tx.date.startsWith(monthFilter));
  }, [transactions, monthFilter]);

  const totalIncome   = monthTransactions.filter((tx) => tx.type === "income"  && tx.status !== "cancelled").reduce((s, tx) => s + tx.amount, 0);
  const totalExpense  = monthTransactions.filter((tx) => tx.type === "expense" && tx.status !== "cancelled").reduce((s, tx) => s + tx.amount, 0);
  const totalBalance  = totalIncome - totalExpense;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingTx(null);
    setModalOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setModalOpen(true);
  }

  function handleSuccess(tx: Transaction) {
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === tx.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = tx;
        return next;
      }
      // Insere na posição correta (order by date desc)
      const next = [tx, ...prev];
      return next.sort((a, b) => b.date.localeCompare(a.date));
    });
    setGlobalError(null);
  }

  async function handleDelete(id: string) {
    setDeletingIds((s) => new Set(s).add(id));
    setGlobalError(null);
    const result = await deleteTransaction(id);
    if (result.error) {
      setGlobalError(result.error);
    } else {
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    }
    setDeletingIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Transações</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {transactions.length === 0
              ? "Registre sua primeira transação."
              : `${transactions.length} transaç${transactions.length > 1 ? "ões" : "ão"} no histórico`}
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
          Nova transação
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Receitas"  value={totalIncome}  icon={TrendingUp}   color="emerald" />
        <SummaryCard label="Despesas"  value={totalExpense} icon={TrendingDown}  color="rose"    />
        <SummaryCard label="Saldo"     value={totalBalance} icon={ArrowLeftRight} color="blue"   />
      </div>

      {/* Global error */}
      {globalError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <span>{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="ml-3 font-medium underline underline-offset-2">
            Fechar
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Month picker */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={cn(
            "h-9 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors",
            "sm:w-48 shrink-0"
          )}
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Type tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                "h-8 shrink-0 rounded-lg px-3 text-[12px] font-medium transition-colors",
                typeFilter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar transações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2",
              "text-[13px] text-foreground placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            )}
          />
        </div>
      </div>

      {/* Content */}
      {transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhuma transação registrada"
          description="Registre receitas, despesas e transferências para acompanhar seu fluxo financeiro."
          action={{ label: "Nova transação", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma transação encontrada"
          description="Tente ajustar os filtros ou o termo de busca."
          action={{ label: "Limpar filtros", onClick: () => { setSearch(""); setTypeFilter("all"); } }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deletingIds.has(tx.id)}
            />
          ))}
        </div>
      )}

      <TransactionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        accounts={accounts}
        cards={cards}
        categories={categories}
        transaction={editingTx}
      />
    </>
  );
}
