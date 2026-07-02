"use client";

/**
 * TransactionsClient
 * Sprint 14.3
 *
 * Regressao corrigida:
 *   - monthFilter restaurado para "all" (comportamento original)
 *   - Sync button usa syncConnectionAccounts (mesmo flow do AccountsClient)
 *   - router.refresh() atualiza a lista apos sync
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Tag,
  RefreshCw,
  AlertCircle,
  Clock,
  BarChart2,
  Zap,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn, formatCurrency }       from "@/lib/utils";
import { EmptyState }               from "@/components/feedback/EmptyState";
import { deleteTransaction }        from "@/services/transaction";
import { syncConnectionAccounts }   from "@/services/open-finance";
import { TransactionItem }          from "./TransactionItem";
import { TransactionFormModal }     from "./TransactionFormModal";
import type { Transaction, TransactionType, Category } from "@/types/transaction";
import type { FinancialAccount }    from "@/types/financial-account";
import type { CreditCard }          from "@/types/credit-card";
import { computeTransactionAnalytics, computeCategoryBreakdown } from "@/lib/transaction-analytics";
import type {
  TransactionAnalytics,
  SmartCard,
  DataQualityItem,
  CategorySpend,
} from "@/lib/transaction-analytics";
import { CategorySpendingPanel } from "./CategorySpendingPanel";

// --- Lucide icon map ----------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  Clock,
  TrendingDown,
  BarChart2,
  AlertCircle,
  RefreshCw,
  Tag,
  ShieldCheck,
  Sparkles,
};

// --- Props -------------------------------------------------------------------

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  accounts:            FinancialAccount[];
  cards:               CreditCard[];
  categories:          Category[];
  analytics:           TransactionAnalytics;
}

// --- Helpers -----------------------------------------------------------------

function getMonthOptions() {
  const now  = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  opts.push({ value: "all", label: "Todos os periodos" });
  return opts;
}

const FILTER_TABS: { value: TransactionType | "all"; label: string }[] = [
  { value: "all",      label: "Todos"          },
  { value: "income",   label: "Receitas"       },
  { value: "expense",  label: "Despesas"       },
  { value: "transfer", label: "Transferencias" },
];

function formatLastSync(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)  return "Agora mesmo";
  if (mins < 60) return `Ha ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Ha ${hrs}h`;
  return `Ha ${Math.floor(hrs / 24)} dia${Math.floor(hrs / 24) > 1 ? "s" : ""}`;
}

function txAIStatus(tx: Transaction): { label: string; cls: string } {
  if (tx.status === "pending") {
    return { label: "Revisar", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  }
  if (!tx.category_id && tx.type === "expense") {
    return { label: "Sugestao IA", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" };
  }
  return { label: "Confirmada", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
}

// --- Hero Section ------------------------------------------------------------

function HeroSection({ analytics }: { analytics: TransactionAnalytics }) {
  const { hero, kpis } = analytics;
  const borderCls =
    hero.sentiment === "positive" ? "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20" :
    hero.sentiment === "negative" ? "from-rose-500/10 via-pink-500/5 to-transparent border-rose-500/20" :
                                    "from-blue-500/10 via-violet-500/5 to-transparent border-blue-500/20";
  const iconBg =
    hero.sentiment === "positive" ? "bg-emerald-500/10" :
    hero.sentiment === "negative" ? "bg-rose-500/10"    : "bg-blue-500/10";
  const IconEl =
    hero.sentiment === "positive" ? TrendingUp :
    hero.sentiment === "negative" ? TrendingDown : Sparkles;
  const iconCls =
    hero.sentiment === "positive" ? "text-emerald-500" :
    hero.sentiment === "negative" ? "text-rose-500"    : "text-blue-500";

  return (
    <div className={cn("mb-6 rounded-2xl border bg-gradient-to-br p-5", borderCls)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <IconEl className={cn("h-5 w-5", iconCls)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Analise das movimentacoes
          </p>
          <h2 className="mt-0.5 text-[16px] font-bold text-foreground leading-snug">
            {hero.headline}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{hero.subtext}</p>
        </div>
        {kpis.txCount > 0 && (
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-[11px] text-muted-foreground">Movimentado</p>
            <p className="text-[18px] font-bold tabular-nums text-foreground">
              {formatCurrency(kpis.totalMoved)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- KPI Card ----------------------------------------------------------------

type KPIColor = "emerald" | "rose" | "blue" | "violet" | "amber";

const KPI_BG: Record<KPIColor, string> = {
  emerald: "from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
  rose:    "from-rose-500/10 to-pink-500/5 border-rose-500/20",
  blue:    "from-blue-500/10 to-violet-500/5 border-blue-500/20",
  violet:  "from-violet-500/10 to-indigo-500/5 border-violet-500/20",
  amber:   "from-amber-500/10 to-yellow-500/5 border-amber-500/20",
};
const KPI_TXT: Record<KPIColor, string> = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose:    "text-rose-600 dark:text-rose-400",
  blue:    "text-blue-600 dark:text-blue-400",
  violet:  "text-violet-600 dark:text-violet-400",
  amber:   "text-amber-600 dark:text-amber-400",
};

function KPICard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: KPIColor;
}) {
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", KPI_BG[color])}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[18px] font-bold tabular-nums", KPI_TXT[color])}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// --- Smart Card Item ---------------------------------------------------------

type CardSeverity = SmartCard["severity"];

const CARD_BORDER: Record<CardSeverity, string> = {
  neutral: "border-border bg-card",
  success: "border-emerald-500/20 bg-emerald-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
  danger:  "border-rose-500/20 bg-rose-500/5",
  info:    "border-blue-500/20 bg-blue-500/5",
};
const CARD_ICON: Record<CardSeverity, string> = {
  neutral: "bg-secondary text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  danger:  "bg-rose-500/10 text-rose-500",
  info:    "bg-blue-500/10 text-blue-500",
};
const CARD_VAL: Record<CardSeverity, string> = {
  neutral: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger:  "text-rose-600 dark:text-rose-400",
  info:    "text-blue-600 dark:text-blue-400",
};

function SmartCardItem({ card }: { card: SmartCard }) {
  const Icon = ICON_MAP[card.icon] ?? AlertCircle;
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", CARD_BORDER[card.severity])}>
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", CARD_ICON[card.severity])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{card.title}</p>
        <p className={cn("mt-0.5 text-[15px] font-bold", CARD_VAL[card.severity])}>{card.value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{card.detail}</p>
      </div>
    </div>
  );
}

// --- Quality Section ---------------------------------------------------------

function QualitySection({ score, label, items }: {
  score: number; label: string; items: DataQualityItem[];
}) {
  const color =
    score >= 90 ? "text-emerald-500" :
    score >= 70 ? "text-blue-500"    :
    score >= 50 ? "text-amber-500"   : "text-rose-500";
  const bar =
    score >= 90 ? "bg-emerald-500" :
    score >= 70 ? "bg-blue-500"    :
    score >= 50 ? "bg-amber-500"   : "bg-rose-500";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Qualidade dos Dados</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Indice de precisao FIRE</p>
        </div>
        <div className="text-right">
          <p className={cn("text-[28px] font-black tabular-nums", color)}>{score}</p>
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        </div>
      </div>
      <div className="mb-5 h-2 w-full rounded-full bg-secondary">
        <div className={cn("h-2 rounded-full transition-all", bar)} style={{ width: `${score}%` }} />
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            {item.ok
              ? <CheckCircle2  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"   />
            }
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Quick Actions -----------------------------------------------------------

function QuickActions({
  onNew,
  onSyncAll,
  syncBusy,
}: {
  onNew:     () => void;
  onSyncAll: () => void;
  syncBusy:  boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onNew}
        className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 text-[12px] font-semibold text-white hover:opacity-90 transition-opacity"
      >
        <Plus className="h-3.5 w-3.5" />
        Nova transacao
      </button>
      <button
        onClick={onSyncAll}
        disabled={syncBusy}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[12px] font-semibold text-foreground transition-colors",
          syncBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-secondary"
        )}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", syncBusy && "animate-spin")} />
        {syncBusy ? "Sincronizando..." : "Sincronizar"}
      </button>
      <button
        onClick={() => window.location.assign("/budgets")}
        className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[12px] font-semibold text-foreground hover:bg-secondary transition-colors"
      >
        <BarChart2 className="h-3.5 w-3.5" />
        Orcamentos
      </button>
      <button
        onClick={() => alert("Exportacao CSV sera implementada em breve.")}
        className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[12px] font-semibold text-foreground hover:bg-secondary transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar
      </button>
    </div>
  );
}

// --- Main Component ----------------------------------------------------------

export function TransactionsClient({
  initialTransactions,
  accounts,
  cards,
  categories,
  analytics,
}: TransactionsClientProps) {
  const router = useRouter();

  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactions);
  const [modalOpen,    setModalOpen]    = React.useState(false);
  const [editingTx,    setEditingTx]    = React.useState<Transaction | null>(null);
  const [deletingIds,  setDeletingIds]  = React.useState<Set<string>>(new Set());
  const [globalError,  setGlobalError]  = React.useState<string | null>(null);
  const [search,       setSearch]       = React.useState("");
  const [typeFilter,   setTypeFilter]   = React.useState<TransactionType | "all">("all");

  // Filtro de período — padrão: mês corrente
  const [periodMode,        setPeriodMode]        = React.useState<"current" | "month" | "range">("current");
  const [selectedMonth,     setSelectedMonth]     = React.useState<string>("");
  const [dateFrom,          setDateFrom]          = React.useState<string>("");
  const [dateTo,            setDateTo]            = React.useState<string>("");
  const [uncategorizedOnly, setUncategorizedOnly] = React.useState(false);

  // Sync state (mesmo padrao do AccountsClient)
  const [syncBusy,     setSyncBusy]     = React.useState(false);
  const [syncFeedback, setSyncFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // IDs unicos de conexoes OF a partir das contas (sem query adicional)
  const connectionIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const a of accounts) {
      if (a.of_connection_id) ids.add(a.of_connection_id);
    }
    return [...ids];
  }, [accounts]);

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  // Mês corrente como "YYYY-MM" — calculado uma vez
  const currentMonth = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // --- Derived ---------------------------------------------------------------

  // 1. Filtro de período (alimenta KPIs e hero)
  const periodFiltered = React.useMemo(() => {
    if (periodMode === "current") {
      return transactions.filter((tx) => tx.date.startsWith(currentMonth));
    }
    if (periodMode === "month" && selectedMonth) {
      return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
    }
    if (periodMode === "range") {
      return transactions.filter(
        (tx) => (!dateFrom || tx.date >= dateFrom) && (!dateTo || tx.date <= dateTo)
      );
    }
    return transactions;
  }, [transactions, periodMode, currentMonth, selectedMonth, dateFrom, dateTo]);

  // 2. Analytics recomputado para o período selecionado (KPIs, hero, smart cards)
  const periodAnalytics = React.useMemo(
    () => computeTransactionAnalytics(periodFiltered, accounts),
    [periodFiltered, accounts]
  );

  // 3. Breakdown por categoria (alimenta painel de gastos)
  const categoryBreakdown = React.useMemo<CategorySpend[]>(
    () => computeCategoryBreakdown(periodFiltered, transactions),
    [periodFiltered, transactions],
  );

  // 4. Filtro do extrato (typeFilter + uncategorized + search) sobre periodFiltered
  const filtered = React.useMemo(() => {
    let result = periodFiltered;
    if (typeFilter !== "all") {
      result = result.filter((tx) => tx.type === typeFilter);
    }
    if (uncategorizedOnly) {
      result = result.filter((tx) => !tx.category_id);
    }
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
  }, [periodFiltered, typeFilter, search, uncategorizedOnly]);

  // --- Handlers --------------------------------------------------------------

  function openCreate() { setEditingTx(null); setModalOpen(true); }
  function openEdit(tx: Transaction) { setEditingTx(tx); setModalOpen(true); }

  function handleSuccess(tx: Transaction) {
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === tx.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = tx; return next; }
      return [tx, ...prev].sort((a, b) => b.date.localeCompare(a.date));
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
    setDeletingIds((s) => { const next = new Set(s); next.delete(id); return next; });
  }

  // Mesmo flow do AccountsClient: syncConnectionAccounts por conexao + router.refresh()
  async function handleSyncAll() {
    if (syncBusy) return;
    if (connectionIds.length === 0) {
      setSyncFeedback({ type: "error", message: "Nenhuma conexao Open Finance encontrada. Conecte um banco em Configuracoes." });
      return;
    }
    setSyncBusy(true);
    setSyncFeedback(null);
    setGlobalError(null);

    const results = await Promise.allSettled(
      connectionIds.map((id) => syncConnectionAccounts(id))
    );

    const errors = results
      .filter((r): r is PromiseFulfilledResult<{ data: unknown; error: string | null }> =>
        r.status === "fulfilled" && r.value.error !== null)
      .map((r) => r.value.error as string);

    const ok = errors.length === 0;
    setSyncFeedback({
      type:    ok ? "success" : "error",
      message: ok
        ? `${connectionIds.length} conexao(oes) sincronizadas com sucesso. Atualizando...`
        : `Erro em ${errors.length} conexao(oes): ${errors[0]}`,
    });

    if (ok) router.refresh();
    setSyncBusy(false);
  }

  const { kpis, smartCards } = periodAnalytics;  // período selecionado
  const { quality }          = analytics;          // qualidade geral (todos os dados)

  // --- Render ----------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Analise das movimentacoes</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {transactions.length === 0
              ? "Registre sua primeira transacao."
              : `${transactions.length} transac${transactions.length > 1 ? "oes" : "ao"} no historico`}
          </p>
        </div>
        <QuickActions onNew={openCreate} onSyncAll={handleSyncAll} syncBusy={syncBusy} />
      </div>

      {/* Linha 2 — Filtros de período */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* Mês atual */}
        <button
          onClick={() => setPeriodMode("current")}
          className={cn(
            "h-8 rounded-lg px-3 text-[12px] font-medium transition-colors",
            periodMode === "current"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:bg-secondary"
          )}
        >
          Mes atual
        </button>

        {/* Selecionar mês */}
        <select
          value={periodMode === "month" ? selectedMonth : ""}
          onChange={(e) => { if (e.target.value) { setSelectedMonth(e.target.value); setPeriodMode("month"); } }}
          className={cn(
            "h-8 rounded-lg border bg-background px-3 text-[12px] text-foreground transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring/30",
            periodMode === "month" ? "border-primary text-foreground" : "border-border text-muted-foreground"
          )}
        >
          <option value="">Selecionar mes...</option>
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Range de datas */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPeriodMode("range"); }}
            className={cn(
              "h-8 rounded-lg border bg-background px-2 text-[12px] text-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring/30",
              periodMode === "range" && dateFrom ? "border-primary" : "border-border"
            )}
          />
          <span className="text-[11px] text-muted-foreground">ate</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPeriodMode("range"); }}
            className={cn(
              "h-8 rounded-lg border bg-background px-2 text-[12px] text-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring/30",
              periodMode === "range" && dateTo ? "border-primary" : "border-border"
            )}
          />
        </div>

        {/* Limpar período */}
        {periodMode !== "current" && (
          <button
            onClick={() => { setPeriodMode("current"); setSelectedMonth(""); setDateFrom(""); setDateTo(""); }}
            className="h-8 rounded-lg border border-border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            Limpar periodo
          </button>
        )}

        {/* Contador */}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {periodFiltered.length} transac{periodFiltered.length !== 1 ? "oes" : "ao"} no periodo
        </span>
      </div>

      {/* Hero — período selecionado */}
      <HeroSection analytics={periodAnalytics} />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Receitas"      value={formatCurrency(kpis.totalIncome)}  color="emerald" />
        <KPICard label="Despesas"      value={formatCurrency(kpis.totalExpense)} color="rose"    />
        <KPICard
          label="Saldo liquido"
          value={formatCurrency(kpis.netBalance)}
          color={kpis.netBalance >= 0 ? "blue" : "rose"}
        />
        <KPICard
          label="Categorizadas"
          value={`${kpis.categorizedPct}%`}
          sub={kpis.uncategorized > 0 ? `${kpis.uncategorized} sem categoria` : "Tudo categorizado"}
          color={kpis.categorizedPct >= 80 ? "emerald" : "amber"}
        />
        <KPICard
          label="Movimentacoes"
          value={`${kpis.txCount}`}
          sub={kpis.pendingCount > 0
            ? `${kpis.pendingCount} pendente${kpis.pendingCount > 1 ? "s" : ""}`
            : "Todas confirmadas"}
          color="violet"
        />
        <KPICard
          label="Ultima sync"
          value={formatLastSync(kpis.lastSyncAt)}
          sub="Open Finance"
          color="blue"
        />
      </div>

      {/* Smart Cards + Qualidade */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-[13px] font-semibold text-foreground">Insights do mes</h2>
          {smartCards.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-[13px] text-muted-foreground">
                Nenhum alerta - suas financas estao em ordem.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {smartCards.map((card) => (
                <SmartCardItem key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-[13px] font-semibold text-foreground">Qualidade dos dados</h2>
          <QualitySection score={quality.score} label={quality.label} items={quality.items} />
        </div>
      </div>

      {/* Gastos por categoria */}
      {categoryBreakdown.length > 0 && (
        <div className="mb-6">
          <CategorySpendingPanel
            categories={categoryBreakdown}
            periodTransactions={periodFiltered}
          />
        </div>
      )}

      {/* Sync feedback */}
      {syncFeedback && (
        <div className={cn(
          "mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-[13px]",
          syncFeedback.type === "success"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-destructive/20 bg-destructive/10 text-destructive"
        )}>
          <span>{syncFeedback.message}</span>
          <button onClick={() => setSyncFeedback(null)} className="ml-3 font-medium underline underline-offset-2">
            Fechar
          </button>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <span>{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="ml-3 font-medium underline underline-offset-2">
            Fechar
          </button>
        </div>
      )}

      {/* Extrato heading */}
      <h2 className="mb-3 text-[13px] font-semibold text-foreground">Extrato</h2>

      {/* Filters row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <button
            onClick={() => setUncategorizedOnly((v) => !v)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors",
              uncategorizedOnly
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            <Tag className="h-3 w-3" />
            Sem categoria
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar transacoes..."
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

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhuma transacao registrada"
          description="Registre receitas, despesas e transferencias para acompanhar seu fluxo financeiro."
          action={{ label: "Nova transacao", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma transacao encontrada"
          description="Tente ajustar os filtros ou o termo de busca."
          action={{ label: "Limpar filtros", onClick: () => { setSearch(""); setTypeFilter("all"); setUncategorizedOnly(false); setPeriodMode("current"); setSelectedMonth(""); setDateFrom(""); setDateTo(""); } }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((tx) => {
            const ai = txAIStatus(tx);
            const aiBadge = (
              <span className={cn(
                "hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                "text-[10px] font-semibold",
                ai.cls
              )}>
                {ai.label === "Confirmada"  && <CheckCircle2  className="h-3 w-3" />}
                {ai.label === "Sugestao IA" && <Zap           className="h-3 w-3" />}
                {ai.label === "Revisar"     && <AlertTriangle className="h-3 w-3" />}
                {ai.label}
              </span>
            );
            return (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deletingIds.has(tx.id)}
                badge={aiBadge}
              />
            );
          })}
        </div>
      )}

      {/* Modal */}
      <TransactionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        accounts={accounts}
        cards={cards}
        categories={categories}
        initialData={editingTx ?? undefined}
        transaction={editingTx}
      />
    </>
  );
}
