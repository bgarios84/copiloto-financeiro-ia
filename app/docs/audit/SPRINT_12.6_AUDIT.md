# Sprint 12.6 — Auditoria Completa da Aplicação
> Gerado em: 2026-07-01 | Nenhum código foi alterado.

---

## Rotas existentes

| Rota | Arquivo | Título | AppLayout | Protegida (middleware) | Acessível via nav |
|------|---------|--------|-----------|----------------------|-------------------|
| `/` | `app/page.tsx` | — | não | não | não (redirect → /dashboard) |
| `/login` | `app/login/page.tsx` | Login | não | não | não |
| `/auth/callback` | `app/auth/callback/route.ts` | — | não | não | não (callback OAuth) |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard | ✓ hideChrome | ✓ | ✓ Sidebar "Hoje" |
| `/accounts` | `app/accounts/page.tsx` | Contas | ✓ | ✓ | ✓ Sidebar "Patrimônio" |
| `/budgets` | `app/budgets/page.tsx` | Orçamentos | ✓ | ✓ | ✓ Sidebar "Aprender" ⚠️ label errado |
| `/credit-cards` | `app/credit-cards/page.tsx` | Cartões de Crédito | ✓ | ✓ | ❌ nenhum link |
| `/fire` | `app/fire/page.tsx` | FIRE Planner | ✓ | ✓ | ✓ Sidebar "Planejar" |
| `/health` | `app/health/page.tsx` | Health Score | ✓ hideChrome | ❌ ausente | ❌ só via Dashboard |
| `/investments` | `app/investments/page.tsx` | Investimentos | ✓ | ✓ | ✓ Sidebar "Investir" |
| `/investments/[id]/trades` | `app/investments/[id]/trades/page.tsx` | Trades | ✓ | ✓ | ✓ via InvestmentItem |
| `/timeline` | `app/timeline/page.tsx` | Timeline Financeira | ✓ | ✓ | ✓ Sidebar "Acompanhar" |
| `/transactions` | `app/transactions/page.tsx` | Transações | ✓ | ✓ | ⚠️ só Quick Action |
| `/wealth` | `app/wealth/page.tsx` | Patrimônio | ✓ | ✓ | ❌ DashboardPatrimonio (órfão) |
| `/settings/open-finance` | `app/settings/open-finance/page.tsx` | Open Finance | ❌ sem sidebar | ✓ (`/settings`) | ⚠️ Sidebar "Alertas" (label errado) |
| `/admin/market-data` | `app/admin/market-data/page.tsx` | Admin Market Data | ✓ | ✓ (`/admin`) | ⚠️ só link no DashboardClient |
| `/api/cron/update-b3-quotes` | `app/api/cron/...` | — | não | não | não (cron) |
| `/api/cron/open-finance-sync` | `app/api/cron/...` | — | não | não | não (cron) |
| `/api/webhooks/pluggy` | `app/api/webhooks/...` | — | não | não | não (webhook) |

**Total de páginas de usuário: 14**
**Totalmente inacessíveis ou com acesso quebrado: 4** (`/credit-cards`, `/health`, `/wealth`, `/settings/open-finance`)

---

## Páginas órfãs

Páginas que existem mas **não possuem entrada na Sidebar** e têm acesso precário ou zero.

| Rota | Situação | Como acessar hoje |
|------|----------|-------------------|
| `/credit-cards` | **Completamente órfã** — 0 links em toda a navegação | URL direta apenas |
| `/health` | **Sem link na sidebar** — acessível apenas via 2 links no DashboardClient | URL direta ou Dashboard |
| `/wealth` | **Órfã efetiva** — só linkada por `DashboardPatrimonio`, que foi abandonado no redesign | URL direta apenas |
| `/settings/open-finance` | **Sem sidebar própria** — renderiza sem Sidebar/Header/Footer; link confuso via "Alertas" | Sidebar (label errado) |
| `/transactions` | **Sem link na nav principal** — só via Quick Action "Registrar despesa" | Quick Action ou URL direta |
| `/admin/market-data` | **Oculta** — sem link na sidebar, só 1 link no DashboardClient | URL direta ou Dashboard |

