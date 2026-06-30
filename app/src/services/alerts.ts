"use server";

/**
 * Service — Internal Alerts Center
 * Sprint 11.5
 *
 * Gera alertas operacionais baseados em:
 *  - Status das conexões Open Finance (queries mínimas)
 *  - HealthSnapshot (já calculado, zero queries extras)
 *  - DashboardData (já disponível, zero queries extras)
 *
 * Alertas são determinísticos, sem IA/LLM.
 * Ordenados por severidade: danger → warning → info.
 */

import { createClient }   from "@/lib/supabase/server";
import { requireAuth }    from "@/lib/supabase/require-auth";
import type { DashboardData } from "@/types/dashboard";
import type { HealthSnapshot } from "@/lib/financial-health";
import type { ServiceResult }  from "@/types/common";
import type { OpenFinanceConnection } from "@/types/open-finance";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "danger";

export interface InternalAlert {
  /** ID único do alerta (slug estável). */
  id:          string;
  title:       string;
  description: string;
  severity:    AlertSeverity;
  /** Texto do botão de ação. */
  actionLabel: string;
  /** Rota da tela correspondente. */
  actionHref:  string;
}

// ── Severidade ordenação ──────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  danger:  0,
  warning: 1,
  info:    2,
};

// ── Query — conexões OF ───────────────────────────────────────────────────────

async function fetchOFConnections(): Promise<OpenFinanceConnection[]> {
  const db = await createClient();
  const { data } = await db
    .from("open_finance_connection")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as OpenFinanceConnection[];
}

// ── Query — transações sem categoria ─────────────────────────────────────────

async function fetchUncategorizedCount(): Promise<number> {
  const db = await createClient();
  const { count } = await db
    .from("transaction")
    .select("id", { count: "exact", head: true })
    .is("category_id", null)
    .eq("type", "expense");
  return count ?? 0;
}

// ── Regras de alerta ─────────────────────────────────────────────────────────

/** 1. Conexão Open Finance com erro */
function alertOFError(connections: OpenFinanceConnection[]): InternalAlert | null {
  const errored = connections.filter(c => c.status === "error");
  if (errored.length === 0) return null;
  return {
    id:          "of_connection_error",
    title:       "Conexão bancária com erro",
    description: `${errored.length} ${errored.length === 1 ? "conexão" : "conexões"} Open Finance ${errored.length === 1 ? "está com erro" : "estão com erro"} e não ${errored.length === 1 ? "está" : "estão"} sincronizando dados.`,
    severity:    "danger",
    actionLabel: "Reconectar banco",
    actionHref:  "/settings/open-finance",
  };
}

/** 2. Conexão expirada */
function alertOFExpired(connections: OpenFinanceConnection[]): InternalAlert | null {
  const expired = connections.filter(c => c.status === "expired");
  if (expired.length === 0) return null;
  return {
    id:          "of_connection_expired",
    title:       "Conexão bancária expirada",
    description: `${expired.length} ${expired.length === 1 ? "conexão" : "conexões"} Open Finance expirou e precisa ser renovada para continuar importando dados.`,
    severity:    "danger",
    actionLabel: "Renovar conexão",
    actionHref:  "/settings/open-finance",
  };
}

/** 3. Sincronização atrasada (última sync > 48h) */
function alertOFStale(connections: OpenFinanceConnection[]): InternalAlert | null {
  const now = Date.now();
  const THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 horas

  const stale = connections.filter(c => {
    if (c.status !== "connected") return false;
    if (!c.last_synced_at) return true; // nunca sincronizou
    return now - new Date(c.last_synced_at).getTime() > THRESHOLD_MS;
  });

  if (stale.length === 0) return null;
  return {
    id:          "of_sync_stale",
    title:       "Sincronização atrasada",
    description: `${stale.length} ${stale.length === 1 ? "conexão bancária não é sincronizada" : "conexões bancárias não são sincronizadas"} há mais de 48 horas.`,
    severity:    "warning",
    actionLabel: "Sincronizar agora",
    actionHref:  "/settings/open-finance",
  };
}

/** 4. Health Score abaixo de 70 */
function alertLowHealthScore(health: HealthSnapshot | null): InternalAlert | null {
  if (!health) return null;
  const { score } = health.score;
  if (score >= 70) return null;
  const severity: AlertSeverity = score < 50 ? "danger" : "warning";
  return {
    id:          "low_health_score",
    title:       "Saúde financeira precisa de atenção",
    description: `Seu score financeiro está em ${score}/100 (nota ${health.score.grade}). Veja os pontos de atenção para melhorar.`,
    severity,
    actionLabel: "Ver diagnóstico",
    actionHref:  "/dashboard",
  };
}

/** 5. Reserva de emergência abaixo de 6 meses */
function alertLowEmergencyReserve(health: HealthSnapshot | null): InternalAlert | null {
  if (!health) return null;
  const { status, monthsCovered } = health.emergencyReserve;
  if (status === "adequate" || status === "excess") return null;
  const severity: AlertSeverity = status === "insufficient" ? "danger" : "warning";
  const months = monthsCovered.toFixed(1);
  return {
    id:          "low_emergency_reserve",
    title:       "Reserva de emergência insuficiente",
    description: `Sua reserva cobre apenas ${months} ${Number(months) === 1 ? "mês" : "meses"} de despesas. O recomendado é 6 meses.`,
    severity,
    actionLabel: "Ver reserva",
    actionHref:  "/dashboard",
  };
}

