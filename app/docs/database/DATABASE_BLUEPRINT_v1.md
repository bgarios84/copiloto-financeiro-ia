# Database Blueprint v1 — Copiloto Financeiro IA

> **Status:** Rascunho arquitetural · Não implementado  
> **Versão:** 1.0.0  
> **Data:** 2026-06-28  
> **Autor:** Database Architect (AI-assisted)  
> **Engine:** PostgreSQL 15+ via Supabase  

---

## Lista Consolidada de Tabelas

> Referência rápida de todas as tabelas do sistema, agrupadas por domínio.  
> **RLS** = Row Level Security ativa para dados de usuário.  
> **Prioridade:** MVP = lançamento inicial · V2 = segunda versão · Futuro = roadmap longo prazo.

---

### 1. Core / Auth

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `profile` | Estende `auth.users` com dados de perfil da aplicação | Sim | MVP |
| `user_preference` | Preferências de UI, notificações e comportamento do Copiloto | Sim | MVP |

---

### 2. Financeiro

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `institution` | Catálogo compartilhado de bancos e instituições financeiras | Não | MVP |
| `financial_account` | Contas bancárias, carteiras e contas de investimento do usuário | Sim | MVP |
| `credit_card` | Cartões de crédito com limite, fechamento e vencimento | Sim | MVP |
| `credit_card_invoice` | Fatura mensal de cada cartão de crédito | Sim | MVP |
| `transaction` | Núcleo financeiro: todas as movimentações de entrada, saída e transferência | Sim | MVP |
| `category` | Hierarquia de categorias (sistema + personalizadas) para classificar transações | Sim | MVP |
| `installment_group` | Agrupa transações de compras parceladas no cartão | Sim | MVP |
| `recurrence` | Template de lançamentos recorrentes (salário, assinaturas, aluguel) | Sim | MVP |

---

### 3. Patrimônio

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `net_worth_snapshot` | Foto periódica do patrimônio líquido (ativos − passivos) para histórico | Sim | MVP |
| `asset` | Bens físicos declarados pelo usuário (imóvel, veículo, outros) | Sim | V2 |
| `liability` | Dívidas e financiamentos fora do cartão (mortgage, empréstimos) | Sim | V2 |

---

### 4. Investimentos

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `portfolio` | Carteira de investimentos do usuário vinculada a uma conta corretora | Sim | V2 |
| `investment_position` | Posição atual desnormalizada por ativo (quantidade, preço médio, retorno) | Sim | V2 |
| `investment_transaction` | Histórico de compras, vendas e eventos corporativos de ativos | Sim | V2 |
| `fixed_income_bond` | Títulos de renda fixa: CDB, Tesouro, LCI, LCA, debentures | Sim | V2 |
| `fixed_income_snapshot` | Histórico de valor atualizado de cada título para gráfico de evolução | Sim | V2 |
| `crypto_wallet` | Endereços de carteiras cripto (exchange, cold wallet, soft wallet) | Sim | Futuro |
| `goal` | Metas financeiras com valor-alvo, prazo e progresso | Sim | MVP |
| `goal_contribution` | Histórico de aportes realizados em cada meta | Sim | MVP |
| `retirement_plan` | Plano de aposentadoria/FIRE com projeções de patrimônio e renda passiva | Sim | V2 |
| `retirement_projection_snapshot` | Histórico de projeções recalculadas do plano de aposentadoria | Sim | V2 |

---

### 5. Mercado

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `b3_asset` | Catálogo de ativos listados na B3 (ações, BDRs, units) | Não | V2 |
| `b3_quote` | Cotações diárias OHLCV de ativos B3 | Não | V2 |
| `fii_asset` | Metadados específicos de FIIs (segmento, P/VPA, DY, vacância) | Não | V2 |
| `us_asset` | Catálogo de ações americanas listadas em NYSE/NASDAQ | Não | Futuro |
| `us_quote` | Cotações diárias OHLCV de ações americanas | Não | Futuro |
| `etf_asset` | Metadados de ETFs nacionais e internacionais (índice, taxa, emissor) | Não | Futuro |
| `crypto_asset` | Catálogo de criptoativos com ranking e categoria | Não | Futuro |
| `crypto_quote` | Cotações de criptomoedas em USD e BRL (alta frequência) | Não | Futuro |
| `fx_rate` | Taxas de câmbio diárias entre moedas (USD/BRL, EUR/BRL) | Não | V2 |

---

### 6. Dividendos

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `dividend` | Catálogo compartilhado de proventos pagos por ações, FIIs e ETFs | Não | V2 |
| `user_dividend_receipt` | Valores efetivamente recebidos pelo usuário com base na posição na data ex | Sim | V2 |

---

### 7. IA

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `ai_conversation` | Sessões de conversa do usuário com o Copiloto IA | Sim | V2 |
| `ai_message` | Mensagens individuais de cada conversa (user/assistant/system) | Sim | V2 |
| `ai_insight` | Insights proativos gerados pelo Copiloto (alertas, oportunidades, dicas) | Sim | V2 |
| `ai_categorization_log` | Rastreia categorizações automáticas para feedback e melhoria do modelo | Sim | V2 |
| `ai_financial_score` | Score de saúde financeira calculado mensalmente por componente | Sim | V2 |

---

### 8. Notícias

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `news_article` | Catálogo de artigos financeiros com sentimento e ativos mencionados | Não | Futuro |
| `user_news_interaction` | Interações do usuário com artigos (lido, salvo) | Sim | Futuro |

---

### 9. Integrações / Sync

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `integration` | Conectores externos do usuário: OFX, CSV, broker API | Sim | V2 |
| `import_job` | Rastreia status e resultado de cada importação de arquivo | Sim | V2 |
| `open_finance_consent` | Consentimentos Open Finance Brasil concedidos pelo usuário | Sim | Futuro |
| `open_finance_account` | Contas bancárias descobertas via Open Finance | Sim | Futuro |
| `open_finance_transaction` | Transações importadas via Open Finance aguardando vinculação interna | Sim | Futuro |
| `sync_job` | Log de sincronizações automáticas de cotações, câmbio e dividendos | Não | V2 |
| `user_sync_status` | Status e frequência de sincronização por usuário e tipo | Sim | V2 |

---

### 10. Premium / Admin / Auditoria

| Tabela | Objetivo | RLS | Prioridade |
|---|---|---|---|
| `plan` | Catálogo de planos (Free, Premium) com limites e feature flags em JSONB | Não | MVP |
| `plan_subscription` | Histórico de assinaturas do usuário com status e dados do payment provider | Sim | MVP |
| `plan_usage` | Consumo mensal por feature para enforcement de limites do plano | Sim | MVP |
| `audit.log` | Registro imutável de todas as mudanças em dados sensíveis (schema separado) | Não¹ | MVP |

> ¹ `audit.log` usa schema `audit` isolado, inacessível via RLS de usuário comum — escrita apenas por triggers com `SECURITY DEFINER`.

---

### Resumo por Prioridade

| Prioridade | Qtd. de Tabelas | Domínios |
|---|---|---|
| **MVP** | 16 | Core, Financeiro (core), Metas, Planos, Auditoria |
| **V2** | 22 | Patrimônio, Investimentos, Mercado BR, Dividendos, IA, Integrações |
| **Futuro** | 12 | Ativos US/Cripto/ETF, Open Finance, Notícias, Carteiras cripto |
| **Total** | **50** | 10 domínios |

---

## Convenções Globais

| Convenção | Padrão |
|---|---|
| Identificadores | `UUID v4` via `gen_random_uuid()` |
| Timestamps | `TIMESTAMPTZ` em UTC |
| Valores monetários | `NUMERIC(18, 2)` (evita ponto flutuante) |
| Percentuais | `NUMERIC(8, 4)` (ex: 12.3456) |
| Soft delete | Coluna `deleted_at TIMESTAMPTZ` |
| Isolamento de dados | Row Level Security (RLS) em todas as tabelas |
| Schema de aplicação | `public` (padrão Supabase) |
| Schema de auditoria | `audit` |
| Nomenclatura | `snake_case` singular para tabelas, plural para colunas de array |

