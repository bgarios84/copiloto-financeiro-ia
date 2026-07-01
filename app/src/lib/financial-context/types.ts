/**
 * Financial Context Engine — Types
 * Sprint 12.1
 *
 * Define o FinancialContext enviado ao LLM (chat, resumos, etc.).
 * Arquivo puro — sem "use server" / "use client", sem I/O.
 * Todos os valores monetários em BRL.
 */

import type { ScoreGrade, FILevel } from "@/lib/financial-health";
import type { InsightSeverity }     from "@/lib/financial-insights";
import type { AlertSeverity }       from "@/services/alerts";

// ── Resumo financeiro ─────────────────────────────────────────────────────────

export interface FinancialSummaryContext {
  /** Soma total de ativos (contas + investimentos + ativos manuais). */
  totalAssets:       number;
  /** Patrimônio líquido = totalAssets − totalLiabilities. */
  netWorth:          number;
  /** Saldo disponível em contas correntes/poupança/carteira. */
  liquidCash:        number;
  /** Valor total de posições de investimento. */
  totalInvestments:  number;
  /** Dívidas de cartão de crédito em aberto. */
  totalDebt:         number;
  /** Variação % mensal do patrimônio líquido; null se histórico insuficiente. */
  monthlyGrowthPct:  number | null;
}

// ── Financial Health ──────────────────────────────────────────────────────────

export interface HealthComponentContext {
  savingsRate:          number;   // taxa de poupança % (0–100)
  emergencyMonths:      number;   // meses cobertos pela reserva
  emergencyStatus:      string;   // "insufficient" | "building" | "adequate" | "excess"
  creditDebtRatio:      number;   // dívida / patrimônio líquido × 100
  diversificationScore: number;   // 0–100
  incomeReplacementRate: number;  // renda passiva / despesa mensal × 100
}

export interface HealthContext {
  score:      number;         // 0–100
  grade:      ScoreGrade;     // A | B | C | D | F
  components: HealthComponentContext;
  strengths:  string[];       // até 3
  weaknesses: string[];       // até 3
}

// ── Insights ──────────────────────────────────────────────────────────────────

export interface InsightContext {
  id:          string;
  title:       string;
  description: string;
  severity:    InsightSeverity;
  category:    string;
  metric?:     string;
}

// ── Alertas ───────────────────────────────────────────────────────────────────

export interface AlertContext {
  id:          string;
  title:       string;
  description: string;
  severity:    AlertSeverity;
}

// ── Open Finance ──────────────────────────────────────────────────────────────

export interface OFConnectionContext {
  institutionId: string | null;
  status:        string;
  lastSyncedAt:  string | null;
}

export interface OpenFinanceContext {
  /** Total de conexões ativas (status = "connected"). */
  activeConnections:    number;
  /** Total de conexões com erro ou expiradas. */
  problematicCount:     number;
  /** Data da sincronização mais recente entre todas as conexões. */
  lastSyncedAt:         string | null;
  connections:          OFConnectionContext[];
}

// ── Investimentos ─────────────────────────────────────────────────────────────

export interface AllocationSliceContext {
  assetClass:  string;
  valueBRL:    number;
  percentage:  number;
}

export interface InvestmentContext {
  totalValue:           number;
  /** Alocação por classe de ativo, ordenada por valor desc. */
  allocation:           AllocationSliceContext[];
  /** true se alguma classe representa > 50% da carteira. */
  isConcentrated:       boolean;
  /** Classe com maior peso (ou null se carteira vazia). */
  topAssetClass:        string | null;
  /** % da classe dominante. */
  topAssetClassPct:     number;
  /** Score de diversificação [0, 100]. */
  diversificationScore: number;
  /** Exposição cambial: { BRL: %, USD: %, ... } */
  currencyExposure:     Record<string, number>;
}

// ── Fluxo de caixa ────────────────────────────────────────────────────────────

export interface CashFlowContext {
  monthlyIncome:   number;
  monthlyExpense:  number;
  monthlySavings:  number;
  savingsRate:     number;  // % de poupança (0–100)
  /** Tendência: "growing" | "stable" | "declining" | "unknown". */
  trend:           "growing" | "stable" | "declining" | "unknown";
}

// ── FIRE ──────────────────────────────────────────────────────────────────────

export interface FireContext {
  fireTarget:      number;  // R$ necessários para FIRE
  progressPct:     number;  // % do caminho (0–100)
  remainingToFire: number;  // R$ faltando
  fiLevel:         FILevel;
  fiScore:         number;  // renda passiva / despesa × 100
  /** Ano calendário previsto para FIRE; null se inviável com dados atuais. */
  estimatedFireYear: number | null;
}

// ── Contexto textual ──────────────────────────────────────────────────────────

export interface TextualSummaryContext {
  /** Parágrafo resumido em PT-BR pronto para enviar ao LLM como system prompt. */
  paragraphPT: string;
}

// ── FinancialContext (raiz) ───────────────────────────────────────────────────

export interface FinancialContext {
  /** ISO 8601 — momento em que o contexto foi gerado. */
  generatedAt:   string;
  summary:       FinancialSummaryContext;
  health:        HealthContext;
  insights:      InsightContext[];
  alerts:        AlertContext[];
  openFinance:   OpenFinanceContext;
  investments:   InvestmentContext;
  cashFlow:      CashFlowContext;
  fire:          FireContext;
  textual:       TextualSummaryContext;
}