/** 6. Cartão com uso alto (>= 70%) */
function alertHighCreditUsage(data: DashboardData): InternalAlert | null {
  const pct = data.summary?.credit_usage_percentage ?? 0;
  if (pct < 70) return null;
  const severity: AlertSeverity = pct >= 90 ? "danger" : "warning";
  return {
    id:          "high_credit_usage",
    title:       "Uso elevado do limite do cartão",
    description: `Você está usando ${pct.toFixed(0)}% do limite total do cartão de crédito. Isso pode impactar seu score de crédito.`,
    severity,
    actionLabel: "Ver cartões",
    actionHref:  "/accounts",
  };
}

/** 7. Categoria com gasto elevado (>= 40% do total) */
function alertHighExpenseCategory(data: DashboardData): InternalAlert | null {
  const cats = data.expenseByCategory;
  if (cats.length < 2) return null;
  const total = cats.reduce((s, c) => s + c.total_amount, 0);
  if (total === 0) return null;
  const top = cats[0];
  const pct = (top.total_amount / total) * 100;
  if (pct < 40) return null;
  const severity: AlertSeverity = pct >= 60 ? "warning" : "info";
  return {
    id:          "high_expense_category",
    title:       `Gastos concentrados em "${top.category_name}"`,
    description: `A categoria "${top.category_name}" representa ${pct.toFixed(0)}% das suas despesas do mês.`,
    severity,
    actionLabel: "Ver transações",
    actionHref:  "/transactions",
  };
}

/** 8. Investimento muito concentrado */
function alertConcentratedPortfolio(health: HealthSnapshot | null): InternalAlert | null {
  if (!health) return null;
  if (!health.portfolio.isConcentrated) return null;
  const top = health.portfolio.byClass[0];
  const pct = top ? top.percentage.toFixed(0) : "?";
  return {
    id:          "concentrated_portfolio",
    title:       "Carteira de investimentos concentrada",
    description: `Mais de 50% da sua carteira está alocada em "${top?.assetClass ?? "uma única classe"}". Diversifique para reduzir o risco.`,
    severity:    "warning",
    actionLabel: "Ver investimentos",
    actionHref:  "/investments",
  };
}

/** 9. Dividendo previsto nos próximos 30 dias */
function alertUpcomingDividend(data: DashboardData): InternalAlert | null {
  const { dividendMap, investments } = data.patrimonio;
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let count = 0;
  let totalBRL = 0;

  for (const pos of investments) {
    if (!pos.ticker || !pos.quantity) continue;
    const ds = dividendMap[pos.ticker];
    if (!ds?.nextEvent?.payment_date) continue;
    const payDate = new Date(ds.nextEvent.payment_date);
    if (payDate >= now && payDate <= in30) {
      count++;
      totalBRL += ds.nextEvent.amount_per_share * pos.quantity;
    }
  }

  if (count === 0) return null;
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalBRL);
  return {
    id:          "upcoming_dividend",
    title:       `${count} ${count === 1 ? "dividendo previsto" : "dividendos previstos"} nos próximos 30 dias`,
    description: `Estimativa de recebimento: ${fmt} em proventos nas próximas semanas.`,
    severity:    "info",
    actionLabel: "Ver proventos",
    actionHref:  "/investments",
  };
}

/** 10. Transações sem categoria */
function alertUncategorized(uncategorizedCount: number): InternalAlert | null {
  if (uncategorizedCount === 0) return null;
  const severity: AlertSeverity = uncategorizedCount >= 20 ? "warning" : "info";
  return {
    id:          "uncategorized_transactions",
    title:       "Transações sem categoria",
    description: `${uncategorizedCount} ${uncategorizedCount === 1 ? "transação de despesa não tem" : "transações de despesa não têm"} categoria, o que reduz a precisão dos insights.`,
    severity,
    actionLabel: "Categorizar",
    actionHref:  "/transactions",
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function getAlerts(
  data:    DashboardData,
  health:  HealthSnapshot | null,
  maxResults = 5,
): Promise<ServiceResult<InternalAlert[]>> {
  try {
    await requireAuth();

    // Queries mínimas paralelas
    const [connections, uncategorizedCount] = await Promise.all([
      fetchOFConnections(),
      fetchUncategorizedCount(),
    ]);

    // Avalia todas as regras
    const candidates: (InternalAlert | null)[] = [
      alertOFError(connections),
      alertOFExpired(connections),
      alertOFStale(connections),
      alertLowHealthScore(health),
      alertLowEmergencyReserve(health),
      alertHighCreditUsage(data),
      alertHighExpenseCategory(data),
      alertConcentratedPortfolio(health),
      alertUpcomingDividend(data),
      alertUncategorized(uncategorizedCount),
    ];

    const alerts = candidates
      .filter((a): a is InternalAlert => a !== null)
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
      .slice(0, maxResults);

    return { data: alerts, error: null };
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Erro ao carregar alertas.",
    };
  }
}