---

## Índice de Domínios

1. [Usuários e Perfis](#1-usuários-e-perfis)
2. [Contas Financeiras](#2-contas-financeiras)
3. [Cartões de Crédito](#3-cartões-de-crédito)
4. [Transações](#4-transações)
5. [Categorias](#5-categorias)
6. [Parcelamentos](#6-parcelamentos)
7. [Recorrências](#7-recorrências)
8. [Patrimônio](#8-patrimônio)
9. [Investimentos — Base](#9-investimentos--base)
10. [Ações Brasileiras (B3)](#10-ações-brasileiras-b3)
11. [FIIs](#11-fiis)
12. [Ações Americanas](#12-ações-americanas)
13. [ETFs](#13-etfs)
14. [Criptomoedas](#14-criptomoedas)
15. [Renda Fixa](#15-renda-fixa)
16. [Dividendos](#16-dividendos)
17. [Metas Financeiras](#17-metas-financeiras)
18. [Planejamento de Aposentadoria](#18-planejamento-de-aposentadoria)
19. [IA Financeira](#19-ia-financeira)
20. [Notícias e Conteúdo](#20-notícias-e-conteúdo)
21. [Integrações Futuras](#21-integrações-futuras)
22. [Open Finance](#22-open-finance)
23. [Sincronizações Automáticas](#23-sincronizações-automáticas)
24. [Auditoria](#24-auditoria)
25. [Planos Free / Premium](#25-planos-free--premium)

---

## 1. Usuários e Perfis

### Objetivo
Estender o `auth.users` do Supabase com dados de perfil da aplicação. O Supabase gerencia credenciais, MFA e OAuth — este domínio armazena metadados de produto.

### Tabelas

#### `profile`
Criada automaticamente via trigger ao novo usuário em `auth.users`.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | Espelha `auth.users.id` |
| `full_name` | `TEXT` | Nome completo |
| `display_name` | `TEXT` | Nome exibido na UI |
| `avatar_url` | `TEXT` | URL da foto (storage Supabase) |
| `phone` | `TEXT` | Telefone com DDD |
| `birth_date` | `DATE` | Data de nascimento |
| `cpf_hash` | `TEXT` | Hash SHA-256 do CPF (nunca texto puro) |
| `country` | `CHAR(2)` | ISO 3166 (padrão: `BR`) |
| `locale` | `VARCHAR(10)` | ex: `pt-BR` |
| `timezone` | `TEXT` | ex: `America/Sao_Paulo` |
| `onboarding_completed` | `BOOLEAN` | Flag de onboarding |
| `plan_id` | `UUID FK → plan` | Plano ativo |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | Soft delete |

#### `user_preference`
Preferências de UI, notificações e comportamento do Copiloto.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `theme` | `TEXT` | `light`, `dark`, `system` |
| `currency` | `CHAR(3)` | ISO 4217 (padrão: `BRL`) |
| `date_format` | `TEXT` | ex: `DD/MM/YYYY` |
| `notification_email` | `BOOLEAN` | — |
| `notification_push` | `BOOLEAN` | — |
| `ai_suggestions_enabled` | `BOOLEAN` | — |
| `weekly_report_enabled` | `BOOLEAN` | — |
| `data` | `JSONB` | Preferências extensíveis futuras |
| `updated_at` | `TIMESTAMPTZ` | — |

### Relacionamentos
- `profile.id` → `auth.users.id` (1:1, criado por trigger)
- `profile.plan_id` → `plan.id`
- `user_preference.user_id` → `profile.id` (1:1)

### Segurança
- RLS: `user_id = auth.uid()` em todas as linhas
- CPF nunca armazenado em texto puro — apenas hash
- `auth.users` gerenciado exclusivamente pelo Supabase Auth
- Trigger `handle_new_user` cria `profile` automaticamente no cadastro

### Escalabilidade
- `profile` é leve — dados pesados (fotos) ficam no Supabase Storage
- `user_preference.data JSONB` absorve novas preferências sem migrações

---

## 2. Contas Financeiras

### Objetivo
Representar contas bancárias, carteiras digitais, contas de investimento e qualquer conta onde o usuário mantém saldo. Base para todas as movimentações financeiras.

### Tabelas

#### `financial_account`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `institution_id` | `UUID FK → institution` | Banco/instituição |
| `name` | `TEXT` | Ex: "Nubank Conta" |
| `type` | `TEXT` | `checking`, `savings`, `investment`, `wallet`, `cash` |
| `currency` | `CHAR(3)` | ISO 4217 |
| `balance` | `NUMERIC(18,2)` | Saldo atual |
| `balance_updated_at` | `TIMESTAMPTZ` | Última atualização do saldo |
| `color` | `CHAR(7)` | Hex para UI |
| `icon` | `TEXT` | Ícone da conta |
| `is_active` | `BOOLEAN` | — |
| `is_manual` | `BOOLEAN` | Manual vs. integração automática |
| `open_finance_id` | `UUID FK → open_finance_account` | Referência Open Finance |
| `notes` | `TEXT` | Observações |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

#### `institution`
Catálogo de bancos e instituições financeiras (dado compartilhado, não por usuário).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `name` | `TEXT` | "Itaú", "Nubank" |
| `short_name` | `TEXT` | "itau", "nubank" |
| `ispb` | `CHAR(8)` | Código ISPB (Banco Central) |
| `cnpj` | `TEXT` | CNPJ da instituição |
| `logo_url` | `TEXT` | URL do logo |
| `color` | `CHAR(7)` | Cor primária da marca |
| `supports_open_finance` | `BOOLEAN` | — |
| `is_active` | `BOOLEAN` | — |

### Relacionamentos
- `financial_account` N:1 `institution`
- `financial_account` 1:N `transaction`
- `financial_account` 1:1 `open_finance_account` (opcional)

### Segurança
- RLS: `user_id = auth.uid()`
- `institution` é read-only para usuários (sem RLS de escrita)
- Saldo nunca calculado em tempo real via query — mantido desnormalizado com `balance_updated_at`

### Escalabilidade
- `institution` pode ser seed de dados compartilhados (não por usuário)
- Índice em `(user_id, is_active)` para listagem eficiente

---

## 3. Cartões de Crédito

### Objetivo
Modelar cartões com fatura mensal, limite, data de vencimento e fechamento. Cartões são entidades separadas de contas pois têm ciclo de fatura próprio.

### Tabelas

#### `credit_card`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `institution_id` | `UUID FK → institution` | Emissor |
| `name` | `TEXT` | "Nubank Roxinho" |
| `brand` | `TEXT` | `visa`, `mastercard`, `elo`, `amex` |
| `last_four` | `CHAR(4)` | Últimos 4 dígitos |
| `credit_limit` | `NUMERIC(18,2)` | Limite total |
| `available_limit` | `NUMERIC(18,2)` | Limite disponível atual |
| `closing_day` | `SMALLINT` | Dia de fechamento (1-31) |
| `due_day` | `SMALLINT` | Dia de vencimento (1-31) |
| `color` | `CHAR(7)` | — |
| `is_active` | `BOOLEAN` | — |
| `payment_account_id` | `UUID FK → financial_account` | Conta para débito da fatura |
| `created_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

#### `credit_card_invoice`
Cada fatura mensal do cartão.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `card_id` | `UUID FK → credit_card` | — |
| `user_id` | `UUID FK → profile` | Denormalizado para RLS |
| `reference_month` | `DATE` | Primeiro dia do mês da fatura |
| `closing_date` | `DATE` | Data de fechamento |
| `due_date` | `DATE` | Data de vencimento |
| `total_amount` | `NUMERIC(18,2)` | Total da fatura |
| `paid_amount` | `NUMERIC(18,2)` | Valor pago |
| `status` | `TEXT` | `open`, `closed`, `paid`, `overdue` |
| `paid_at` | `TIMESTAMPTZ` | — |
| `created_at` | `TIMESTAMPTZ` | — |

### Relacionamentos
- `credit_card` N:1 `institution`
- `credit_card` 1:N `credit_card_invoice`
- `credit_card_invoice` 1:N `transaction` (via `invoice_id`)
- `credit_card.payment_account_id` → `financial_account`

### Segurança
- RLS em ambas as tabelas por `user_id`
- `last_four` não é dado sensível — número completo jamais armazenado
- Fatura pode ser gerada por função agendada (Supabase Edge Function)

### Escalabilidade
- Índice em `(card_id, reference_month)` para busca de fatura atual
- Faturas antigas podem ser arquivadas em tabela particionada por mês

---

## 4. Transações

### Objetivo
Núcleo financeiro do sistema. Registra toda movimentação de dinheiro: entrada, saída, transferência. Ponto central de relacionamento entre contas, categorias, parcelamentos e recorrências.

### Tabelas

#### `transaction`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `account_id` | `UUID FK → financial_account` | Conta de origem/destino |
| `card_id` | `UUID FK → credit_card` | Preenchido se for despesa no cartão |
| `invoice_id` | `UUID FK → credit_card_invoice` | Fatura do cartão |
| `category_id` | `UUID FK → category` | — |
| `subcategory_id` | `UUID FK → category` | — |
| `installment_group_id` | `UUID FK → installment_group` | Grupo de parcelamento |
| `recurrence_id` | `UUID FK → recurrence` | Template de recorrência |
| `type` | `TEXT` | `income`, `expense`, `transfer` |
| `amount` | `NUMERIC(18,2)` | Sempre positivo |
| `currency` | `CHAR(3)` | ISO 4217 |
| `description` | `TEXT` | Descrição amigável |
| `notes` | `TEXT` | Notas do usuário |
| `date` | `DATE` | Data da transação |
| `competence_date` | `DATE` | Data de competência (pode diferir) |
| `status` | `TEXT` | `pending`, `confirmed`, `cancelled` |
| `is_ignored` | `BOOLEAN` | Excluída de relatórios |
| `transfer_peer_id` | `UUID FK → transaction` | Outra ponta da transferência |
| `tags` | `TEXT[]` | Tags livres |
| `origin` | `TEXT` | `manual`, `open_finance`, `import`, `ai_suggestion` |
| `external_id` | `TEXT` | ID no sistema externo (OFX, OBK) |
| `attachment_urls` | `TEXT[]` | Comprovantes no Storage |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

### Relacionamentos
- `transaction` N:1 `financial_account`
- `transaction` N:1 `credit_card`
- `transaction` N:1 `category`
- `transaction` N:1 `installment_group`
- `transaction` N:1 `recurrence`
- `transaction` auto-referencia `transfer_peer_id`

### Segurança
- RLS por `user_id`
- Transações deletadas via soft delete — jamais excluídas fisicamente
- `attachment_urls` aponta para Storage com políticas próprias de acesso

### Escalabilidade
- Particionamento por `date` (range partition mensal) para usuários com anos de histórico
- Índices: `(user_id, date DESC)`, `(account_id, date DESC)`, `(category_id)`, `(status)`
- `BRIN index` em `date` para queries de range em tabelas grandes

---

## 5. Categorias

### Objetivo
Sistema hierárquico de categorias (categoria → subcategoria) com suporte a categorias padrão do sistema e categorias personalizadas por usuário.

### Tabelas

#### `category`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | NULL = categoria do sistema |
| `parent_id` | `UUID FK → category` | NULL = categoria raiz |
| `name` | `TEXT` | "Alimentação" |
| `icon` | `TEXT` | Ícone (lucide slug) |
| `color` | `CHAR(7)` | Hex |
| `type` | `TEXT` | `income`, `expense`, `both` |
| `is_system` | `BOOLEAN` | Categoria padrão (imutável) |
| `sort_order` | `SMALLINT` | Ordem na UI |
| `created_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

### Relacionamentos
- `category` auto-referencia `parent_id` (hierarquia de 2 níveis)
- `category` 1:N `transaction`

### Segurança
- RLS: `user_id = auth.uid() OR user_id IS NULL`
- Categorias do sistema (`is_system = true`) sem `user_id` — visíveis a todos
- Usuário só pode editar/excluir categorias próprias

### Escalabilidade
- Seed de categorias do sistema via migration
- Hierarquia limitada a 2 níveis (categoria/subcategoria) — sem árvore recursiva

---

## 6. Parcelamentos

### Objetivo
Agrupar transações de compras parceladas no cartão de crédito. Um grupo de parcelamento gera N transações (uma por parcela).

### Tabelas

#### `installment_group`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `card_id` | `UUID FK → credit_card` | — |
| `description` | `TEXT` | "iPhone 15 — 12x" |
| `total_amount` | `NUMERIC(18,2)` | Valor total da compra |
| `installment_count` | `SMALLINT` | Total de parcelas |
| `installment_amount` | `NUMERIC(18,2)` | Valor por parcela |
| `first_installment_date` | `DATE` | Data da 1ª parcela |
| `category_id` | `UUID FK → category` | — |
| `interest_rate` | `NUMERIC(8,4)` | Taxa de juros (se houver) |
| `created_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

### Relacionamentos
- `installment_group` 1:N `transaction` (via `installment_group_id`)
- Cada `transaction` tem `installment_number` e `installment_total` denormalizados

### Segurança
- RLS por `user_id`
- Ao deletar grupo, soft-delete cascateia para transações vinculadas

### Escalabilidade
- Geração das parcelas via trigger ou Edge Function no momento da criação
- `installment_amount` pré-calculado para evitar queries de agregação frequentes

---

## 7. Recorrências

### Objetivo
Modelar lançamentos recorrentes (salário mensal, aluguel, assinaturas) com geração automática de transações futuras.

### Tabelas

#### `recurrence`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `account_id` | `UUID FK → financial_account` | — |
| `category_id` | `UUID FK → category` | — |
| `description` | `TEXT` | "Salário", "Netflix" |
| `type` | `TEXT` | `income`, `expense` |
| `amount` | `NUMERIC(18,2)` | — |
| `currency` | `CHAR(3)` | — |
| `frequency` | `TEXT` | `daily`, `weekly`, `monthly`, `yearly` |
| `interval` | `SMALLINT` | A cada N frequências (ex: a cada 2 meses) |
| `day_of_month` | `SMALLINT` | Dia do mês (se monthly) |
| `day_of_week` | `SMALLINT` | Dia da semana 0-6 (se weekly) |
| `start_date` | `DATE` | Início da recorrência |
| `end_date` | `DATE` | Fim (NULL = sem fim) |
| `next_occurrence` | `DATE` | Próxima data a lançar |
| `is_active` | `BOOLEAN` | — |
| `tags` | `TEXT[]` | — |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

### Relacionamentos
- `recurrence` 1:N `transaction`
- `transaction.recurrence_id` → `recurrence.id`

### Segurança
- RLS por `user_id`
- Geração automática via Supabase Cron + Edge Function (não exposta ao frontend)

### Escalabilidade
- `next_occurrence` indexado para a Edge Function de geração diária
- Geração de transações futuras limitada a 3 meses à frente (configurável)

---

## 8. Patrimônio

### Objetivo
Calcular e historizar o patrimônio líquido do usuário ao longo do tempo: ativos (contas + investimentos + bens) menos passivos (cartões + dívidas).

### Tabelas

#### `net_worth_snapshot`
Foto diária/semanal do patrimônio líquido (calculado e armazenado, não derivado em tempo real).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `date` | `DATE` | Data do snapshot |
| `total_assets` | `NUMERIC(18,2)` | Total de ativos |
| `total_liabilities` | `NUMERIC(18,2)` | Total de passivos |
| `net_worth` | `NUMERIC(18,2)` | Patrimônio líquido |
| `cash_balance` | `NUMERIC(18,2)` | Saldo em contas |
| `investment_balance` | `NUMERIC(18,2)` | Total em investimentos |
| `real_estate_value` | `NUMERIC(18,2)` | Imóveis e bens |
| `credit_card_balance` | `NUMERIC(18,2)` | Dívidas de cartão |
| `loan_balance` | `NUMERIC(18,2)` | Financiamentos e empréstimos |
| `created_at` | `TIMESTAMPTZ` | — |

#### `asset`
Bens físicos declarados (imóvel, veículo, etc.).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `name` | `TEXT` | "Apartamento São Paulo" |
| `type` | `TEXT` | `real_estate`, `vehicle`, `other` |
| `value` | `NUMERIC(18,2)` | Valor estimado |
| `acquisition_date` | `DATE` | Data de aquisição |
| `acquisition_value` | `NUMERIC(18,2)` | Valor de compra |
| `notes` | `TEXT` | — |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

#### `liability`
Dívidas e financiamentos fora do cartão de crédito.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `name` | `TEXT` | "Financiamento imóvel" |
| `type` | `TEXT` | `mortgage`, `car_loan`, `personal_loan`, `student_loan`, `other` |
| `total_amount` | `NUMERIC(18,2)` | Valor original |
| `remaining_amount` | `NUMERIC(18,2)` | Saldo devedor |
| `monthly_payment` | `NUMERIC(18,2)` | Parcela mensal |
| `interest_rate` | `NUMERIC(8,4)` | Taxa anual |
| `start_date` | `DATE` | — |
| `end_date` | `DATE` | — |
| `institution_id` | `UUID FK → institution` | — |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

### Segurança
- RLS por `user_id` em todas as tabelas
- `net_worth_snapshot` gerado por função interna — usuário não escreve diretamente

### Escalabilidade
- Snapshot gerado diariamente por Supabase Cron
- Retenção configurável: dados diários (últimos 90 dias), semanais (últimos 2 anos), mensais (histórico completo)

---

## 9. Investimentos — Base

### Objetivo
Camada base comum a todos os tipos de investimento. Evita duplicação de lógica entre ações, FIIs, renda fixa, cripto, etc.

### Tabelas

#### `portfolio`
Carteira de investimentos do usuário.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `name` | `TEXT` | "Carteira Principal" |
| `broker_account_id` | `UUID FK → financial_account` | Conta corretora vinculada |
| `currency` | `CHAR(3)` | — |
| `is_default` | `BOOLEAN` | — |
| `created_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

#### `investment_position`
Posição atual em cada ativo (desnormalizado para performance).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `portfolio_id` | `UUID FK → portfolio` | — |
| `user_id` | `UUID FK → profile` | Denormalizado para RLS |
| `asset_type` | `TEXT` | `stock_br`, `fii`, `stock_us`, `etf`, `crypto`, `fixed_income` |
| `ticker` | `TEXT` | Código do ativo |
| `quantity` | `NUMERIC(18,8)` | Quantidade (8 casas para cripto) |
| `avg_cost` | `NUMERIC(18,8)` | Preço médio de compra |
| `current_price` | `NUMERIC(18,8)` | Cotação atual |
| `current_value` | `NUMERIC(18,2)` | Valor atual total |
| `total_invested` | `NUMERIC(18,2)` | Total investido |
| `return_value` | `NUMERIC(18,2)` | Retorno em R$ |
| `return_pct` | `NUMERIC(8,4)` | Retorno em % |
| `price_updated_at` | `TIMESTAMPTZ` | Última atualização de cotação |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `investment_transaction`
Compras, vendas, transferências de ativos.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `portfolio_id` | `UUID FK → portfolio` | — |
| `user_id` | `UUID FK → profile` | — |
| `asset_type` | `TEXT` | — |
| `ticker` | `TEXT` | — |
| `operation` | `TEXT` | `buy`, `sell`, `split`, `reverse_split`, `bonus` |
| `quantity` | `NUMERIC(18,8)` | — |
| `unit_price` | `NUMERIC(18,8)` | — |
| `total_amount` | `NUMERIC(18,2)` | — |
| `fees` | `NUMERIC(18,2)` | Corretagem e taxas |
| `ir_withheld` | `NUMERIC(18,2)` | IR retido na fonte |
| `date` | `DATE` | Data do negócio |
| `settlement_date` | `DATE` | Data de liquidação (D+2) |
| `broker` | `TEXT` | Corretora |
| `note_number` | `TEXT` | Número da nota de corretagem |
| `origin` | `TEXT` | `manual`, `import`, `open_finance` |
| `created_at` | `TIMESTAMPTZ` | — |

### Segurança
- RLS por `user_id` em todas as tabelas
- `current_price` atualizado por job, não pelo usuário

### Escalabilidade
- `investment_position` é uma projeção denormalizada recalculada por trigger ou job
- Cotações em tabela separada de market data (domínios 10–14)

---

## 10. Ações Brasileiras (B3)

### Objetivo
Catálogo de ativos listados na B3 e histórico de cotações. Dado compartilhado (não por usuário).

### Tabelas

#### `b3_asset`

| Coluna | Tipo | Descrição |
|---|---|---|
| `ticker` | `TEXT PK` | "PETR4", "VALE3" |
| `name` | `TEXT` | "Petróleo Brasileiro S.A." |
| `long_name` | `TEXT` | Nome completo |
| `sector` | `TEXT` | Setor B3 |
| `subsector` | `TEXT` | — |
| `segment` | `TEXT` | Novo Mercado, etc. |
| `type` | `TEXT` | `ON`, `PN`, `UNT`, `BDR` |
| `isin` | `CHAR(12)` | Código ISIN |
| `cnpj` | `TEXT` | CNPJ do emissor |
| `lot_size` | `INT` | Lote padrão (geralmente 100) |
| `currency` | `CHAR(3)` | `BRL` |
| `is_active` | `BOOLEAN` | Ativo na bolsa |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `b3_quote`
Cotação diária (OHLCV).

| Coluna | Tipo | Descrição |
|---|---|---|
| `ticker` | `TEXT FK → b3_asset` | — |
| `date` | `DATE` | — |
| `open` | `NUMERIC(18,4)` | — |
| `high` | `NUMERIC(18,4)` | — |
| `low` | `NUMERIC(18,4)` | — |
| `close` | `NUMERIC(18,4)` | — |
| `volume` | `BIGINT` | — |
| `adjusted_close` | `NUMERIC(18,4)` | Fechamento ajustado |
| **PK** | `(ticker, date)` | — |

### Segurança
- Tabelas de mercado sem RLS — read-only para todos os usuários autenticados
- Escrita exclusiva por service role (jobs de importação)

### Escalabilidade
- `b3_quote` particionado por ano (`PARTITION BY RANGE (date)`)
- Ingestão via API (Brapi, HG Brasil, Yahoo Finance) em job noturno
- TimescaleDB ou pg_partman para gerenciar partições de séries temporais

---

## 11. FIIs

### Objetivo
Fundos de Investimento Imobiliário — ativo específico com características próprias (P/VPA, DY, segmento).

### Tabelas

#### `fii_asset`
Estende `b3_asset` com dados específicos de FIIs.

| Coluna | Tipo | Descrição |
|---|---|---|
| `ticker` | `TEXT PK FK → b3_asset` | — |
| `segment` | `TEXT` | `Lajes Corporativas`, `Logística`, `Shoppings`, etc. |
| `management_type` | `TEXT` | `active`, `passive` |
| `administrator` | `TEXT` | Administrador do fundo |
| `manager` | `TEXT` | Gestor do fundo |
| `inception_date` | `DATE` | — |
| `total_assets` | `NUMERIC(18,2)` | PL do fundo |
| `shares_outstanding` | `BIGINT` | Cotas emitidas |
| `pvpa` | `NUMERIC(8,4)` | P/VPA atual |
| `dividend_yield_12m` | `NUMERIC(8,4)` | DY 12 meses |
| `vacancy_rate` | `NUMERIC(8,4)` | Taxa de vacância |
| `updated_at` | `TIMESTAMPTZ` | — |

### Relacionamentos
- Herda cotações de `b3_quote` via `ticker`
- Dividendos em `dividend` (domínio 16)

---

## 12. Ações Americanas

### Objetivo
Ativos listados em NYSE/NASDAQ para usuários com exposição internacional.

### Tabelas

#### `us_asset`

| Coluna | Tipo | Descrição |
|---|---|---|
| `ticker` | `TEXT PK` | "AAPL", "MSFT" |
| `name` | `TEXT` | — |
| `exchange` | `TEXT` | `NYSE`, `NASDAQ`, `AMEX` |
| `sector` | `TEXT` | GICS Sector |
| `industry` | `TEXT` | — |
| `country` | `CHAR(2)` | País de origem |
| `currency` | `CHAR(3)` | `USD` |
| `isin` | `CHAR(12)` | — |
| `market_cap` | `NUMERIC(22,2)` | — |
| `is_active` | `BOOLEAN` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `us_quote`

| Coluna | Tipo | Descrição |
|---|---|---|
| `ticker` | `TEXT FK → us_asset` | — |
| `date` | `DATE` | — |
| `open` | `NUMERIC(18,4)` | — |
| `high` | `NUMERIC(18,4)` | — |
| `low` | `NUMERIC(18,4)` | — |
| `close` | `NUMERIC(18,4)` | — |
| `volume` | `BIGINT` | — |
| `adjusted_close` | `NUMERIC(18,4)` | — |
| **PK** | `(ticker, date)` | — |

#### `fx_rate`
Taxas de câmbio diárias (USD/BRL, EUR/BRL, etc.).

| Coluna | Tipo | Descrição |
|---|---|---|
| `from_currency` | `CHAR(3)` | — |
| `to_currency` | `CHAR(3)` | — |
| `date` | `DATE` | — |
| `rate` | `NUMERIC(18,8)` | — |
| **PK** | `(from_currency, to_currency, date)` | — |

---

## 13. ETFs

### Objetivo
Exchange-Traded Funds — nacionais (B3) e internacionais. Compartilham estrutura de cotação mas têm metadados específicos.

### Tabelas

#### `etf_asset`

| Coluna | Tipo | Descrição |
|---|---|---|
| `ticker` | `TEXT PK` | "BOVA11", "IVVB11", "SPY" |
| `name` | `TEXT` | — |
| `exchange` | `TEXT` | `B3`, `NYSE`, `NASDAQ` |
| `currency` | `CHAR(3)` | — |
| `index_tracked` | `TEXT` | "Ibovespa", "S&P 500" |
| `expense_ratio` | `NUMERIC(8,4)` | Taxa de administração (%) |
| `issuer` | `TEXT` | "Blackrock", "Itaú Asset" |
| `inception_date` | `DATE` | — |
| `aum` | `NUMERIC(22,2)` | Assets under management |
| `is_active` | `BOOLEAN` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

> Cotações reutilizam `b3_quote` ou `us_quote` conforme `exchange`.

---

## 14. Criptomoedas

### Objetivo
Rastrear posições em criptoativos com cotação em BRL e USD, suporte a múltiplas carteiras (exchange, cold wallet).

### Tabelas

#### `crypto_asset`

| Coluna | Tipo | Descrição |
|---|---|---|
| `symbol` | `TEXT PK` | "BTC", "ETH", "SOL" |
| `name` | `TEXT` | "Bitcoin" |
| `coingecko_id` | `TEXT` | ID na API CoinGecko |
| `rank` | `INT` | Rank por market cap |
| `category` | `TEXT` | `layer1`, `defi`, `stablecoin`, `nft` |
| `is_active` | `BOOLEAN` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `crypto_quote`

| Coluna | Tipo | Descrição |
|---|---|---|
| `symbol` | `TEXT FK → crypto_asset` | — |
| `timestamp` | `TIMESTAMPTZ` | — |
| `price_usd` | `NUMERIC(28,8)` | — |
| `price_brl` | `NUMERIC(28,8)` | — |
| `market_cap_usd` | `NUMERIC(28,2)` | — |
| `volume_24h_usd` | `NUMERIC(28,2)` | — |
| `change_24h_pct` | `NUMERIC(8,4)` | — |
| **PK** | `(symbol, timestamp)` | — |

#### `crypto_wallet`
Endereços de carteiras monitorados.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `portfolio_id` | `UUID FK → portfolio` | — |
| `name` | `TEXT` | "Ledger Nano" |
| `network` | `TEXT` | `bitcoin`, `ethereum`, `solana` |
| `address` | `TEXT` | Endereço público |
| `type` | `TEXT` | `exchange`, `cold_wallet`, `soft_wallet` |
| `exchange_name` | `TEXT` | "Binance", "Mercado Bitcoin" (se exchange) |
| `is_active` | `BOOLEAN` | — |
| `created_at` | `TIMESTAMPTZ` | — |

### Segurança
- `crypto_wallet.address` é dado público — sem restrição de exibição
- Chaves privadas JAMAIS armazenadas
- `crypto_quote` particionado por mês (alta frequência de inserção)

---

## 15. Renda Fixa

### Objetivo
Modelar títulos de renda fixa: Tesouro Direto, CDB, LCI, LCA, debentures, CRI, CRA. Cada tipo tem características de rentabilidade diferentes.

### Tabelas

#### `fixed_income_bond`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `portfolio_id` | `UUID FK → portfolio` | — |
| `name` | `TEXT` | "CDB Nubank 120% CDI" |
| `type` | `TEXT` | `tesouro_selic`, `tesouro_ipca`, `tesouro_prefixado`, `cdb`, `lci`, `lca`, `cri`, `cra`, `debenture`, `poupanca`, `other` |
| `issuer` | `TEXT` | "Tesouro Nacional", "Nubank" |
| `indexer` | `TEXT` | `cdi`, `selic`, `ipca`, `igpm`, `prefixado`, `none` |
| `rate` | `NUMERIC(8,4)` | % sobre indexador (ex: 120.00 para 120% CDI) |
| `fixed_rate` | `NUMERIC(8,4)` | Taxa prefixada anual (se prefixado) |
| `invested_amount` | `NUMERIC(18,2)` | Valor investido |
| `current_value` | `NUMERIC(18,2)` | Valor atualizado |
| `gross_return` | `NUMERIC(18,2)` | Rendimento bruto |
| `net_return` | `NUMERIC(18,2)` | Rendimento líquido (após IR/IOF) |
| `ir_rate` | `NUMERIC(8,4)` | Alíquota IR aplicada |
| `purchase_date` | `DATE` | — |
| `maturity_date` | `DATE` | Data de vencimento |
| `liquidity` | `TEXT` | `daily`, `on_maturity`, `custom` |
| `is_tax_exempt` | `BOOLEAN` | LCI/LCA/CRI/CRA = true |
| `is_fgc_covered` | `BOOLEAN` | Cobertura FGC (até R$ 250k) |
| `institution_id` | `UUID FK → institution` | Custodiante |
| `external_id` | `TEXT` | ID na corretora |
| `origin` | `TEXT` | `manual`, `import`, `open_finance` |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

#### `fixed_income_snapshot`
Histórico de valor atualizado para gráfico de evolução.

| Coluna | Tipo | Descrição |
|---|---|---|
| `bond_id` | `UUID FK → fixed_income_bond` | — |
| `date` | `DATE` | — |
| `value` | `NUMERIC(18,2)` | — |
| **PK** | `(bond_id, date)` | — |

### Segurança
- RLS por `user_id`
- IR calculado internamente — nunca assumir dados fiscais sem validação

---

## 16. Dividendos

### Objetivo
Registrar histórico de proventos pagos por ações, FIIs e ETFs. Fonte de renda passiva no dashboard.

### Tabelas

#### `dividend`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `ticker` | `TEXT` | Ativo |
| `asset_type` | `TEXT` | `stock_br`, `fii`, `stock_us`, `etf` |
| `ex_date` | `DATE` | Data ex-dividendo |
| `payment_date` | `DATE` | Data de pagamento |
| `type` | `TEXT` | `dividendo`, `jcp`, `rendimento`, `amortizacao`, `subscricao` |
| `amount_per_share` | `NUMERIC(18,8)` | Valor por cota/ação |
| `currency` | `CHAR(3)` | — |
| `source` | `TEXT` | Origem do dado (API, B3 scraping) |
| **UK** | `(ticker, ex_date, type)` | — |

#### `user_dividend_receipt`
Valores efetivamente recebidos pelo usuário (com base em posição na data ex).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `portfolio_id` | `UUID FK → portfolio` | — |
| `dividend_id` | `UUID FK → dividend` | — |
| `ticker` | `TEXT` | — |
| `quantity_held` | `NUMERIC(18,8)` | Quantidade na data ex |
| `total_received` | `NUMERIC(18,2)` | Valor total recebido |
| `ir_withheld` | `NUMERIC(18,2)` | IR retido (JCP, ações US) |
| `received_at` | `DATE` | — |
| `credited_to_account_id` | `UUID FK → financial_account` | — |

### Segurança
- `dividend` é catálogo público — sem RLS de escrita
- `user_dividend_receipt` com RLS por `user_id`

### Escalabilidade
- `user_dividend_receipt` calculado automaticamente ao processar `dividend`
- Índice em `(user_id, received_at DESC)` para dashboard de renda passiva

---

## 17. Metas Financeiras

### Objetivo
Permitir que o usuário defina metas (reserva de emergência, viagem, aposentadoria) com acompanhamento de progresso.

### Tabelas

#### `goal`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `name` | `TEXT` | "Reserva de Emergência" |
| `description` | `TEXT` | — |
| `type` | `TEXT` | `emergency_fund`, `travel`, `education`, `retirement`, `home`, `vehicle`, `other` |
| `icon` | `TEXT` | — |
| `color` | `CHAR(7)` | — |
| `target_amount` | `NUMERIC(18,2)` | Valor alvo |
| `current_amount` | `NUMERIC(18,2)` | Valor acumulado atual |
| `target_date` | `DATE` | Prazo desejado |
| `monthly_contribution` | `NUMERIC(18,2)` | Contribuição mensal projetada |
| `linked_account_id` | `UUID FK → financial_account` | Conta vinculada à meta |
| `status` | `TEXT` | `active`, `achieved`, `cancelled`, `paused` |
| `achieved_at` | `TIMESTAMPTZ` | — |
| `priority` | `SMALLINT` | 1 = maior prioridade |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

#### `goal_contribution`
Histórico de aportes na meta.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `goal_id` | `UUID FK → goal` | — |
| `user_id` | `UUID FK → profile` | — |
| `amount` | `NUMERIC(18,2)` | — |
| `date` | `DATE` | — |
| `note` | `TEXT` | — |
| `created_at` | `TIMESTAMPTZ` | — |

### Segurança
- RLS por `user_id`
- `current_amount` atualizado por trigger ao inserir `goal_contribution`

---

## 18. Planejamento de Aposentadoria

### Objetivo
Simulação e acompanhamento do plano de independência financeira/aposentadoria com projeções atuariais e de rentabilidade.

### Tabelas

#### `retirement_plan`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `name` | `TEXT` | "Plano FIRE" |
| `target_monthly_income` | `NUMERIC(18,2)` | Renda passiva mensal desejada |
| `expected_return_rate` | `NUMERIC(8,4)` | Taxa real de retorno esperada (% a.a.) |
| `inflation_rate` | `NUMERIC(8,4)` | Inflação projetada (% a.a.) |
| `current_age` | `SMALLINT` | — |
| `target_age` | `SMALLINT` | Idade alvo para aposentadoria |
| `life_expectancy` | `SMALLINT` | Expectativa de vida (padrão: 90) |
| `current_net_worth` | `NUMERIC(18,2)` | Patrimônio atual |
| `monthly_contribution` | `NUMERIC(18,2)` | Aporte mensal atual |
| `target_patrimony` | `NUMERIC(18,2)` | Patrimônio necessário (calculado) |
| `projected_date` | `DATE` | Data projetada de atingimento |
| `fire_number` | `NUMERIC(18,2)` | Número FIRE (25x gastos anuais) |
| `safe_withdrawal_rate` | `NUMERIC(8,4)` | Taxa de retirada segura (padrão: 4%) |
| `social_security_income` | `NUMERIC(18,2)` | Benefício INSS esperado |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `retirement_projection_snapshot`
Histórico de projeções recalculadas ao longo do tempo.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `plan_id` | `UUID FK → retirement_plan` | — |
| `date` | `DATE` | Data do cálculo |
| `projected_patrimony_at_target_age` | `NUMERIC(18,2)` | — |
| `months_to_fire` | `INT` | — |
| `fire_date` | `DATE` | — |
| `data` | `JSONB` | Tabela anual completa de projeção |
| `created_at` | `TIMESTAMPTZ` | — |

---

## 19. IA Financeira

### Objetivo
Persistir contexto, histórico de conversas, insights gerados, categorizações automáticas e modelos de score financeiro para o Copiloto IA.

### Tabelas

#### `ai_conversation`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `title` | `TEXT` | Título gerado automaticamente |
| `model` | `TEXT` | "claude-3-7-sonnet" |
| `context` | `TEXT` | `dashboard`, `transactions`, `investments` |
| `message_count` | `INT` | — |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |
| `deleted_at` | `TIMESTAMPTZ` | — |

#### `ai_message`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `conversation_id` | `UUID FK → ai_conversation` | — |
| `user_id` | `UUID FK → profile` | — |
| `role` | `TEXT` | `user`, `assistant`, `system` |
| `content` | `TEXT` | Conteúdo da mensagem |
| `tokens_used` | `INT` | Tokens consumidos |
| `model` | `TEXT` | Modelo usado |
| `created_at` | `TIMESTAMPTZ` | — |

#### `ai_insight`
Insights proativos gerados pelo Copiloto.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `type` | `TEXT` | `alert`, `opportunity`, `tip`, `anomaly` |
| `title` | `TEXT` | — |
| `description` | `TEXT` | — |
| `severity` | `TEXT` | `low`, `medium`, `high` |
| `context_data` | `JSONB` | Dados que geraram o insight |
| `is_read` | `BOOLEAN` | — |
| `is_dismissed` | `BOOLEAN` | — |
| `action_url` | `TEXT` | Deep link para ação |
| `expires_at` | `TIMESTAMPTZ` | — |
| `created_at` | `TIMESTAMPTZ` | — |

#### `ai_categorization_log`
Rastreia categorizações automáticas para re-treinamento.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `transaction_id` | `UUID FK → transaction` | — |
| `user_id` | `UUID FK → profile` | — |
| `suggested_category_id` | `UUID FK → category` | — |
| `confidence_score` | `NUMERIC(5,4)` | 0.0 – 1.0 |
| `accepted` | `BOOLEAN` | Usuário aceitou? |
| `overridden_category_id` | `UUID FK → category` | Categoria corrigida |
| `created_at` | `TIMESTAMPTZ` | — |

#### `ai_financial_score`
Score de saúde financeira calculado mensalmente.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `date` | `DATE` | Mês de referência |
| `overall_score` | `NUMERIC(5,2)` | 0–1000 |
| `savings_score` | `NUMERIC(5,2)` | — |
| `investment_score` | `NUMERIC(5,2)` | — |
| `debt_score` | `NUMERIC(5,2)` | — |
| `diversification_score` | `NUMERIC(5,2)` | — |
| `emergency_fund_score` | `NUMERIC(5,2)` | — |
| `breakdown` | `JSONB` | Detalhamento completo |
| `created_at` | `TIMESTAMPTZ` | — |

### Segurança
- RLS por `user_id` em todas as tabelas
- `ai_message.content` criptografado em repouso via `pgsodium` (Supabase)
- Tokens consumidos auditados para controle de custo por usuário

---

## 20. Notícias e Conteúdo

### Objetivo
Curadoria de notícias financeiras relevantes com análise de sentimento e vinculação a ativos do portfólio do usuário.

### Tabelas

#### `news_article`
Catálogo de artigos (dado compartilhado).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `title` | `TEXT` | — |
| `summary` | `TEXT` | Resumo gerado por IA |
| `url` | `TEXT` | Link original |
| `source` | `TEXT` | "InfoMoney", "Valor Econômico" |
| `published_at` | `TIMESTAMPTZ` | — |
| `sentiment` | `TEXT` | `positive`, `neutral`, `negative` |
| `sentiment_score` | `NUMERIC(5,4)` | -1.0 a +1.0 |
| `category` | `TEXT` | `macro`, `stocks`, `crypto`, `real_estate` |
| `tickers` | `TEXT[]` | Ativos mencionados |
| `created_at` | `TIMESTAMPTZ` | — |

#### `user_news_interaction`

| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | `UUID FK → profile` | — |
| `article_id` | `UUID FK → news_article` | — |
| `is_saved` | `BOOLEAN` | — |
| `is_read` | `BOOLEAN` | — |
| `read_at` | `TIMESTAMPTZ` | — |
| **PK** | `(user_id, article_id)` | — |

### Escalabilidade
- `news_article` purge automático de artigos > 90 dias não salvos
- `tickers` com índice GIN para busca eficiente de artigos por ativo

---

## 21. Integrações Futuras

### Objetivo
Estrutura extensível para conectores externos: importação OFX/CSV, integração com corretoras, ERP pessoal.

### Tabelas

#### `integration`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `type` | `TEXT` | `ofx_import`, `csv_import`, `broker_api`, `erp`, `spreadsheet` |
| `name` | `TEXT` | "Importação OFX Itaú" |
| `provider` | `TEXT` | "itau", "btg", "xp", "custom" |
| `config` | `JSONB` | Configurações (sem credenciais) |
| `credentials_ref` | `TEXT` | Referência ao Vault (nunca inline) |
| `status` | `TEXT` | `active`, `error`, `disabled` |
| `last_sync_at` | `TIMESTAMPTZ` | — |
| `last_error` | `TEXT` | — |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `import_job`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `integration_id` | `UUID FK → integration` | — |
| `user_id` | `UUID FK → profile` | — |
| `status` | `TEXT` | `queued`, `processing`, `completed`, `failed` |
| `source_file` | `TEXT` | Path no Storage |
| `records_total` | `INT` | — |
| `records_imported` | `INT` | — |
| `records_skipped` | `INT` | — |
| `records_failed` | `INT` | — |
| `error_log` | `JSONB` | Linhas com erro |
| `started_at` | `TIMESTAMPTZ` | — |
| `completed_at` | `TIMESTAMPTZ` | — |
| `created_at` | `TIMESTAMPTZ` | — |

### Segurança
- Credenciais NUNCA em `config` — apenas referência ao Supabase Vault
- `source_file` aponta para Storage com URL assinada (expiração: 24h)

---

## 22. Open Finance

### Objetivo
Modelar a integração com o ecossistema Open Finance Brasil (Resolução BCB nº 32/2020), permitindo leitura de contas, transações e investimentos de múltiplas instituições via consentimento do usuário.

### Tabelas

#### `open_finance_consent`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `institution_id` | `UUID FK → institution` | — |
| `consent_id` | `TEXT` | ID do consentimento no ecossistema OFB |
| `status` | `TEXT` | `awaiting_authorisation`, `authorised`, `rejected`, `revoked`, `expired` |
| `permissions` | `TEXT[]` | Ex: `ACCOUNTS_READ`, `TRANSACTIONS_READ` |
| `expiration_date` | `TIMESTAMPTZ` | — |
| `granted_at` | `TIMESTAMPTZ` | — |
| `revoked_at` | `TIMESTAMPTZ` | — |
| `created_at` | `TIMESTAMPTZ` | — |

#### `open_finance_account`
Contas bancárias descobertas via Open Finance.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `consent_id` | `UUID FK → open_finance_consent` | — |
| `user_id` | `UUID FK → profile` | — |
| `external_account_id` | `TEXT` | ID na instituição financeira |
| `type` | `TEXT` | `CACC` (corrente), `SVGS` (poupança), `TRAN` |
| `currency` | `CHAR(3)` | — |
| `balance` | `NUMERIC(18,2)` | — |
| `balance_date` | `DATE` | — |
| `raw_data` | `JSONB` | Payload original da API OFB |
| `linked_account_id` | `UUID FK → financial_account` | Conta interna vinculada |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `open_finance_transaction`
Transações importadas via Open Finance.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `open_finance_account_id` | `UUID FK → open_finance_account` | — |
| `user_id` | `UUID FK → profile` | — |
| `external_transaction_id` | `TEXT` | ID único na instituição |
| `type` | `TEXT` | `DEBIT`, `CREDIT` |
| `amount` | `NUMERIC(18,2)` | — |
| `date` | `DATE` | — |
| `description` | `TEXT` | — |
| `raw_data` | `JSONB` | — |
| `linked_transaction_id` | `UUID FK → transaction` | Transação interna vinculada |
| `status` | `TEXT` | `imported`, `linked`, `ignored` |
| `created_at` | `TIMESTAMPTZ` | — |

### Segurança
- Tokens de acesso OAuth armazenados no Supabase Vault (nunca no banco)
- `raw_data` criptografado com `pgsodium`
- Consentimento revogável pelo usuário a qualquer momento

---

## 23. Sincronizações Automáticas

### Objetivo
Rastrear e auditar todas as sincronizações automáticas de dados (cotações, OFB, dividendos, câmbio).

### Tabelas

#### `sync_job`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `type` | `TEXT` | `market_quotes`, `fx_rates`, `dividends`, `open_finance`, `net_worth` |
| `status` | `TEXT` | `queued`, `running`, `completed`, `failed`, `partial` |
| `scope` | `JSONB` | Ex: `{"tickers": ["PETR4","VALE3"]}` |
| `records_processed` | `INT` | — |
| `records_failed` | `INT` | — |
| `duration_ms` | `INT` | — |
| `error_message` | `TEXT` | — |
| `triggered_by` | `TEXT` | `cron`, `webhook`, `manual`, `user_request` |
| `started_at` | `TIMESTAMPTZ` | — |
| `completed_at` | `TIMESTAMPTZ` | — |
| `created_at` | `TIMESTAMPTZ` | — |

#### `user_sync_status`
Status de sincronização por usuário (para Open Finance).

| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | `UUID FK → profile` | — |
| `type` | `TEXT` | — |
| `last_sync_at` | `TIMESTAMPTZ` | — |
| `next_sync_at` | `TIMESTAMPTZ` | — |
| `status` | `TEXT` | — |
| `error_count` | `SMALLINT` | Erros consecutivos |
| **PK** | `(user_id, type)` | — |

### Escalabilidade
- `sync_job` purge automático de registros > 30 dias
- Backoff exponencial ao atingir `error_count >= 3`

---

## 24. Auditoria

### Objetivo
Registrar toda mudança de dados sensíveis para compliance, debugging e detecção de fraude. Schema separado para não contaminar queries de produção.

### Schema: `audit`

#### `audit.log`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL PK` | — |
| `schema_name` | `TEXT` | Schema da tabela auditada |
| `table_name` | `TEXT` | Tabela auditada |
| `operation` | `TEXT` | `INSERT`, `UPDATE`, `DELETE` |
| `user_id` | `UUID` | `auth.uid()` no momento da operação |
| `row_id` | `UUID` | PK da linha afetada |
| `old_data` | `JSONB` | Estado anterior (UPDATE/DELETE) |
| `new_data` | `JSONB` | Estado novo (INSERT/UPDATE) |
| `changed_fields` | `TEXT[]` | Campos alterados (UPDATE) |
| `ip_address` | `INET` | IP do cliente |
| `user_agent` | `TEXT` | — |
| `created_at` | `TIMESTAMPTZ` | — |

### Tabelas auditadas (via trigger)
- `transaction` — INSERT, UPDATE, DELETE
- `investment_transaction` — todas
- `open_finance_consent` — todas
- `profile` — UPDATE (dados pessoais)
- `plan_subscription` — todas
- `credit_card` — INSERT, DELETE
- `liability` — todas

### Segurança
- Schema `audit` inacessível via RLS de usuário comum
- Trigger `audit_trigger_func` com `SECURITY DEFINER`
- Logs imutáveis — sem UPDATE/DELETE em `audit.log`
- Retenção: 7 anos (obrigação legal brasileira — LGPD + Banco Central)

### Escalabilidade
- Particionamento por mês em `audit.log`
- Compressão de `old_data`/`new_data` via `jsonb` com `pg_compress` após 90 dias

---

## 25. Planos Free / Premium

### Objetivo
Controle de assinaturas, limites por plano e feature flags. Suporte a múltiplos planos com upgrades/downgrades.

### Tabelas

#### `plan`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `name` | `TEXT` | "Free", "Premium", "Enterprise" |
| `slug` | `TEXT UK` | `free`, `premium`, `enterprise` |
| `price_monthly` | `NUMERIC(10,2)` | — |
| `price_yearly` | `NUMERIC(10,2)` | — |
| `currency` | `CHAR(3)` | `BRL` |
| `features` | `JSONB` | Objeto de feature flags e limites |
| `is_active` | `BOOLEAN` | — |
| `sort_order` | `SMALLINT` | — |
| `created_at` | `TIMESTAMPTZ` | — |

**Exemplo de `plan.features`:**
```json
{
  "max_accounts": 2,
  "max_credit_cards": 1,
  "max_goals": 3,
  "ai_messages_per_month": 20,
  "open_finance": false,
  "advanced_reports": false,
  "investment_tracking": false,
  "export_csv": false,
  "priority_support": false
}
```

#### `plan_subscription`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PK` | — |
| `user_id` | `UUID FK → profile` | — |
| `plan_id` | `UUID FK → plan` | — |
| `status` | `TEXT` | `trialing`, `active`, `past_due`, `cancelled`, `expired` |
| `billing_cycle` | `TEXT` | `monthly`, `yearly` |
| `current_period_start` | `TIMESTAMPTZ` | — |
| `current_period_end` | `TIMESTAMPTZ` | — |
| `trial_end` | `TIMESTAMPTZ` | — |
| `cancelled_at` | `TIMESTAMPTZ` | — |
| `payment_provider` | `TEXT` | `stripe`, `hotmart`, `manual` |
| `external_subscription_id` | `TEXT` | ID no payment provider |
| `external_customer_id` | `TEXT` | — |
| `created_at` | `TIMESTAMPTZ` | — |
| `updated_at` | `TIMESTAMPTZ` | — |

#### `plan_usage`
Consumo mensal por feature (para enforcement de limites).

| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | `UUID FK → profile` | — |
| `month` | `DATE` | Primeiro dia do mês |
| `ai_messages_used` | `INT` | — |
| `accounts_count` | `INT` | — |
| `credit_cards_count` | `INT` | — |
| `goals_count` | `INT` | — |
| `exports_count` | `INT` | — |
| **PK** | `(user_id, month)` | — |

### Relacionamentos
- `profile.plan_id` → `plan` (plano ativo — denormalizado para leitura rápida)
- `plan_subscription` é o histórico completo
- `plan_usage` atualizado por trigger ao inserir/deletar registros

### Segurança
- `plan_subscription` com RLS: usuário lê apenas o próprio; escrita apenas via service role
- `plan.features` lido pelo middleware para validar permissões antes de qualquer operação
- `external_subscription_id` nunca exposto via API pública

### Escalabilidade
- Feature flags via `plan.features JSONB` — novos recursos sem migration
- Verificação de limites via função PostgreSQL `check_plan_limit(user_id, feature)` chamada antes de INSERT críticos

---

## Diagrama de Relacionamentos (resumido)

```
auth.users
    └── profile (1:1)
            ├── user_preference (1:1)
            ├── plan_subscription (1:N)
            ├── financial_account (1:N)
            │       └── transaction (1:N)
            │               ├── category (N:1)
            │               ├── installment_group (N:1)
            │               └── recurrence (N:1)
            ├── credit_card (1:N)
            │       └── credit_card_invoice (1:N)
            ├── portfolio (1:N)
            │       ├── investment_position (1:N)
            │       ├── investment_transaction (1:N)
            │       └── fixed_income_bond (1:N)
            ├── goal (1:N)
            ├── retirement_plan (1:1)
            ├── ai_conversation (1:N)
            ├── ai_insight (1:N)
            └── open_finance_consent (1:N)
                    └── open_finance_account (1:N)
                            └── open_finance_transaction (1:N)

Dados de mercado (compartilhados, sem RLS de escrita):
    institution
    b3_asset / b3_quote
    fii_asset
    us_asset / us_quote
    etf_asset
    crypto_asset / crypto_quote
    fx_rate
    dividend
    news_article
    plan
```

---

## Decisões Arquiteturais Chave

| Decisão | Escolha | Justificativa |
|---|---|---|
| IDs | UUID v4 | Evita exposição de sequência; compatível com multi-tenant |
| Soft delete | `deleted_at` | Preserva histórico; LGPD exige direito ao esquecimento controlado |
| Valores monetários | `NUMERIC(18,2)` | Elimina erros de ponto flutuante em cálculos financeiros |
| Saldos | Desnormalizados | Performance: evita `SUM()` em tabelas de transação a cada request |
| RLS | Em todas as tabelas | Zero-trust: dados de usuários nunca acessíveis por outros |
| Cotações | Tabelas separadas | Separação clara entre dados de usuário e dados de mercado |
| JSONB | Campos extensíveis | `features`, `config`, `raw_data` — evita migrações frequentes |
| Schema audit | Separado | Não contamina queries; permissões independentes |
| Credenciais | Supabase Vault | Nunca armazenadas em colunas de banco de dados |
| Particionamento | Por data | `transaction`, `b3_quote`, `audit.log` — mantém performance em escala |

---

## Próximos Passos (Sprint 4.2+)

1. **Sprint 4.2** — SQL de criação do core (profile, financial_account, transaction, category)
2. **Sprint 4.3** — SQL de investimentos (portfolio, position, b3_asset, crypto)
3. **Sprint 4.4** — Policies de RLS e triggers
4. **Sprint 4.5** — Seed data (institution, category padrão, plan)
5. **Sprint 4.6** — Edge Functions para jobs agendados

---

*Documento gerado em 2026-06-28 · Copiloto Financeiro IA · Database Blueprint v1*
