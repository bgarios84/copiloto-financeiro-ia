"use server";

/**
 * Service — Onboarding / First Run Experience
 * Sprint 11.4
 *
 * Verifica o progresso de cada etapa do checklist inicial.
 * Reutiliza DashboardData para checks que já têm dados disponíveis;
 * faz queries adicionais mínimas apenas para o que falta.
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth }  from "@/lib/supabase/require-auth";
import type { DashboardData } from "@/types/dashboard";
import type { ServiceResult }  from "@/types/common";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  /** ID único da etapa. */
  id:          string;
  /** Título da etapa. */
  label:       string;
  /** Descrição do que esta etapa representa. */
  description: string;
  /** Texto do botão de ação. */
  action:      string;
  /** Rota para a tela correspondente. */
  href:        string;
  /** Se a etapa já foi concluída. */
  completed:   boolean;
}

export interface OnboardingStatus {
  steps:          OnboardingStep[];
  completedCount: number;
  totalCount:     number;
  /** true quando todas as etapas estão concluídas. */
  isComplete:     boolean;
}

// ── Queries adicionais ────────────────────────────────────────────────────────

interface ExtraChecks {
  hasOFConnection: boolean;
  hasAnyTransaction: boolean;
  hasAnyBudget: boolean;
}

async function fetchExtraChecks(): Promise<ExtraChecks> {
  const db = await createClient();

  const [ofRes, txRes, budgetRes] = await Promise.all([
    // Open Finance: alguma conexão ativa
    db
      .from("open_finance_connection")
      .select("id", { count: "exact", head: true })
      .eq("status", "connected"),

    // Transações: qualquer registro (não só do mês corrente)
    db
      .from("transaction")
      .select("id", { count: "exact", head: true })
      .limit(1),

    // Orçamento: algum budget cadastrado
    db
      .from("budget")
      .select("id", { count: "exact", head: true })
      .limit(1),
  ]);

  return {
    hasOFConnection:   (ofRes.count ?? 0) > 0,
    hasAnyTransaction: (txRes.count ?? 0) > 0,
    hasAnyBudget:      (budgetRes.count ?? 0) > 0,
  };
}

// ── Montagem do status ────────────────────────────────────────────────────────

function buildSteps(data: DashboardData, extra: ExtraChecks): OnboardingStep[] {
  const { summary, patrimonio } = data;

  // Etapa 1 — Open Finance
  const hasOF = extra.hasOFConnection;

  // Etapa 2 — Contas e cartões
  const hasAccounts =
    (summary?.total_accounts ?? 0) > 0 ||
    (summary?.total_credit_limit ?? 0) > 0;

  // Etapa 3 — Transações importadas
  const hasTransactions = extra.hasAnyTransaction;

  // Etapa 4 — Investimentos
  const hasInvestments = patrimonio.investments.length > 0;

  // Etapa 5 — Orçamento
  const hasBudget = extra.hasAnyBudget;

  // Etapa 6 — Meta FIRE: dados suficientes para cálculo (receita e despesa > 0)
  const hasFIREData =
    (summary?.monthly_income ?? 0) > 0 &&
    (summary?.monthly_expense ?? 0) > 0;

  return [
    {
      id:          "open_finance",
      label:       "Conectar banco via Open Finance",
      description: "Importe automaticamente contas, cartões e transações do seu banco.",
      action:      hasOF ? "Gerenciar conexões" : "Conectar banco",
      href:        "/settings/open-finance",
      completed:   hasOF,
    },
    {
      id:          "accounts",
      label:       "Sincronizar contas e cartões",
      description: "Verifique se suas contas bancárias e cartões foram importados corretamente.",
      action:      hasAccounts ? "Ver contas" : "Adicionar conta",
      href:        "/accounts",
      completed:   hasAccounts,
    },
    {
      id:          "transactions",
      label:       "Revisar transações importadas",
      description: "Categorize e valide suas transações para análises precisas.",
      action:      hasTransactions ? "Ver transações" : "Importar transações",
      href:        "/transactions",
      completed:   hasTransactions,
    },
    {
      id:          "investments",
      label:       "Cadastrar ou validar investimentos",
      description: "Adicione suas posições em ações, FIIs, renda fixa e outros ativos.",
      action:      hasInvestments ? "Ver investimentos" : "Cadastrar investimentos",
      href:        "/investments",
      completed:   hasInvestments,
    },
    {
      id:          "budget",
      label:       "Definir orçamento mensal",
      description: "Configure limites de gastos por categoria para controlar suas finanças.",
      action:      hasBudget ? "Ver orçamentos" : "Criar orçamento",
      href:        "/budgets",
      completed:   hasBudget,
    },
    {
      id:          "fire",
      label:       "Definir meta FIRE",
      description: "Configure sua meta de independência financeira e acompanhe o progresso.",
      action:      hasFIREData ? "Ver simulação FIRE" : "Configurar meta",
      href:        "/fire",
      completed:   hasFIREData,
    },
  ];
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function getOnboardingStatus(
  data: DashboardData,
): Promise<ServiceResult<OnboardingStatus>> {
  try {
    await requireAuth();

    const extra = await fetchExtraChecks();
    const steps = buildSteps(data, extra);

    const completedCount = steps.filter((s) => s.completed).length;
    const totalCount     = steps.length;

    return {
      data: {
        steps,
        completedCount,
        totalCount,
        isComplete: completedCount === totalCount,
      },
      error: null,
    };
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Erro ao verificar onboarding.",
    };
  }
}
