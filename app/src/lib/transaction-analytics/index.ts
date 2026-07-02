/**
 * Transaction Analytics Engine
 * Sprint 14.3 — Transações como fonte de dados analíticos
 *
 * Funções puras — sem I/O, sem queries.
 * Entrada: dados já carregados pela página (transactions, budgets, accounts).
 * Saída: estruturas tipadas para Hero, KPIs, Cards Inteligentes, Qualidade de Dados.
 *
 * Esses dados alimentam diretamente:
 *   - Hero Executivo da página /transactions
 *   - Dashboard Central (prioridades, health score, fire chat)
 */

import type { Transaction } from "@/types/transaction";
import type { BudgetComparison } from "@/types/budget";
import type { FinancialAccount } from "@/types/financial-account";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthKey(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Output types ──────────────────────────────────────────────────────────────

export interface TransactionKPIs {
  /** Total movimentado (income + expense) no mês atual */
  totalMoved:      number;
  /** Total de receitas no mês atual */
  totalIncome:     number;
  /** Total de despesas no mês atual */
  totalExpense:    number;
  /** Saldo líquido do mês (income - expense) */
  netBalance:      number;
  /** % de transações de despesa com categoria */
  categorizedPct:  number;
  /** Quantidade de despesas sem categoria */
  uncategorized:   number;
  /** Data/hora do último balance_updated_at entre todas as contas (ISO) */
  lastSyncAt:      string | null;
  /** Total de transações no mês */
  txCount:         number;
  /** Total de transações pendentes */
  pendingCount:    number;
}

export interface SmartCard {
  id:          string;
  title:       string;
  value:       string;
  detail:      string;
  severity:    "neutral" | "success" | "warning" | "danger" | "info";
  icon:        string;
  actionLabel: string;
  actionHref:  string;
}

export interface DataQualityItem {
  label:    string;
  ok:       boolean;
  detail:   string;
  weight:   number;     // peso relativo no índice (0-1, soma = 1)
}

export interface DataQualityIndex {
  score:    number;     // 0-100
  label:    string;     // "Excelente" | "Bom" | "Regular" | "Baixo"
  items:    DataQualityItem[];
}

export interface RecurringCandidate {
  description: string;
  avgAmount:   number;
  count:       number;
  lastDate:    string;
}

export interface HeroInsight {
  /** Frase resumida do status financeiro do mês */
  headline:    string;
  /** Detalhe adicional orientado a FIRE */
  subtext:     string;
  /** Nível de atenção */
  sentiment:   "positive" | "neutral" | "negative";
}

export interface TransactionAnalytics {
  kpis:           TransactionKPIs;
  smartCards:     SmartCard[];
  quality:        DataQualityIndex;
  recurring:      RecurringCandidate[];
  hero:           HeroInsight;
  /** Mês de referência: "YYYY-MM" */
  referenceMonth: string;
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

function computeKPIs(
  transactions: Transaction[],
  accounts:     FinancialAccount[],
): TransactionKPIs {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeAccounts     = Array.isArray(accounts)     ? accounts     : [];
  // Opera sobre TODAS as transações passadas — sem filtro de mês.
  // Os KPIs refletem exatamente os dados carregados na página.
  const active  = safeTransactions.filter(tx => tx.status !== "cancelled");
  const income  = active.filter(tx => tx.type === "income");
  const expense = active.filter(tx => tx.type === "expense");

  const totalIncome  = income.reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = expense.reduce((s, tx) => s + tx.amount, 0);

  const uncategorized = expense.filter(tx => !tx.category_id).length;
  const categorizedPct =
    expense.length === 0 ? 100 : ((expense.length - uncategorized) / expense.length) * 100;

  const pendingCount = safeTransactions.filter(tx => tx.status === "pending").length;

  // Última sincronização: balance_updated_at mais recente entre contas conectadas via OF
  const syncDates = safeAccounts
    .filter(a => a.of_connection_id && a.balance_updated_at)
    .map(a => a.balance_updated_at as string);
  const lastSyncAt = syncDates.length > 0
    ? syncDates.sort().reverse()[0]
    : null;

  return {
    totalMoved:     totalIncome + totalExpense,
    totalIncome,
    totalExpense,
    netBalance:     totalIncome - totalExpense,
    categorizedPct: Math.round(categorizedPct),
    uncategorized,
    lastSyncAt,
    txCount:        safeTransactions.length,
    pendingCount,
  };
}

// ── Recurring detection ────────────────────────────────────────────────────────

function detectRecurring(transactions: Transaction[]): RecurringCandidate[] {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  // Agrupa despesas por descrição normalizada
  const map = new Map<string, Transaction[]>();
  for (const tx of safeTransactions) {
    if (tx.type !== "expense" || tx.status === "cancelled") continue;
    const key = tx.description.trim().toLowerCase();
    const list = map.get(key) ?? [];
    list.push(tx);
    map.set(key, list);
  }

  const candidates: RecurringCandidate[] = [];
  for (const [, txs] of map) {
    if (txs.length < 2) continue; // aparece em >= 2 meses diferentes
    const months = new Set(txs.map(tx => tx.date.slice(0, 7)));
    if (months.size < 2) continue;
    const avg = txs.reduce((s, tx) => s + tx.amount, 0) / txs.length;
    const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
    candidates.push({
      description: sorted[0].description,
      avgAmount:   avg,
      count:       months.size,
      lastDate:    sorted[0].date,
    });
  }

  return candidates.sort((a, b) => b.avgAmount - a.avgAmount).slice(0, 5);
}

// ── Smart Cards ───────────────────────────────────────────────────────────────

function computeSmartCards(
  transactions: Transaction[],
  budgets:      BudgetComparison[],
  kpis:         TransactionKPIs,
  recurring:    RecurringCandidate[],
): SmartCard[] {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeBudgets      = Array.isArray(budgets)      ? budgets      : [];
  const safeRecurring    = Array.isArray(recurring)    ? recurring    : [];
  const cards: SmartCard[] = [];

  // Todas as despesas ativas — sem filtro de mês
  const allExpenses = safeTransactions.filter(
    tx => tx.type === "expense" && tx.status !== "cancelled"
  );

  // Para comparação mês-a-mês, usar os dois meses mais recentes com dados
  const monthsWithData = [...new Set(allExpenses.map(tx => tx.date.slice(0, 7)))].sort().reverse();
  const recentMonth  = monthsWithData[0] ?? "";
  const prevMonthKey = monthsWithData[1] ?? "";

  const recentExpenses = allExpenses.filter(tx => tx.date.startsWith(recentMonth));
  const prevExpenses   = allExpenses.filter(tx => tx.date.startsWith(prevMonthKey));

  // ── Card 1: Transações pendentes ─────────────────────────────────────────────
  if (kpis.pendingCount > 0) {
    cards.push({
      id:          "pending",
      title:       "Transacoes pendentes",
      value:       `${kpis.pendingCount}`,
      detail:      `${kpis.pendingCount === 1 ? "transacao aguarda" : "transacoes aguardam"} confirmacao`,
      severity:    kpis.pendingCount >= 5 ? "warning" : "info",
      icon:        "Clock",
      actionLabel: "Revisar pendentes",
      actionHref:  "/transactions",
    });
  }

  // ── Card 2: Maior gasto (período mais recente com dados) ──────────────────────
  if (recentExpenses.length > 0) {
    const biggest = [...recentExpenses].sort((a, b) => b.amount - a.amount)[0];
    cards.push({
      id:          "biggest-expense",
      title:       "Maior gasto registrado",
      value:       fmtBRL(biggest.amount),
      detail:      biggest.description,
      severity:    biggest.amount > kpis.totalExpense * 0.3 ? "warning" : "neutral",
      icon:        "TrendingDown",
      actionLabel: "Ver transacao",
      actionHref:  "/transactions",
    });
  }

  // ── Card 3: Categoria com maior gasto total ───────────────────────────────────
  {
    const byCatCurr = new Map<string, number>();
    const byCatPrev = new Map<string, number>();
    for (const tx of recentExpenses) {
      const k = tx.category?.name ?? "Sem categoria";
      byCatCurr.set(k, (byCatCurr.get(k) ?? 0) + tx.amount);
    }
    for (const tx of prevExpenses) {
      const k = tx.category?.name ?? "Sem categoria";
      byCatPrev.set(k, (byCatPrev.get(k) ?? 0) + tx.amount);
    }
    let maxGrowth = 0;
    let maxCat    = "";
    let maxCurr   = 0;
    let maxPrev   = 0;
    for (const [cat, curr] of byCatCurr) {
      const prev   = byCatPrev.get(cat) ?? 0;
      const growth = prev === 0 ? curr : ((curr - prev) / prev) * 100;
      if (growth > maxGrowth && curr > 50) {
        maxGrowth = growth;
        maxCat    = cat;
        maxCurr   = curr;
        maxPrev   = prev;
      }
    }
    if (maxCat) {
      const detail = maxPrev === 0
        ? `Categoria nova — ${fmtBRL(maxCurr)} no periodo`
        : `${fmtBRL(maxPrev)} → ${fmtBRL(maxCurr)} (${maxGrowth > 999 ? "+999" : "+" + maxGrowth.toFixed(0)}%)`;
      cards.push({
        id:          "growing-category",
        title:       "Categoria que mais cresceu",
        value:       maxCat,
        detail,
        severity:    maxGrowth > 50 ? "warning" : "info",
        icon:        "BarChart2",
        actionLabel: "Ver transacoes",
        actionHref:  "/transactions",
      });
    }
  }

  // ── Card 4: Categoria fora do orçamento ───────────────────────────────────────
  {
    const exceeded = safeBudgets
      .filter(b => b.planned_amount !== null && (b.usage_percentage ?? 0) >= 100)
      .sort((a, b) => (b.usage_percentage ?? 0) - (a.usage_percentage ?? 0));

    if (exceeded.length > 0) {
      const worst = exceeded[0];
      cards.push({
        id:          "over-budget",
        title:       "Categoria fora do orçamento",
        value:       worst.category_name,
        detail:      `${(worst.usage_percentage ?? 0).toFixed(0)}% utilizado — ${fmtBRL(worst.actual_amount)} de ${fmtBRL(worst.planned_amount!)}`,
        severity:    "danger",
        icon:        "AlertCircle",
        actionLabel: "Revisar orçamento",
        actionHref:  "/budgets",
      });
    }
  }

  // ── Card 5: Possíveis recorrências ────────────────────────────────────────────
  if (safeRecurring.length > 0) {
    const top = safeRecurring[0];
    cards.push({
      id:          "recurring",
      title:       "Possíveis recorrências",
      value:       `${safeRecurring.length} detectada${safeRecurring.length > 1 ? "s" : ""}`,
      detail:      `Ex: "${top.description}" — ${fmtBRL(top.avgAmount)}/mês em média`,
      severity:    "info",
      icon:        "RefreshCw",
      actionLabel: "Ver recorrências",
      actionHref:  "/transactions",
    });
  }

  // ── Card 6: Transações que precisam de revisão (sem categoria) ────────────────
  if (kpis.uncategorized > 0) {
    cards.push({
      id:          "uncategorized",
      title:       "Precisam de revisão",
      value:       `${kpis.uncategorized}`,
      detail:      `desp${kpis.uncategorized > 1 ? "esas" : "esa"} sem categoria reduz${kpis.uncategorized > 1 ? "em" : ""} a precisão do FIRE`,
      severity:    kpis.uncategorized >= 10 ? "warning" : "info",
      icon:        "Tag",
      actionLabel: "Categorizar",
      actionHref:  "/transactions",
    });
  }

  return cards;
}

// ── Data Quality Index ────────────────────────────────────────────────────────

function computeQuality(
  kpis:                TransactionKPIs,
  accounts:            FinancialAccount[],
  budgets:             BudgetComparison[],
  recurring:           RecurringCandidate[],
  transactions:        Transaction[],
  budgetedCategoryIds: Set<string>,
): DataQualityIndex {
  const safeAccounts     = Array.isArray(accounts)     ? accounts     : [];
  const safeBudgets      = Array.isArray(budgets)      ? budgets      : [];
  const safeRecurring    = Array.isArray(recurring)    ? recurring    : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeBudgetedIds  = budgetedCategoryIds instanceof Set ? budgetedCategoryIds : new Set<string>();
  const connectedAccounts = safeAccounts.filter(a => a.of_connection_id);

  // Categorias com pelo menos uma despesa ativa
  const expenseCategoryIds = new Set(
    safeTransactions
      .filter(tx => tx.type === "expense" && tx.status !== "cancelled" && tx.category_id)
      .map(tx => tx.category_id as string)
  );

  // hasBudgets: orçamentos em qualquer mês (safeBudgetedIds) OU mês corrente
  const hasBudgets =
    safeBudgetedIds.size > 0 ||
    safeBudgets.some(b => b.planned_amount !== null);

  let budgetDetail: string;
  if (!hasBudgets) {
    budgetDetail = "Nenhum orcamento configurado";
  } else if (expenseCategoryIds.size === 0) {
    budgetDetail = `${safeBudgetedIds.size} orcamento${safeBudgetedIds.size !== 1 ? "s" : ""} configurado${safeBudgetedIds.size !== 1 ? "s" : ""}`;
  } else {
    const covered = [...expenseCategoryIds].filter(id => safeBudgetedIds.has(id)).length;
    const total   = expenseCategoryIds.size;
    budgetDetail  = covered === total
      ? `Orcamento configurado para todas as ${total} categorias`
      : `Orcamento configurado para ${covered} de ${total} categorias`;
  }

  const items: DataQualityItem[] = [
    {
      label:  "Contas sincronizadas",
      ok:     connectedAccounts.length > 0,
      detail: connectedAccounts.length > 0
        ? `${connectedAccounts.length} conta${connectedAccounts.length > 1 ? "s" : ""} via Open Finance`
        : "Nenhuma conta conectada — sync manual",
      weight: 0.30,
    },
    {
      label:  "Transacoes categorizadas",
      ok:     kpis.categorizedPct >= 80,
      detail: `${kpis.categorizedPct}% das despesas categorizadas`,
      weight: 0.35,
    },
    {
      label:  "Orcamento configurado",
      ok:     hasBudgets,
      detail: budgetDetail,
      weight: 0.20,
    },
    {
      label:  "Recorrencias identificadas",
      ok:     safeRecurring.length > 0,
      detail: safeRecurring.length > 0
        ? `${safeRecurring.length} gasto${safeRecurring.length > 1 ? "s" : ""} recorrente${safeRecurring.length > 1 ? "s" : ""} detectado${safeRecurring.length > 1 ? "s" : ""}`
        : "Nenhuma recorrencia detectada ainda",
      weight: 0.15,
    },
  ];

  const score = Math.round(
    items.reduce((s, item) => s + (item.ok ? item.weight * 100 : 0), 0)
  );

  const label =
    score >= 90 ? "Excelente" :
    score >= 70 ? "Bom"       :
    score >= 50 ? "Regular"   : "Baixo";

  return { score, label, items };
}

// ── Hero Insight ──────────────────────────────────────────────────────────────

function computeHero(kpis: TransactionKPIs, budgets: BudgetComparison[]): HeroInsight {
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const overBudget  = safeBudgets.filter(b => b.planned_amount !== null && (b.usage_percentage ?? 0) >= 100);
  const nearBudget  = safeBudgets.filter(b => b.planned_amount !== null && (b.usage_percentage ?? 0) >= 80 && (b.usage_percentage ?? 0) < 100);

  // Mês sem dados
  if (kpis.txCount === 0) {
    return {
      headline:  "Nenhuma movimentacao registrada ainda",
      subtext:   "Adicione transacoes ou conecte uma conta bancaria via Open Finance para ativar os insights do FIRE.",
      sentiment: "neutral",
    };
  }

  // Resultado negativo com orçamento excedido
  if (kpis.netBalance < 0 && overBudget.length > 0) {
    return {
      headline:  `Despesas superaram receitas em ${fmtBRL(Math.abs(kpis.netBalance))} este mes`,
      subtext:   `${overBudget.length} categoria${overBudget.length > 1 ? "s" : ""} fora do orcamento. Controlar gastos e essencial para manter o plano FIRE no prazo.`,
      sentiment: "negative",
    };
  }

  // Resultado negativo sem orçamento excedido
  if (kpis.netBalance < 0) {
    return {
      headline:  `Deficit de ${fmtBRL(Math.abs(kpis.netBalance))} no mes`,
      subtext:   `As despesas (${fmtBRL(kpis.totalExpense)}) superaram as receitas (${fmtBRL(kpis.totalIncome)}). Revise os gastos para volcar ao caminho do FIRE.`,
      sentiment: "negative",
    };
  }

  // Resultado positivo mas com alertas de orçamento
  if (kpis.netBalance > 0 && nearBudget.length > 0) {
    return {
      headline:  `Saldo positivo de ${fmtBRL(kpis.netBalance)} — atencao com ${nearBudget.length} categoria${nearBudget.length > 1 ? "s" : ""}`,
      subtext:   `${nearBudget.length > 1 ? "Categorias" : "Categoria"} proxima${nearBudget.length > 1 ? "s" : ""} do limite. Direcione o excedente para investimentos.`,
      sentiment: "neutral",
    };
  }

  // Resultado positivo e saudável
  if (kpis.netBalance > 0) {
    const savingsRate = kpis.totalIncome > 0 ? (kpis.netBalance / kpis.totalIncome) * 100 : 0;
    return {
      headline:  `Resultado positivo — ${fmtBRL(kpis.netBalance)} disponiveis para investir`,
      subtext:   savingsRate >= 20
        ? `Taxa de poupanca de ${savingsRate.toFixed(0)}%. Excelente disciplina financeira para o FIRE.`
        : `Taxa de poupanca de ${savingsRate.toFixed(0)}%. Considere aumentar aportes para acelerar o FIRE.`,
      sentiment: "positive",
    };
  }

  return {
    headline:  "Movimentacoes em dia",
    subtext:   `${kpis.txCount} transacoes registradas. Continue monitorando para manter o FIRE no caminho certo.`,
    sentiment: "neutral",
  };
}

// ── Main entry point ──────────────────────────────────────────────────────

/**
 * Computa todas as analises analiticas de transacoes.
 *
 * @param transactions        - todos os registros do usuario (sem paginacao)
 * @param accounts            - contas financeiras (para lastSyncAt e OF status)
 * @param budgets             - comparacao orcamento x realizado do mes atual
 * @param budgetedCategoryIds - Set de category_ids com orcamento em qualquer mes
 */
export function computeTransactionAnalytics(
  transactions:        Transaction[],
  accounts:            FinancialAccount[],
  budgets:             BudgetComparison[] = [],
  budgetedCategoryIds: Set<string> = new Set(),
): TransactionAnalytics {
  const kpis       = computeKPIs(transactions, accounts);
  const recurring  = detectRecurring(transactions);
  const smartCards = computeSmartCards(transactions, budgets, kpis, recurring);
  const quality    = computeQuality(kpis, accounts, budgets, recurring, transactions, budgetedCategoryIds);
  const hero       = computeHero(kpis, budgets);

  return {
    kpis,
    smartCards,
    quality,
    recurring,
    hero,
    referenceMonth: currentMonthKey(),
  };
}


// ── Category Breakdown ────────────────────────────────────────────────────────

export interface CategorySpend {
  /** null = "Sem categoria" */
  categoryId:    string | null;
  categoryName:  string;
  categoryColor: string | null;
  categoryIcon:  string | null;
  /** Total gasto no periodo selecionado */
  total:         number;
  /** % do total de despesas do periodo */
  pctOfTotal:    number;
  /** Variacao vs mes anterior (null = sem dados) */
  vsLastMonth:   number | null;
  /** Variacao vs media dos ultimos 6 meses (null = sem dados suficientes) */
  vsSixMonthAvg: number | null;
  /** Status em relacao a media de 6 meses */
  status:        "below" | "normal" | "above";
  /** Historico mensal — ultimos 6 meses com dados, ordem cronologica */
  history:       { month: string; amount: number }[];
  /** Qtd de transacoes no periodo */
  txCount:       number;
}

/**
 * Calcula o breakdown de gastos por categoria.
 *
 * @param periodTransactions  Transacoes do periodo selecionado (ja filtradas)
 * @param allTransactions     Todas as transacoes do usuario (para historico 6m)
 */
export function computeCategoryBreakdown(
  periodTransactions: Transaction[],
  allTransactions:    Transaction[],
): CategorySpend[] {
  const safePeriod = Array.isArray(periodTransactions) ? periodTransactions : [];
  const safeAll    = Array.isArray(allTransactions)    ? allTransactions    : [];

  // Apenas despesas ativas no periodo
  const periodExpenses = safePeriod.filter(
    (tx) => tx.type === "expense" && tx.status !== "cancelled",
  );
  const totalExpenses = periodExpenses.reduce((s, tx) => s + tx.amount, 0);
  if (totalExpenses === 0) return [];

  // Todas as despesas historicas
  const allExpenses = safeAll.filter(
    (tx) => tx.type === "expense" && tx.status !== "cancelled",
  );

  // Ultimos 6 meses com dados (ordem cronologica)
  const allMonths   = [...new Set(allExpenses.map((tx) => tx.date.slice(0, 7)))].sort();
  const last6Months = allMonths.slice(-6);

  // Mes anterior ao periodo (calendario)
  const periodMonths     = [...new Set(periodExpenses.map((tx) => tx.date.slice(0, 7)))].sort();
  const latestPeriodMonth = periodMonths[periodMonths.length - 1] ?? "";
  let prevMonth = "";
  if (latestPeriodMonth) {
    const d = new Date(latestPeriodMonth + "-15");
    d.setMonth(d.getMonth() - 1);
    prevMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  // Agrupar por categoria (key = category_id ?? "__null__")
  const catMap = new Map<
    string,
    { id: string | null; name: string; color: string | null; icon: string | null; total: number; txCount: number }
  >();

  for (const tx of periodExpenses) {
    const key = tx.category_id ?? "__null__";
    const cur = catMap.get(key);
    if (cur) {
      cur.total += tx.amount;
      cur.txCount++;
    } else {
      catMap.set(key, {
        id:      tx.category_id ?? null,
        name:    tx.category?.name  ?? "Sem categoria",
        color:   tx.category?.color ?? null,
        icon:    tx.category?.icon  ?? null,
        total:   tx.amount,
        txCount: 1,
      });
    }
  }

  const result: CategorySpend[] = [];

  for (const [key, cat] of catMap) {
    // Historico mensal (6 meses)
    const history = last6Months.map((month) => ({
      month,
      amount: allExpenses
        .filter((tx) => (tx.category_id ?? "__null__") === key && tx.date.startsWith(month))
        .reduce((s, tx) => s + tx.amount, 0),
    }));

    // vs mes anterior
    const prevAmt = prevMonth
      ? allExpenses
          .filter((tx) => (tx.category_id ?? "__null__") === key && tx.date.startsWith(prevMonth))
          .reduce((s, tx) => s + tx.amount, 0)
      : 0;
    const vsLastMonth =
      prevMonth && prevAmt > 0 ? ((cat.total - prevAmt) / prevAmt) * 100 : null;

    // vs media 6 meses (meses com gasto > 0)
    const nonZero      = history.filter((h) => h.amount > 0);
    const sixMonthAvg  = nonZero.length >= 2
      ? nonZero.reduce((s, h) => s + h.amount, 0) / nonZero.length
      : null;
    const vsSixMonthAvg =
      sixMonthAvg !== null && sixMonthAvg > 0
        ? ((cat.total - sixMonthAvg) / sixMonthAvg) * 100
        : null;

    // status
    let status: CategorySpend["status"] = "normal";
    if (vsSixMonthAvg !== null) {
      if (vsSixMonthAvg >= 15)  status = "above";
      else if (vsSixMonthAvg <= -15) status = "below";
    }

    result.push({
      categoryId:    cat.id,
      categoryName:  cat.name,
      categoryColor: cat.color,
      categoryIcon:  cat.icon,
      total:         cat.total,
      pctOfTotal:    (cat.total / totalExpenses) * 100,
      vsLastMonth,
      vsSixMonthAvg,
      status,
      history,
      txCount:       cat.txCount,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}
