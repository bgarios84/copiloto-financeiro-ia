# Diagnóstico Técnico — Páginas Base
**Data:** 2026-07-02  
**Scope:** Páginas que alimentam o Dashboard Central e o FIRE  
**Status:** Apenas diagnóstico — zero alterações realizadas

---

## Sumário Executivo

O projeto possui infraestrutura sólida de serviços e engines, mas as páginas internas operam como silos
independentes. Nenhuma página além do `/dashboard` alimenta ativamente o Dashboard Central em tempo real.
A principal descoberta é que **`/wealth` exibe apenas ativos manuais** (imóveis, veículos), tornando-a
uma visão radicalmente incompleta do patrimônio. Adicionalmente, **a tabela `goal` existe no banco com
RLS ativo**, mas não possui service, types nem página UI — feature completamente morta.

---

## 1. Mapa de Páginas Analisadas

| Rota | Server Component | Client Component | Service Principal |
|---|---|---|---|
| `/transactions` | `page.tsx` | `TransactionsClient.tsx` (329L) | `getTransactions()` |
| `/budgets` | `page.tsx` | `BudgetsClient.tsx` (336L) | `getBudgetComparison()` |
| `/fire` | `page.tsx` | `FireClient.tsx` (837L) | `getFireData()` |
| `/investments` | `page.tsx` | `InvestmentsClient.tsx` (296L) | `getInvestmentPositions()` |
| `/wealth` | `page.tsx` | `WealthClient.tsx` (413L) | `getManualAssets()` |
| `/accounts` | `page.tsx` | `AccountsClient.tsx` (343L) | `getAccounts()` |
| `/credit-cards` | `page.tsx` | `CreditCardsClient.tsx` | `getCards()` |
| `/health` | `page.tsx` | `HealthClient.tsx` | `getDashboardData()` + engines |
| `/settings/open-finance` | `page.tsx` | `OpenFinanceClient.tsx` | `getConnectionsWithDetails()` |
| `/dashboard` | `page.tsx` | `CentralClient.tsx` (1328L) | 6 services em paralelo |

---

## 2. Análise por Página

---

### 2.1 `/transactions` — Transações

**O que a página já gera:**
- Lista completa de transações com filtro por tipo (income/expense/transfer) e mês
- Sumário do mês selecionado: total de receitas, despesas e saldo
- Busca por texto no campo descrição
- CRUD completo: criar, editar, deletar
- Join com categoria, conta e cartão (dados enriquecidos)
- Filtro de mês via picker client-side (server action `getTransactions({ year, month })`)

**O que está mockado ou ausente:**
- Nenhum dado mockado — 100% real
- Sem gráfico de barras mensal (histórico 12 meses)
- Sem breakdown de despesas por categoria (torta ou barras)
- Sem indicador de transações sem categoria visível ao usuário (só existe via `alertUncategorized` no dashboard)
- Sem paginação ou cursor — todas as transações são carregadas de uma vez (`limit` opcional ignorado na chamada da página)
- Sem tendência (% variação vs mês anterior)

**Services/Engines que alimentam a página:**
- `getTransactions()` — query direta na tabela `transaction` com joins
- `getCategories()` — categorias para o formulário
- `getAccounts()` — contas para o formulário
- `getCards()` — cartões para o formulário

**O que deveria alimentar o Dashboard Central:**
- Contagem de transações sem categoria (para card "categorizar transações")
- Total de despesas do mês por categoria (para card "categoria dominante")
- Resultado líquido do mês (income - expense) em tempo real

**Rota usada pelos cards de prioridade:** `/transactions` ✓ (correto)

---

### 2.2 `/budgets` — Orçamentos

**O que a página já gera:**
- Comparação orçamento × realizado por categoria (via view `category_budget_comparison`)
- 4 cards de resumo: total planejado / gasto / dentro do orçamento / excedidos
- Navegador de meses (5 passados + atual + 1 futuro)
- Porcentagem de uso por categoria com barra de progresso
- CRUD de orçamentos (criar, editar, deletar)
- Se não há dados no mês atual, exibe o mês anterior automaticamente

