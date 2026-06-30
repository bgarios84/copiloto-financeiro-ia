/**
 * Types — FIRE Planning
 * Sprint 8.4 / 8.5
 *
 * Arquivo puro — sem "use server" / "use client".
 * FIRE = Financial Independence, Retire Early.
 */

// ── Inputs do cálculo ─────────────────────────────────────────────────────────

export interface FireInput {
  // Dados reais (vindos do service)
  currentPatrimonio:   number;   // R$ — patrimônio total atual
  monthlyIncome:       number;   // R$ — renda mensal
  monthlyExpense:      number;   // R$ — despesa mensal atual
  monthlyDividends:    number;   // R$ — dividendos mensais estimados (12m ÷ 12)

  // Configuráveis pelo usuário
  monthlyContribution: number;   // R$ — aporte mensal adicional
  annualExtra:         number;   // R$ — aporte anual extra (13º, bônus, IR) — Sprint 8.5
  annualReturn:        number;   // decimal — rentabilidade nominal anual (ex: 0.08 = 8%)
  annualInflation:     number;   // decimal — inflação anual esperada (ex: 0.04 = 4%)
  safeWithdrawalRate:  number;   // decimal — taxa de retirada segura (ex: 0.04 = 4%)
  currentAge:          number;   // anos
  targetAge:           number;   // anos — idade alvo para aposentadoria — Sprint 8.5
  targetMonthlyIncome: number;   // R$ — renda mensal desejada na aposentadoria
}

// ── Ponto de projeção anual ───────────────────────────────────────────────────

export interface FireProjectionPoint {
  year:          number;  // número do ano (0 = hoje)
  age:           number;  // idade no ano
  patrimonio:    number;  // R$ — patrimônio projetado
  passiveIncome: number;  // R$ — renda passiva mensal sustentável
  contributions: number;  // R$ — aportes acumulados (PV + PMT × meses)
  interestGain:  number;  // R$ — ganho de juros acumulados (FV − aportes)
  dividends:     number;  // R$ — dividendos mensais projetados
}

// ── Resultado do cálculo ──────────────────────────────────────────────────────

export interface FireResult {
  fireTarget:             number;   // R$ — patrimônio necessário para FIRE
  monthsToFire:           number;   // meses até atingir a meta (Infinity se inviável)
  yearsToFire:            number;   // anos (decimal)
  fireAge:                number;   // idade ao atingir FIRE
  currentPassiveIncome:   number;   // R$ — renda passiva mensal com patrimônio atual
  firePercentage:         number;   // % do caminho (0-100)
  projectedPatrimonio10y: number;   // R$ — patrimônio em 10 anos
  projectedPatrimonio20y: number;   // R$ — patrimônio em 20 anos
  willReachByTargetAge:   boolean;  // atingirá FIRE antes da targetAge — Sprint 8.5
  patrimonioAtTargetAge:  number;   // R$ — patrimônio projetado na targetAge — Sprint 8.5
  projectionData:         FireProjectionPoint[];
}

// ── Cenário ───────────────────────────────────────────────────────────────────

export type ScenarioKey = "conservative" | "base" | "optimistic";

export interface FireScenario {
  key:    ScenarioKey;
  label:  string;
  color:  string;
  input:  FireInput;
  result: FireResult;
}

// ── Indicadores — Sprint 8.5 ──────────────────────────────────────────────────

export type FILevel = "iniciante" | "acumulando" | "semi_fi" | "fi" | "fire";

export const FI_LEVEL_LABELS: Record<FILevel, string> = {
  iniciante:  "Iniciante",
  acumulando: "Acumulando",
  semi_fi:    "Semi-FI",
  fi:         "Independente",
  fire:       "FIRE!",
};

export const FI_LEVEL_COLORS: Record<FILevel, string> = {
  iniciante:  "#6B7280",
  acumulando: "#F59E0B",
  semi_fi:    "#3B82F6",
  fi:         "#10B981",
  fire:       "#F97316",
};

export interface FireIndicators {
  fiScore:           number;   // 0-100 — renda_passiva / despesa x 100
  fiLevel:           FILevel;  // nivel de independencia financeira
  probability:       number;   // 0-100 — probabilidade estimada de atingir FIRE
  timeSavedByExtra:  number;   // meses economizados pelo aporte anual extra
  remainingToTarget: number;   // R$ — quanto falta para o FIRE Target
  safeMonthlySpend:  number;   // R$ — renda passiva mensal atual
  safeDailySpend:    number;   // R$ — quanto pode gastar por dia com patrimonio atual
  savingsRate:       number;   // % — aporte / renda x 100
  realReturn:        number;   // % — retorno real anual
  netPatrimonio:     number;   // R$ — patrimonio - dividas
}

// ── Cenário salvo (localStorage) — Sprint 8.5 ────────────────────────────────

export interface SavedScenario {
  id:        string;
  name:      string;
  createdAt: string;  // ISO string
  input:     FireInput;
  result:    FireResult;
}

// ── Dados retornados pelo service ─────────────────────────────────────────────

export interface FireData {
  currentPatrimonio:   number;
  monthlyIncome:       number;
  monthlyExpense:      number;
  monthlyDividends:    number;
  defaultContribution: number;  // max(0, income - expense)
  investTotal:         number;  // R$ — soma das posicoes de investimento
  totalDebt:           number;  // R$ — saldo de cartoes de credito (dividas)
}