---

## Funcionalidades escondidas

| Funcionalidade | Módulo | Status de acesso |
|---------------|--------|-----------------|
| Gestão de cartões de crédito | `/credit-cards` | Inacessível — sem nenhum link |
| Patrimônio manual (ativos manuais, FX) | `/wealth` | Inacessível — DashboardPatrimonio abandonado |
| Health Score completo (análise detalhada) | `/health` | Semi-acessível — só via Dashboard |
| Orçamento × Realizado | `/budgets` | Acessível mas com label errado ("Aprender") |
| Lista de transações | `/transactions` | Semi-acessível — só via Quick Action |
| Open Finance / Conexões bancárias | `/settings/open-finance` | Acessível mas sem AppLayout (sem sidebar) |
| Admin Market Data (atualizar cotações B3) | `/admin/market-data` | Oculta — sem link na nav |
| Gráficos de patrimônio (AreaChart, BarChart, etc.) | `DashboardPatrimonio` | Inacessível — componente abandonado |

---

## Sidebar

### Itens atuais (Sidebar redesenhada — Sprint 12.2)

| Label | Ícone | Href | Problema |
|-------|-------|------|---------|
| Hoje | Home | `/dashboard` | ✓ OK |
| Patrimônio | Wallet | `/accounts` | ⚠️ Label ambíguo — `/accounts` são contas bancárias, não patrimônio total |
| Investir | TrendingUp | `/investments` | ✓ OK |
| Planejar | Flame | `/fire` | ✓ OK |
| Acompanhar | Activity | `/timeline` | ✓ OK |
| **Alertas** | Bell | `/settings/open-finance` | ❌ Label completamente errado — vai para Open Finance |
| **Aprender** | BookOpen | `/budgets` | ❌ Label completamente errado — vai para Orçamentos |

### Quick Actions atuais

| Label | Href | Problema |
|-------|------|---------|
| Adicionar conta | `/accounts` | ✓ OK |
| Registrar despesa | `/transactions` | ✓ OK — única via de acesso a /transactions na sidebar |
| Definir meta | `/budgets` | ✓ OK |
| Simular objetivo | `/fire` | ✓ OK |

### Itens **removidos** no redesign (estavam na sidebar anterior)