**O que está mockado ou ausente:**
- Nenhum dado mockado
- Sem histórico visual (gráfico de barras mostrando planejado vs real nos últimos 6 meses)
- Sem alerta visual destacado quando uma categoria está excedendo (só tem a barra de progresso)
- Sem projeção: "no ritmo atual, você irá exceder o orçamento de X até o dia Y"
- Categorias sem orçamento definido aparecem mas sem meta — pode confundir

**Services/Engines que alimentam a página:**
- `getBudgetComparison(month)` — view `category_budget_comparison` com full outer join
- `getCategories()` — para o formulário

**O que deveria alimentar o Dashboard Central:**
- `usage_percentage >= 90` → card de prioridade "Orçamento quase no limite" já funciona via Radar (`ruleOverBudget90`)
- `usage_percentage >= 100` → card "Orçamento excedido" já funciona via Radar (`ruleOverBudget100`)
- O Radar já busca budget data independentemente (`getRadarInsights()` faz sua própria query à `category_budget_comparison`)

**Rota usada pelos cards de prioridade:** `/budgets` ✓ (corrigido)

**Inconsistência:** O Radar faz query independente ao mesmo `category_budget_comparison` que `/budgets` usa.
Não há reutilização — são duas queries separadas com o mesmo resultado.

---

### 2.3 `/fire` — Simulador FIRE

**O que a página já gera:**
- Dados reais: patrimônio total, renda mensal, despesa mensal, dividendos, dívida em cartões
- 3 cenários calculados (conservador / base / otimista) com `computeFireScenarios()`
- Projeção interativa com gráfico de patrimônio ao longo do tempo
- `FireIndicators`: fiScore, fiLevel, probabilidade, savingsRate, realReturn, remainingToTarget
- Salvamento de cenários no `localStorage` (botão "Salvar" → `SavedScenario[]`)
- Carregamento de cenário salvo (botão "Carregar")
- Inputs configuráveis: aporte mensal, aporte anual extra, retorno anual, inflação, taxa de retirada, idade atual, idade alvo, renda alvo na aposentadoria

**O que está mockado ou ausente:**
- **Cenários salvos em `localStorage`** — se o usuário limpa o browser ou troca de dispositivo, perde tudo. A tabela `goal` existe no banco com RLS mas não é usada
- Sem histórico de aportes reais (o campo `monthlyContribution` é um input manual, não soma aportes reais da tabela `investment_trade`)
- FIRE target é computado automaticamente como `(monthlyExpense × 12) / safeWithdrawalRate` — não é uma meta cadastrada pelo usuário
- Sem comparação de progresso histórico (crescimento do patrimônio vs meta FIRE nos últimos 12 meses)
- Sem notificação quando atingir um marco (ex: 25%, 50%, 75% da meta)

**Services/Engines que alimentam a página:**
- `getFireData()` — 7 queries paralelas: dashboard_summary, financial_account, investment_position, manual_asset, fx_rate, b3_dividend_event, credit_card
- `computeFireScenarios()` (client-side) — usa `src/lib/fire/calculator.ts`
- `computeFireIndicators()` (client-side) — usa `src/lib/fire/types.ts`

**O que deveria alimentar o Dashboard Central:**
- `fireTarget`, `progressPct`, `fiLevel`, `estimatedFireYear` → já alimentam via `HealthSnapshot.fireProgress` + `FinancialContext.fire`
- O Dashboard usa `hs.fireProgress.fireTarget` e `hs.fireProgress.progressPct` corretamente

**Rota usada pelos cards de prioridade:** `/fire` ✓ (correto)

---

### 2.4 `/investments` — Carteira de Investimentos

**O que a página já gera:**
- Lista de posições por classe de ativo (stock_br, fii, etf_br, bdr, stock_us, etf_us, crypto, fixed_income, fund, other)
- Cotações B3 em tempo real (via `b3_quote`)
- Dividend Yield e eventos de dividendos via `dividendMap`
- Valor total em BRL com conversão FX
- Breakdown por classe de ativo: valor BRL + % da carteira
- CRUD de posições: criar, editar, deletar
- Link para `/investments/[id]/trades` (histórico de negociações)

**O que está mockado ou ausente:**
- Nenhum dado mockado
- Sem gráfico de evolução do portfólio ao longo do tempo (histórico de valor total)
- Sem PnL por posição (lucro/prejuízo desde a entrada) — `average_price` existe na tabela mas não é usado para cálculo de PnL na UI
- Sem comparação com benchmark (ex: CDI, IBOVESPA)
- Sem alerta de posição específica >20% da carteira na própria página (existe no Radar como `ruleConcentration` mas não é exibido em `/investments`)
- Sem filtro por classe de ativo na listagem

**Services/Engines que alimentam a página:**
- `getInvestmentPositions()` — query `investment_position`
- `getLatestRatesForBRL()` — `fx_rate`
- `getLatestB3Quotes(tickers)` — `b3_quote`
- `getDividendEventsForTickers(tickers)` — `b3_dividend_event`
- `buildDividendMap()` — lib pura

**O que deveria alimentar o Dashboard Central:**
- `totalBRL` (valor total investido) → já alimenta via `DashboardData.patrimonio.investments`
- Concentração por classe → já alimenta via `HealthSnapshot.portfolio`
- Dividendos → já alimentam via `HealthSnapshot.passiveIncome`

**Rota usada pelos cards de prioridade:** `/investments` ✓ (correto para concentração, dividendos, aportes)

---

### 2.5 `/wealth` — Patrimônio ⚠️ CRÍTICO

**O que a página já gera:**
- Lista de ativos manuais (imóvel, veículo, dinheiro físico, cripto custodiada, outros)
- Valor total em BRL com conversão FX
- Breakdown por tipo de ativo com barra de alocação
- CRUD de ativos manuais
- Aviso quando moeda sem cotação FX disponível

**O que está mockado ou ausente:**
- **CRÍTICO: A página exibe APENAS `manual_asset` — NÃO inclui contas financeiras nem posições de investimento.**
- Um usuário com R$500K em ações, R$100K em conta corrente e R$200K em imóvel vê apenas R$200K no `/wealth`
- O Dashboard Central exibe o patrimônio total correto (agrega os três: accounts + investments + manualAssets), mas `/wealth` é uma visão incompleta
- Sem histórico de patrimônio (evolução mensal)
- Sem projeção de patrimônio futuro
- Sem separação de passivos (dívidas em cartão não aparecem aqui)

**Services/Engines que alimentam a página:**
- `getManualAssets()` — apenas `manual_asset`
- `getLatestRatesForBRL()` — `fx_rate`

**Dependências ausentes que deveriam estar:**
- `getAccounts()` — para incluir saldos de contas correntes/poupança/carteira
- `getInvestmentPositions()` — para incluir posições em corretoras
- `getCards()` — para calcular dívidas (passivos)

**O que deveria alimentar o Dashboard Central:**
- Patriônio líquido total (netWorth) → já alimenta via `HealthSnapshot.wealth.netWorth`
- Excesso de caixa (liquidCash > 4x monthlyExpense) → já alimenta via `FinancialContext.summary.liquidCash`

**Rota usada pelos cards de prioridade:** `/wealth` ✓ (correto — card "Direcionar excesso de caixa")

**Problema:** O usuário que clica em "Ver patrimônio" chega em uma página que mostra apenas ativos manuais.
Isso quebra a expectativa criada pelo Dashboard Central que exibe o patrimônio total consolidado.

---

### 2.6 `/accounts` — Contas