Com base no histórico do projeto (tasks #52, #96, #101), a sidebar antiga continha:
- `/credit-cards` — Cartões de Crédito (removido)
- `/transactions` — Transações (rebaixado para Quick Action apenas)
- `/wealth` — Patrimônio Manual (removido)
- `/health` — Health Score (nunca esteve na sidebar)
- `/settings/open-finance` — Open Finance (agora mislabeled como "Alertas")
- `/budgets` — Orçamentos (agora mislabeled como "Aprender")

### Sidebar recomendada

| Label | Href | Ícone sugerido |
|-------|------|---------------|
| Hoje | `/dashboard` | Home |
| Patrimônio | `/accounts` | Wallet |
| Cartões | `/credit-cards` | CreditCard |
| Transações | `/transactions` | Receipt |
| Investimentos | `/investments` | TrendingUp |
| FIRE | `/fire` | Flame |
| Health Score | `/health` | Activity |
| Orçamentos | `/budgets` | PiggyBank |
| Timeline | `/timeline` | Calendar |
| Open Finance | `/settings/open-finance` | Link2 |

---

## Módulos — Status

| Módulo | Rota | Status | Observação |
|--------|------|--------|-----------|
| Dashboard | `/dashboard` | ✅ Ativo | Hero FIRE, Health Score, Timeline, Chat |
| FIRE Planner | `/fire` | ✅ Ativo | Cenários, persistência localStorage (Sprint 12.5) |
| Health Score | `/health` | ✅ Ativo mas escondido | Sem link na sidebar |
| Investimentos | `/investments` + `[id]/trades` | ✅ Ativo | Cotações B3, dividendos, trades |
| Contas | `/accounts` | ✅ Ativo | Open Finance + manual |
| Timeline | `/timeline` | ✅ Ativo | Feed financeiro filtrado |
| Open Finance | `/settings/open-finance` | ⚠️ Sem sidebar | Renderiza sem Sidebar/Header — layout quebrado |
| Orçamentos | `/budgets` | ⚠️ Mal rotulado | Funcional, mas sidebar chama de "Aprender" |
| Transações | `/transactions` | ⚠️ Semi-acessível | Só via Quick Action |
| Cartões de Crédito | `/credit-cards` | ❌ Órfão | Página funcional, 0 links de navegação |
| Patrimônio Manual | `/wealth` | ❌ Órfão | Página funcional, DashboardPatrimonio abandonado |
| Admin Market Data | `/admin/market-data` | ⚠️ Oculto | Funcional, apenas 1 link no Dashboard |
| Onboarding | — | ✅ Ativo (inline) | Banner no Dashboard via `getOnboardingStatus` |
| Alert Center | — | ✅ Ativo (inline) | Integrado ao Dashboard via `getAlerts` |
| Financial Insights | — | ✅ Ativo (inline) | Integrado ao Dashboard e Health |
| Context Engine | — | ✅ Ativo | Usado no Dashboard; ausente no FIRE e Health |

---

## Services — Status

| Service | Arquivo | Utilizado por | Status |
|---------|---------|--------------|--------|
| `alerts` | `services/alerts.ts` | dashboard/page, health/page | ✅ Ativo |
| `b3-market` | `services/b3-market.ts` | investments/page | ✅ Ativo |
| `budget` | `services/budget.ts` | budgets/page | ✅ Ativo |
| `credit-card` | `services/credit-card.ts` | credit-cards/page, transactions/page | ⚠️ Ativo mas rota órfã |
| `dashboard` | `services/dashboard.ts` | dashboard/page, health/page | ✅ Ativo |
| `financial-account` | `services/financial-account.ts` | accounts/page, transactions/page | ✅ Ativo |
| `financial-health` | `services/financial-health.ts` | dashboard/page, health/page | ✅ Ativo |
| `financial-insights` | `services/financial-insights.ts` | dashboard/page, health/page | ✅ Ativo |
| `fire` | `services/fire.ts` | fire/page | ✅ Ativo |
| `fx-rate` | `services/fx-rate.ts` | wealth/page | ⚠️ Ativo mas rota órfã |
| `investment` | `services/investment.ts` | investments/page | ✅ Ativo |
| `investment-trade` | `services/investment-trade.ts` | investments/[id]/trades | ✅ Ativo |
| `manual-asset` | `services/manual-asset.ts` | wealth/page | ⚠️ Ativo mas rota órfã |
| `onboarding` | `services/onboarding.ts` | dashboard/page | ✅ Ativo |
| `open-finance` | `services/open-finance.ts` | accounts/page, etc. | ✅ Ativo |
| `open-finance/queries` | `services/open-finance/queries.ts` | settings/open-finance/page | ✅ Ativo |
| `open-finance/auto-sync` | `services/open-finance/auto-sync.ts` | cron route | ✅ Ativo |
| `open-finance/sync-orchestrator` | `services/open-finance/sync-orchestrator.ts` | auto-sync | ✅ Ativo |
| `open-finance/investment-sync` | `services/open-finance/investment-sync.ts` | sync-orchestrator | ✅ Ativo |
| `radar` | `services/radar.ts` | dashboard/page | ✅ Ativo |
| `timeline` | `services/timeline.ts` | timeline/page | ✅ Ativo |
| `transaction` | `services/transaction.ts` | transactions/page | ✅ Ativo |
| `market-data/update-b3-quotes` | `services/market-data/update-b3-quotes.ts` | cron route | ✅ Ativo |

---

## Engines — Status

| Engine | Localização | Utilizado por | Status |
|--------|-------------|--------------|--------|
| **Health Engine** | `lib/financial-health/` (8 módulos) | dashboard/page, health/page, Context Engine | ✅ Ativo |
| **Insights Engine** | `lib/financial-insights/` | dashboard/page, health/page, Context Engine | ✅ Ativo |
| **Alert Engine** | `services/alerts.ts` | dashboard/page, health/page | ✅ Ativo |
| **Context Engine** | `lib/financial-context/builder.ts` | dashboard/page → DashboardClient | ✅ Ativo (parcial) — ausente em /health e /fire |
| **Radar Engine** | `lib/radar/` + `services/radar.ts` | dashboard/page → DashboardClient | ✅ Ativo |
| **FIRE Calculator** | `lib/fire/calculator.ts` | FireClient (direto), DashboardClient (fire-progress) | ✅ Ativo |
| **Timeline Engine** | `lib/timeline/buildTimeline.ts` | services/timeline.ts → TimelineClient | ✅ Ativo |
| **Onboarding Engine** | `services/onboarding.ts` | dashboard/page | ✅ Ativo |
| **Categorization Engine** | `lib/categorization/transaction-categorizer.ts` | open-finance cron, alerts | ✅ Ativo (background) |
| **Market Data Engine** | `lib/market-data/` + `lib/b3-market.ts` | investments/page, cron | ✅ Ativo |

---

## Componentes não utilizados (órfãos)

### `components/cards/` — todos órfãos

Os 7 cards criados no Sprint 2.5 **não são importados por nenhuma página ativa**. Existem apenas em seus próprios arquivos e no `index.ts`.

| Componente | Status |
|-----------|--------|
| `AIInsightCard` | ❌ Não usado em nenhuma página |
| `ChartCard` | ❌ Não usado em nenhuma página |
| `ConnectionCard` | ❌ Não usado em nenhuma página |
| `GoalCard` | ❌ Não usado em nenhuma página |
| `InvestmentCard` | ❌ Não usado em nenhuma página |
| `MetricCard` | ⚠️ Usado apenas por `ContentGrid` (também órfão) |
| `NewsCard` | ❌ Não usado em nenhuma página |

### `components/charts/` — todos órfãos (via DashboardPatrimonio)

| Componente | Status |
|-----------|--------|
| `AreaChart` | ⚠️ Usado só em `DashboardPatrimonio` (órfão) |
| `BarChart` | ⚠️ Usado só em `DashboardPatrimonio` (órfão) |
| `DonutChart` | ⚠️ Usado só em `DashboardPatrimonio` (órfão) |
| `LineChart` | ⚠️ Usado só em `DashboardPatrimonio` (órfão) |

### `components/layout/` — parcialmente órfãos

| Componente | Status |
|-----------|--------|
| `AppShell` | ❌ Não usado em nenhuma página (só `index.ts`) |
| `ContentGrid` | ❌ Não usado em nenhuma página (só `index.ts` + MetricCard) |
| `PageContainer` | ❌ Não usado em nenhuma página (só `index.ts`) |
| `AppLayout` | ✅ Usado em 12+ páginas |
| `Sidebar` | ✅ Usado via AppLayout |
| `Header` | ✅ Usado via AppLayout |
| `Footer` | ✅ Usado via AppLayout |
| `AppBreadcrumb` | ✅ Usado no Header |

### `components/buttons/` — todos órfãos

`DangerButton`, `GhostButton`, `PrimaryButton`, `SecondaryButton` — 0 usos externos. Substituídos por classes inline.

### `components/dashboard/` — todos órfãos

Criados para serem integrados ao DashboardClient, mas o redesign do Dashboard (Sprint 12.2) reescreveu tudo inline, abandonando esses componentes.

| Componente | Status |
|-----------|--------|
| `AlertsCard` | ❌ Não importado pelo DashboardClient atual |
| `FinancialHealthCard` | ❌ Não importado pelo DashboardClient atual |
| `FinancialInsightsCard` | ❌ Não importado pelo DashboardClient atual |
| `OnboardingChecklist` | ❌ Não importado pelo DashboardClient atual |

### `app/dashboard/DashboardPatrimonio.tsx` — órfão

- Criado no Sprint 7.4 para exibir gráficos de patrimônio
- Usa todos os charts (AreaChart, BarChart, DonutChart, LineChart)
- Linka para `/wealth`
- **Não é importado pelo DashboardClient atual** (reescrito no Sprint 8.1+)
- Resultado: puxou `/wealth` para o limbo junto

---

## Problemas técnicos identificados

| # | Problema | Severidade | Arquivo(s) |
|---|---------|-----------|-----------|
| P1 | `/health` não está em `PROTECTED_ROUTES` no middleware | 🔴 Alta | `middleware.ts` |
| P2 | `/settings/open-finance` renderiza sem `AppLayout` — sem sidebar, sem header | 🔴 Alta | `settings/open-finance/page.tsx` |
| P3 | Sidebar "Alertas" aponta para `/settings/open-finance` (label totalmente errado) | 🟠 Média | `Sidebar.tsx` |
| P4 | Sidebar "Aprender" aponta para `/budgets` (label totalmente errado) | 🟠 Média | `Sidebar.tsx` |
| P5 | `/credit-cards` completamente inacessível — 0 links | 🟠 Média | `Sidebar.tsx` |
| P6 | `/wealth` inacessível — `DashboardPatrimonio` abandonado | 🟠 Média | `DashboardClient.tsx` |
| P7 | `buildTimeline` duplicado — existe em `lib/timeline/buildTimeline.ts` E inline em `DashboardClient.tsx` | 🟡 Baixa | `DashboardClient.tsx` |
| P8 | 4 componentes `components/dashboard/` criados mas nunca usados | 🟡 Baixa | `components/dashboard/` |
| P9 | 7 cards `components/cards/` criados mas nunca usados | 🟡 Baixa | `components/cards/` |
| P10 | 4 charts `components/charts/` acessíveis só via componente órfão | 🟡 Baixa | `components/charts/` |
| P11 | Context Engine (`buildFinancialContext`) só alimenta o Dashboard — ausente em `/health` e `/fire` | 🟡 Baixa | `health/page.tsx`, `fire/page.tsx` |

---

## Recomendações — próximos sprints

### Imediato (bloqueia navegação real)

1. **Sidebar — corrigir labels e adicionar rotas faltantes**
   - "Alertas" → renomear para "Open Finance" ou "Conexões" + apontar para `/settings/open-finance`
   - "Aprender" → renomear para "Orçamentos" ou trocar href para rota correta
   - Adicionar `/credit-cards`, `/transactions`, `/health`, `/wealth` à navegação

2. **`/settings/open-finance` — adicionar AppLayout**
   - Hoje renderiza sem sidebar e sem header — parece uma página quebrada

3. **`/health` — adicionar ao middleware**
   - Única rota de usuário sem proteção no middleware

### Alta prioridade (funcionalidades escondidas)

4. **Restaurar acesso a `/credit-cards`** — página 100% funcional, totalmente inacessível
5. **Restaurar acesso a `/wealth`** — reintegrar `DashboardPatrimonio` ao Dashboard OU adicionar `/wealth` à sidebar
6. **Tornar `/transactions` acessível via nav principal** — hoje só via Quick Action

### Média prioridade (limpeza e consistência)

7. **Decidir sobre `components/dashboard/` (AlertsCard, etc.)** — ou reintegrar ao DashboardClient ou remover
8. **Decidir sobre `components/cards/` e `components/charts/`** — 11 componentes sem uso
9. **Eliminar `buildTimeline` duplicado** no DashboardClient — usar o da lib ou consolidar
10. **Expandir Context Engine** para `/health` e `/fire`

---

*Auditoria Sprint 12.6 — Copiloto Financeiro IA — sem alterações de código*