**O que a página já gera:**
- Lista de contas com saldo atualizado (corrente, poupança, investimento, carteira digital, dinheiro)
- 3 cards de totais: saldo total / positivo / negativo
- Open Finance: conexões vinculadas à conta, botão de sync por conta/conexão
- Botão "Sincronizar todas as conexões"
- Feedback de sync (sucesso / erro)
- CRUD de contas

**O que está mockado ou ausente:**
- Sem histórico de saldos por conta (evolução temporal)
- Sem breakdown de saldo por tipo de conta (ex: total em corrente vs total em poupança)
- Sem alertas de saldo negativo diretamente na página (existe via Radar `ruleNegativeBalance` no dashboard)

**Services/Engines que alimentam a página:**
- `getAccounts()` — `financial_account` com institution join
- `getInstitutions()` — lista de instituições para o formulário
- `getConnections()` — `open_finance_connection` para exibir status de sync

**O que deveria alimentar o Dashboard Central:**
- `total_balance` (saldo total das contas) → já alimenta via `DashboardData.summary.total_balance`
- Status das conexões OF → já alimenta via `FinancialContext.openFinance`

**Rota usada pelos cards de prioridade:** `/accounts` ✓ (correto para saldo negativo, reserva de emergência)

---

### 2.7 `/credit-cards` — Cartões de Crédito

**O que a página já gera:**
- Lista de cartões com limite total, disponível e usado
- % de utilização por cartão
- CRUD de cartões

**O que está mockado ou ausente:**
- Sem histórico de faturas
- Sem gráfico de utilização mensal
- Sem alerta in-page de utilização alta (existe via alerts/radar no dashboard)

**Services/Engines que alimentam a página:**
- `getCards()` — `credit_card`
- `getInstitutions()` — para o formulário

**O que deveria alimentar o Dashboard Central:**
- `credit_usage_percentage` → já alimenta via `DashboardData.summary.credit_usage_percentage`

**Rota usada pelos cards de prioridade:** `/credit-cards` ✓ (correto para utilização alta)

---

### 2.8 `/health` — Health Score

**O que a página já gera:**
- Score 0-100 com gauge visual + grade (A/B/C/D/F)
- 5 dimensões detalhadas: Fluxo de Caixa, Patrimônio, Poupança, Investimentos, Renda Passiva
- Estrelas de 1 a 5 por dimensão
- Plano de ação: weaknesses + insights financeiros com ações
- CTA para FIRE quando score >= 70

**O que está mockado ou ausente:**
- Sem histórico do score ao longo do tempo (como evoluiu nos últimos 6 meses)
- Sem comparação com benchmark (média de perfis similares)
- Radar Insights não são exibidos aqui (só no dashboard)

**Services/Engines que alimentam a página:**
- `getDashboardData()` — **8 queries idênticas às do `/dashboard`**
- `computeHealthFromDashboard()` — engine puro
- `computeInsightsFromDashboard()` — engine puro
- `getAlerts()` — para badge de alertas no header

**Problema de performance:** `/health` re-executa as mesmas 8 queries do dashboard sem compartilhamento de cache.
Dois carregamentos de página diferentes executam 16 queries ao banco em vez de 8.

---

### 2.9 `/settings/open-finance` — Open Finance

**O que a página já gera:**
- Lista de conexões com status (connected / error / expired / syncing)
- Data e hora do último sync por conexão
- Contagem de contas e cartões mapeados por conexão
- Log do último sync: duração, transações criadas/atualizadas/ignoradas, erro
- Botões de sync manual

**Observação:** Esta página funciona como admin de sincronização, não como página de dados financeiros.
Está bem posicionada e não requer dados adicionais para seu propósito.

---

## 3. Inconsistências Encontradas

### I-01 ⚠️ CRÍTICO — Tabela `goal` existe no banco sem nenhuma UI

**Evidência:** `supabase/migrations/001_mvp_schema.sql` cria `public.goal` e `public.goal_contribution`
com RLS completo (select/insert/update/delete policies). A tabela suporta:
- Tipos: emergency_fund, travel, education, retirement, home, vehicle, other
- Meta com valor-alvo, prazo, progresso, contribuição mensal
- Link com conta financeira (`linked_account_id`)
- Status: active, achieved, cancelled, paused

**Impacto:** A feature de "Metas Financeiras" está 0% implementada no frontend.
O usuário não tem onde criar metas de curto prazo (ex: "Férias em R$10K", "Reserva de emergência R$30K")
separadas do FIRE. Não há `/goals` page, nenhum service, nenhum tipo TypeScript.

---

### I-02 ⚠️ CRÍTICO — `/wealth` não representa o patrimônio total

**Evidência:** `wealth/page.tsx` busca apenas `getManualAssets()`.
O patrimônio total real = `financial_account.balance (BRL)` + `investment_position.current_value (BRL)` + `manual_asset.current_value (BRL)` - dívidas de cartão.

O Dashboard Central computa corretamente (via `getDashboardData()` + `computeHealthFromDashboard()`),
mas `/wealth` exibe apenas 1 das 3 fontes.

**Impacto:** Um usuário com patrimônio de R$1M (sendo R$800K em investimentos) abre `/wealth` e vê R$200K.
A página deveria ser a visão consolidada do patrimônio — hoje é apenas um CRUD de ativos físicos.

---

### I-03 — Cenários FIRE em localStorage, não no banco

**Evidência:** `FireClient.tsx` usa `window.localStorage.getItem("fire_scenarios")` para persistir `SavedScenario[]`.

**Impacto:**
- Cenários perdidos ao limpar o browser ou trocar de dispositivo
- A tabela `goal` poderia armazenar metas FIRE de forma persistente
- Impossível exibir no Dashboard Central sem re-calcular no client

---

### I-04 — Radar faz queries redundantes com o Dashboard

**Evidência:** `getRadarInsights()` executa **11 queries independentes**, muitas sobrepostas com `getDashboardData()` (8 queries):

| Query | Dashboard | Radar |
|---|---|---|
| `dashboard_summary` | ✓ | ✓ |
| `monthly_cash_flow` | ✓ | ✓ |
| `investment_position` | ✓ | ✓ |
| `manual_asset` | ✓ | ✓ |
| `fx_rate` | ✓ | ✓ |
| `b3_quote` | ✓ | ✓ |
| `b3_dividend_event` | ✓ | ✓ |
| `budget` (comparison) | ✗ | ✓ |
| `financial_account` | ✗ | ✓ |
| `credit_card` | ✗ | ✓ |
| `investment_trade` | ✗ | ✓ |

**Impacto:** Cada visita ao `/dashboard` dispara 8 + 11 = **19 queries ao banco**, com 7 queries duplicadas.
A 1 consulta `b3_quote` é especialmente pesada (full table scan).

---

### I-05 — `/health` duplica 8 queries do dashboard

**Evidência:** `health/page.tsx` chama `getDashboardData()` + `getAlerts()`, executando o mesmo conjunto de
queries que `/dashboard`. Não há cache compartilhado.

**Impacto:** Um usuário que visita `/health` logo após o `/dashboard` executa 16 queries desnecessárias.

---

### I-06 — `getTransactions()` não tem paginação na página

**Evidência:** `transactions/page.tsx` chama `getTransactions()` sem filtros de mês ou limite,
retornando todas as transações do usuário. O `TransactionFilters.limit` existe no service mas não
é usado na chamada da página.

**Impacto:** Usuários com histórico longo (>500 transações) sofrem latência crescente.

---

### I-07 — `onboarding` não detecta ausência de orçamentos com precisão

**Evidência:** `getOnboardingStatus()` verifica `hasAnyBudget` (qualquer orçamento no banco).
Mas o Radar detecta categorias de despesa sem orçamento via `budgetComparisons` com `planned_amount = null`.

**Impacto:** O onboarding pode marcar "orçamentos configurados" quando há apenas 1 orçamento definido
em 10 categorias de despesa, gerando falso positivo no checklist.

---

## 4. Mapa de Dados: Página → Dashboard Central

| Dado necessário no Dashboard | Origem real | Fluxo atual | Status |
|---|---|---|---|
| Patrimônio líquido (netWorth) | `getDashboardData()` + engine | ✓ Direto via `HealthSnapshot` | OK |
| Receita/Despesa mensal | `dashboard_summary` view | ✓ Via `DashboardData.summary` | OK |
| Progresso FIRE % | `computeHealthFromDashboard()` | ✓ Via `HealthSnapshot.fireProgress` | OK |
| Orçamentos excedidos | `category_budget_comparison` | ✓ Via `getRadarInsights()` | OK (mas redundante) |
| Transações sem categoria | `transaction` count | ✓ Via `getAlerts()` | OK |
| Concentração de carteira | `investment_position` | ✓ Via `HealthSnapshot.portfolio` | OK |
| Excesso de caixa | `financial_account.balance` | ✓ Via `FinancialContext.summary` | OK |
| Metas financeiras | `goal` table | ✗ Não existe service/UI | AUSENTE |
| Patrimônio total consolidado | accounts + investments + manual | ✓ Via `getDashboardData()` | OK no dashboard, BROKEN em `/wealth` |
| Cenários FIRE salvos | localStorage | ✗ Não alimenta dashboard | ISOLADO |
| Histórico de Health Score | Não existe | ✗ Sem histórico temporal | AUSENTE |
| PnL de investimentos | `investment_trade` + cotações | ✗ Não computado em nenhum engine | AUSENTE |

---

## 5. Plano de Correção por Sprint

### Sprint 14.1 — Expandir `/wealth` para patrimônio consolidado real
**Prioridade: ALTA** (inconsistência crítica — usuário vê patrimônio errado)

- Adicionar `getAccounts()` e `getInvestmentPositions()` ao `wealth/page.tsx`
- Reformular `WealthClient` em 3 seções: Contas / Investimentos em corretoras / Ativos físicos
- Exibir patrimônio líquido total com dedução de dívidas de cartão
- Adicionar donut chart de alocação total (mesma lógica do Dashboard Central)
- Sem migration necessária

**Arquivos afetados:**
- `src/app/wealth/page.tsx`
- `src/app/wealth/WealthClient.tsx`

---

### Sprint 14.2 — Criar módulo de Objetivos / Metas
**Prioridade: ALTA** (tabela existe no banco, feature 0% implementada)

- `src/types/goal.ts` — types para `Goal`, `GoalContribution`, `GoalFormData`
- `src/services/goal.ts` — CRUD: `getGoals()`, `createGoal()`, `updateGoal()`, `deleteGoal()`, `addContribution()`
- `src/app/goals/page.tsx` + `GoalsClient.tsx` — nova página `/goals`
- Adicionar `/goals` na Sidebar (grupo Planejamento, entre Orçamentos e FIRE)
- Dashboard Central: card de prioridade "Meta em atraso" ou "Meta próxima do prazo" via radar rule nova
- Sem migration (tabela `goal` já existe com RLS)

---

### Sprint 14.3 — Transações: sumário histórico + categoria breakdown
**Prioridade: MÉDIA**

- Adicionar gráfico de barras mensal (receitas/despesas nos últimos 6 meses) ao `TransactionsClient`
- Adicionar donut de despesas por categoria do mês selecionado
- Implementar paginação no `getTransactions()` (cursor ou page-based, 50 por página)
- Exibir contador "X transações sem categoria" com link para filtrar

**Arquivos afetados:**
- `src/services/transaction.ts` — adicionar paginação + filtro de mês histórico
- `src/app/transactions/TransactionsClient.tsx` — adicionar charts

---

### Sprint 14.4 — Investimentos: PnL + performance
**Prioridade: MÉDIA**

- Calcular PnL por posição: `(cotação_atual - average_price) × quantity`
- Exibir ganho/perda % por posição na `InvestmentItem`
- Adicionar card de "Retorno da carteira" vs período de entrada
- Adicionar alerta de concentração inline (sem precisar ir ao dashboard)

**Arquivos afetados:**
- `src/app/investments/InvestmentsClient.tsx`
- `src/app/investments/InvestmentItem.tsx`

---

### Sprint 14.5 — Orçamentos: histórico visual
**Prioridade: BAIXA**

- Adicionar gráfico de barras histórico (planejado vs real nos últimos 6 meses)
- Highlight vermelho quando categoria está acima de 100%
- Indicador "no ritmo atual, você excede em X dias"

---

### Sprint 14.6 — Performance: eliminar queries redundantes
**Prioridade: BAIXA** (performance, não funcionalidade)

- Criar `getDashboardAndRadarData()` unificado que faz as 11 queries necessárias uma única vez
- Passar `RadarInput` para o radar engine sem nova query
- Alimentar tanto `DashboardData` quanto `RadarInput` do mesmo fetch
- `/health/page.tsx`: aceitar `DashboardData` como prop passada via link state, ou criar cache em edge

**Impacto:** Reduz de 19 para 12 queries por visita ao `/dashboard`.

---

## 6. Rotas Corretas pelos Cards de Prioridade

| Card de Prioridade | Rota Atual (pós-correção) | Rota Correta | Status |
|---|---|---|---|
| Configurar dados financeiros (sem despesas) | `/transactions` | `/transactions` | ✓ |
| Reforçar reserva de emergência | `/accounts` | `/accounts` | ✓ |
| Direcionar excesso de caixa | `/wealth` | `/wealth` | ✓ |
| Revisar concentração da carteira | `/investments` | `/investments` | ✓ |
| Progresso FIRE | `/fire` | `/fire` | ✓ |
| Início da jornada FIRE | `/fire` | `/fire` | ✓ |
| Fluxo de caixa em queda | `/transactions` | `/transactions` | ✓ |
| Orçamento excedido (radar) | `/budgets` | `/budgets` | ✓ |
| Orçamento quase no limite (radar) | `/budgets` | `/budgets` | ✓ |
| Saldo negativo (radar) | `/accounts` | `/accounts` | ✓ |
| Cartão com alta utilização (radar) | `/credit-cards` | `/credit-cards` | ✓ |
| Dividendo previsto (radar) | `/investments` | `/investments` | ✓ |
| Nenhum aporte no mês (radar) | `/investments` | `/investments` | ✓ |
| Reserva de emergência insuficiente (radar) | `/accounts` | `/accounts` | ✓ |
| Verificar sincronização bancária | `/settings/open-finance` | `/settings/open-finance` | ✓ |
| Meta em atraso | *(ausente)* | `/goals` (a criar) | AUSENTE |

---

## 7. Resumo Executivo das Descobertas

| # | Tipo | Descoberta | Prioridade |
|---|---|---|---|
| I-01 | Feature morta | Tabela `goal` no banco sem nenhuma UI/service | ALTA |
| I-02 | Dado incorreto | `/wealth` exibe apenas ativos manuais, não o patrimônio total | ALTA |
| I-03 | Persistência frágil | Cenários FIRE em localStorage — perdem-se ao trocar de dispositivo | MÉDIA |
| I-04 | Performance | Dashboard dispara 19 queries (7 duplicadas entre radar e data) | BAIXA |
| I-05 | Performance | `/health` duplica as 8 queries do dashboard | BAIXA |
| I-06 | Performance | `/transactions` carrega todas as transações sem paginação | MÉDIA |
| I-07 | Lógica | Onboarding marca "orçamentos ok" com 1 orçamento em 10 categorias | BAIXA |

**Impacto no produto:**
- Prioridade ALTA afeta diretamente a confiança do usuário no produto
- Prioridade MÉDIA afeta retenção (features que deveriam existir)
- Prioridade BAIXA afeta escala (OK por enquanto, crítico com >1000 usuários)
