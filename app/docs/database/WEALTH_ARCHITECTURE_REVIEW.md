# Wealth & Investment Architecture Review
## Copiloto Financeiro IA — Sprint 6.1.1

> **Tipo:** Revisão arquitetural  
> **Data:** 2026-06-29  
> **Escopo:** Patrimônio + Investimentos  
> **Migrations existentes:** 001–005  
> **Status:** Planejamento — nenhuma migration criada neste documento

---

## 1. O que já existe

### Tabelas implementadas relevantes para patrimônio

| Tabela | Migration | Cobertura |
|---|---|---|
| `public.manual_asset` | 005 | Ativos manuais com tipo, valor atual, valor de aquisição, data de aquisição, custodiante |
| `public.financial_account` | 001 | Contas bancárias e de investimento (`type = 'investment'`); vinculadas a `institution` |
| `public.transaction` | 001 | Movimentações financeiras; `origin IN ('manual','open_finance','import','ai_suggestion')` |
| `public.net_worth_snapshot` | 001 | Snapshot periódico agregado de patrimônio líquido (campos: `total_assets`, `investment_balance`, `real_estate_value`, etc.) |
| `public.institution` | 001 | Catálogo de bancos e corretoras (seed data) |

### Campos relevantes já modelados

- **Multi-moeda:** `manual_asset.currency`, `transaction.currency` — cada registro tem moeda própria
- **Soft delete:** `deleted_at` em `manual_asset`, `financial_account`, `transaction`
- **Origem de dados:** `transaction.origin` aceita `'open_finance'` — base para integração futura
- **Custódia parcial:** `financial_account` com `institution_id` cobre custódia de conta de investimento
- **RLS:** Todos os dados de usuário têm Row Level Security ativa

---

## 2. Cobertura por requisito

| Requisito | Status | O que existe | O que falta |
|---|---|---|---|
| 1. Ativos manuais | ✅ Implementado | `manual_asset` completo | — |
| 2. Ações brasileiras | ❌ Não modelado | — | `b3_asset`, `investment_position`, `investment_transaction` |
| 3. FIIs | ❌ Não modelado | — | `fii_asset` (extensão de `b3_asset`) |
| 4. ETFs | ❌ Não modelado | — | `etf_asset`, mesmas tabelas de posição |
| 5. BDRs | ❌ Não modelado | — | `b3_asset` com `asset_subtype = 'bdr'` |
| 6. Ações americanas | ❌ Não modelado | — | `us_asset`, `us_quote` |
| 7. Criptomoedas | ❌ Não modelado | — | `crypto_asset`, `crypto_quote`, `crypto_wallet` |
| 8. Renda fixa | ❌ Não modelado | — | `fixed_income_bond`, `fixed_income_snapshot` |
| 9. Tesouro Direto | ❌ Não modelado | — | Subconjunto de `fixed_income_bond` (`issuer = 'tesouro_nacional'`) |
| 10. Dividendos/proventos | ❌ Não modelado | — | `dividend` ou eventos em `investment_transaction` |
| 11. Custódia por corretora | ⚠️ Parcial | `financial_account.institution_id` cobre conta; sem `portfolio` dedicado | `portfolio` vinculado a `financial_account` |
| 12. Multi-moeda | ⚠️ Parcial | Cada registro tem `currency`; sem tabela de câmbio | `fx_rate` para consolidação em BRL |
| 13. Histórico de preços | ❌ Não modelado | — | `b3_quote`, `us_quote`, `crypto_quote`, `fixed_income_snapshot` |
| 14. Rentabilidade | ❌ Não modelado | — | Derivado: posição + preço histórico + preço atual |
| 15. Alocação patrimonial | ⚠️ Parcial | `manual_asset` por tipo; sem posições rastreadas | Agrega `manual_asset` + `investment_position` + `financial_account.balance` |
| 16. Integração Open Finance | ⚠️ Planejado | `transaction.origin = 'open_finance'` na tabela | `open_finance_consent`, `open_finance_account`, `open_finance_transaction` |

---

## 3. Lacunas arquiteturais críticas

### L1 — Ausência de tabela de câmbio (`fx_rate`)
**Impacto alto.** Sem taxa de câmbio histórica, é impossível consolidar o patrimônio total em BRL quando o usuário tem ativos em USD, BTC, EUR. A soma de `manual_asset.current_value` hoje é semanticamente errada para portfólios multi-moeda.

### L2 — Sem modelo de posição de investimentos
**Impacto alto.** `manual_asset` cobre estimativas manuais, mas não rastreia quantidade de cotas/ações, preço médio de compra, eventos corporativos (splits, bonificações) ou movimentações de compra/venda. Uma ação comprada em 3 lotes a preços diferentes exige uma tabela de operações (`investment_transaction`) e posição consolidada (`investment_position`).

### L3 — `net_worth_snapshot` desatualizado como agregador
**Impacto médio.** A tabela tem campos fixos (`real_estate_value`, `investment_balance`, etc.) que não mapeiam para `manual_asset.asset_type`. Quando as tabelas de investimento existirem, o snapshot precisará ser recalculado de forma diferente. Os campos atuais virarão deadcode.

### L4 — Renda fixa requer modelo próprio
**Impacto alto.** CDB, LCI, LCA, Tesouro têm características únicas: taxa contratada, indexador (CDI, IPCA, Selic), vencimento, IOF regressivo, IR regressivo, carência. Um campo `asset_type = 'fixed_income'` em `manual_asset` não captura isso. Para rentabilidade real, precisa de `fixed_income_bond`.

### L5 — Dividendos/proventos são eventos, não posições
**Impacto médio.** Dividendos de ações e rendimentos de FIIs precisam de tabela própria com `ex_date`, `payment_date`, `amount_per_share`, `type` (JCP, dividendo, rendimento, amortização). Não podem ser apenas transações comuns, pois precisam ser vinculados ao ativo (`b3_asset.id`) para cálculo de DY.

### L6 — Sobreposição semântica: `manual_asset` vs futuro `investment_position`
**Impacto médio.** Hoje um usuário pode cadastrar "PETR4" como `manual_asset` com `asset_type = 'stock'`. Quando implementarmos `investment_position`, esse registro vira obsoleto mas não há migration path definido. Risco de dados duplicados.

---

## 4. Proposta de tabelas futuras

### 4.1 Dados de mercado (compartilhados, sem RLS de usuário)

#### `public.fx_rate`
```sql
-- Taxa de câmbio diária (par from_currency/to_currency)
id           UUID PK
from_currency CHAR(3)    -- BRL, USD, EUR, BTC...
to_currency   CHAR(3)    -- sempre BRL para consolidação
rate          NUMERIC(18,8)  -- câmbio de compra
date          DATE
source        TEXT       -- 'bcb', 'coinbase', 'manual'
created_at    TIMESTAMPTZ
UNIQUE (from_currency, to_currency, date)
```

#### `public.b3_asset`
```sql
-- Catálogo de ativos listados na B3 (ações, BDRs, Units, FIIs, ETFs)
id           UUID PK
ticker       CHAR(10) UNIQUE  -- PETR4, KNRI11, BOVA11, AAPL34
name         TEXT             -- Petróleo Brasileiro S.A. - Petrobras
asset_type   TEXT CHECK IN ('stock','fii','etf','bdr','unit','debenture')
sector       TEXT             -- Energia, Financeiro, etc.
segment      TEXT             -- FII: Logística, Papel, etc.
is_active    BOOLEAN
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

#### `public.b3_quote`
```sql
-- Cotações diárias OHLCV de ativos B3
id           BIGSERIAL PK  -- não UUID: volume muito alto
asset_id     UUID FK → b3_asset
date         DATE
open         NUMERIC(18,4)
high         NUMERIC(18,4)
low          NUMERIC(18,4)
close        NUMERIC(18,4)
volume       BIGINT
-- Índice: (asset_id, date DESC) — consultas por ativo + janela temporal
UNIQUE (asset_id, date)
-- Particionado por mês (alto volume)
```

#### `public.fii_asset`
```sql
-- Metadados específicos de FIIs (extensão de b3_asset)
asset_id        UUID PK FK → b3_asset
segment         TEXT   -- Logística, Lajes, Shopping, Papel, Híbrido
p_vpa           NUMERIC(6,4)   -- Preço/Valor Patrimonial
dividend_yield  NUMERIC(6,4)   -- DY dos últimos 12m
vacancy_rate    NUMERIC(5,2)   -- % de vacância
properties_count INT
updated_at      TIMESTAMPTZ
```

#### `public.dividend`
```sql
-- Eventos de dividendos, JCP e rendimentos (B3 + US)
id             UUID PK
asset_id       UUID FK → b3_asset  -- NULL para US assets (futuro)
type           TEXT CHECK IN ('dividendo','jcp','rendimento','amortizacao','bonificacao')
amount_per_share NUMERIC(18,6)
currency       CHAR(3)
ex_date        DATE    -- data ex-dividendo (quem tem na carteira neste dia recebe)
payment_date   DATE
announced_at   TIMESTAMPTZ
source         TEXT    -- 'b3', 'manual'
created_at     TIMESTAMPTZ
UNIQUE (asset_id, type, ex_date)
```

#### `public.crypto_asset`
```sql
id           UUID PK
symbol       TEXT UNIQUE  -- BTC, ETH, SOL
name         TEXT         -- Bitcoin, Ethereum
coingecko_id TEXT         -- para integração futura com API
category     TEXT         -- Layer1, DeFi, Stablecoin, etc.
is_active    BOOLEAN
```

#### `public.crypto_quote`
```sql
asset_id   UUID FK → crypto_asset
date       DATE
close_usd  NUMERIC(24,8)
close_brl  NUMERIC(24,4)  -- desnormalizado para performance (evita JOIN com fx_rate)
UNIQUE (asset_id, date)
```

---

### 4.2 Dados do usuário (com RLS)

#### `public.portfolio`
```sql
-- Carteira de investimentos: agrupa posições por corretora
id                UUID PK
user_id           UUID FK → profile
financial_account_id UUID FK → financial_account (type = 'investment')
name              TEXT       -- "Carteira XP", "Carteira Rico"
currency          CHAR(3) DEFAULT 'BRL'
notes             TEXT
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
deleted_at        TIMESTAMPTZ
```

#### `public.investment_position`
```sql
-- Posição atual desnormalizada por ativo (atualizada após cada operação)
id             UUID PK
user_id        UUID FK → profile
portfolio_id   UUID FK → portfolio
b3_asset_id    UUID FK → b3_asset (NULL para cripto, renda fixa)
crypto_asset_id UUID FK → crypto_asset (NULL para B3)
fixed_income_id UUID FK → fixed_income_bond (NULL para variável)
ticker         TEXT    -- desnormalizado para queries rápidas
quantity       NUMERIC(18,8)  -- cotas/ações (decimal para ETFs, FIIs)
avg_price      NUMERIC(18,6)  -- preço médio de compra
total_cost     NUMERIC(18,2)  -- quantity × avg_price
current_value  NUMERIC(18,2)  -- atualizado por job agendado
currency       CHAR(3)
last_updated   TIMESTAMPTZ
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
UNIQUE (portfolio_id, b3_asset_id)
UNIQUE (portfolio_id, crypto_asset_id)
```

#### `public.investment_transaction`
```sql
-- Histórico de operações: compra, venda, eventos corporativos
id             UUID PK
user_id        UUID FK → profile
portfolio_id   UUID FK → portfolio
position_id    UUID FK → investment_position
b3_asset_id    UUID FK → b3_asset (NULL se cripto/renda fixa)
crypto_asset_id UUID FK → crypto_asset (NULL se B3)
type           TEXT CHECK IN ('buy','sell','split','reverse_split',
                              'bonification','subscription','transfer_in','transfer_out')
quantity       NUMERIC(18,8)
unit_price     NUMERIC(18,6)
total_amount   NUMERIC(18,2)  -- quantity × unit_price
fees           NUMERIC(18,4)  -- corretagem + emolumentos
taxes          NUMERIC(18,4)  -- IR retido na fonte
currency       CHAR(3)
date           DATE
broker         TEXT           -- nome da corretora
notes          TEXT
origin         TEXT CHECK IN ('manual','import','open_finance')
external_id    TEXT
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
deleted_at     TIMESTAMPTZ
```

#### `public.fixed_income_bond`
```sql
-- Títulos de renda fixa com características contratuais
id                UUID PK
user_id           UUID FK → profile
portfolio_id      UUID FK → portfolio
name              TEXT     -- "CDB Nubank 120% CDI"
issuer_type       TEXT CHECK IN ('tesouro_nacional','bank','company','fgts')
issuer_name       TEXT     -- "Nubank", "XP", "BNDES"
bond_type         TEXT CHECK IN ('cdb','lci','lca','lc','cri','cra',
                                 'debenture','tesouro_selic','tesouro_ipca',
                                 'tesouro_prefixado','poupanca','other')
indexer           TEXT CHECK IN ('cdi','ipca','selic','igpm','prefixado','tr')
rate              NUMERIC(8,4)   -- ex: 12.5 = 12,5% ao ano OU 120.0 = 120% do CDI
invested_amount   NUMERIC(18,2)  -- valor aplicado inicialmente
current_value     NUMERIC(18,2)  -- atualizado periodicamente
currency          CHAR(3) DEFAULT 'BRL'
issue_date        DATE
maturity_date     DATE
grace_period_days INT            -- carência em dias
is_ir_exempt      BOOLEAN DEFAULT FALSE  -- LCI, LCA isentos de IR
custodian         TEXT   -- "Nubank", "XP", "Rico"
notes             TEXT
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
deleted_at        TIMESTAMPTZ
```

#### `public.fixed_income_snapshot`
```sql
-- Histórico de valor atualizado para gráfico de evolução
id              UUID PK
bond_id         UUID FK → fixed_income_bond
date            DATE
current_value   NUMERIC(18,2)
gross_yield_pct NUMERIC(8,4)   -- rendimento bruto acumulado %
net_yield_pct   NUMERIC(8,4)   -- rendimento líquido (após IR)
created_at      TIMESTAMPTZ
UNIQUE (bond_id, date)
```

---

## 5. Ordem recomendada de implementação

```
Fase 1 — Infraestrutura de mercado (sem UI de usuário)
  Sprint 6.2  → fx_rate                   (desbloqueia consolidação multi-moeda)
  Sprint 6.3  → b3_asset + b3_quote       (dados B3: ações, FIIs, BDRs, ETFs)
  Sprint 6.4  → fii_asset + dividend      (metadados FII + eventos de provento)

Fase 2 — Portfólio de variável renda variável
  Sprint 6.5  → portfolio + investment_position + investment_transaction
  Sprint 6.6  → UI: /wealth/portfolio (ações B3, FIIs, BDRs, ETFs)
  Sprint 6.7  → Cálculo de rentabilidade (TWR simplificado)

Fase 3 — Renda fixa
  Sprint 6.8  → fixed_income_bond + fixed_income_snapshot
  Sprint 6.9  → UI: /wealth/fixed-income

Fase 4 — Internacional + Cripto
  Sprint 6.10 → us_asset + us_quote       (opcional: só se tiver API de dados)
  Sprint 6.11 → crypto_asset + crypto_quote
  Sprint 6.12 → UI: /wealth/crypto

Fase 5 — Consolidação
  Sprint 6.13 → Atualizar net_worth_snapshot para agregar de todas as fontes:
                  manual_asset + financial_account.balance + investment_position
                  + fixed_income_bond.current_value
  Sprint 6.14 → UI: /wealth (visão consolidada total com alocação cross-assets)

Fase 6 — Open Finance (depende de parceiro)
  Sprint 6.15 → open_finance_consent + open_finance_account
  Sprint 6.16 → Importar investment_transaction via Open Finance
```

---

## 6. Riscos arquiteturais

### R1 — Sobreposição `manual_asset` vs `investment_position` [ALTO]
**Problema:** Usuário pode cadastrar "PETR4" em `manual_asset` agora, e depois o mesmo ativo aparece em `investment_position`. Dados duplicados, patrimônio inflado.

**Mitigação:**
- `manual_asset` deve ser claramente comunicado como "estimativa grosseira sem rastreamento de operações"
- Na UI de criação de `investment_position`, verificar se existe `manual_asset` com mesmo nome/ticker e oferecer migração
- Ao calcular patrimônio consolidado: excluir `manual_asset` do tipo `stock`/`fii`/`fixed_income`/`crypto` se o usuário tiver `portfolio` ativo (toggle no `user_preference`)

### R2 — Multi-moeda sem `fx_rate` [ALTO]
**Problema:** `manual_asset.current_value` em USD/BTC somado com BRL dá resultado matematicamente incorreto.

**Mitigação:**
- Implementar `fx_rate` na Sprint 6.2 antes de qualquer consolidação cross-moeda
- Enquanto não existir, exibir aviso na UI: "Ativos em moeda estrangeira não incluídos no total"
- Total exibido hoje em `/wealth` soma apenas BRL — documentar limitação [L1]

### R3 — `net_worth_snapshot` com schema rígido [MÉDIO]
**Problema:** Campos fixos (`real_estate_value`, `investment_balance`) não mapeiam para os tipos de `manual_asset`. Quando houver `investment_position`, o snapshot precisará de refactor.

**Mitigação:**
- Não depender de `net_worth_snapshot` para cálculos de UI — calcular on-demand via views
- Na Sprint 6.13, adicionar coluna `raw_breakdown JSONB` em `net_worth_snapshot` para guardar a decomposição detalhada sem quebrar schema antigo

### R4 — Volume de dados de cotações [MÉDIO]
**Problema:** `b3_quote` e `crypto_quote` podem acumular milhões de linhas rapidamente (5.000+ ativos × 250 pregões/ano = 1,25M linhas/ano só para B3).

**Mitigação:**
- Particionamento por mês desde o início (declarado em Sprint 6.3)
- Não usar UUID como PK em tabelas de cotação — usar BIGSERIAL
- Retenção configurável: manter apenas últimos 10 anos, arquivar dados mais antigos

### R5 — Renda fixa com indexador variável [MÉDIO]
**Problema:** Calcular o valor atual de um CDB 120% CDI exige a série histórica da taxa CDI, que varia diariamente. Sem isso, o `current_value` fica desatualizado.

**Mitigação:**
- Implementar `fixed_income_snapshot` com job agendado (Edge Function) que recalcula
- Para MVP, aceitar input manual de `current_value` pelo usuário (já presente em `fixed_income_bond.current_value`)
- Integração com API do Banco Central (PTAX, CDI, IPCA) na Fase 3

### R6 — Dividendos vs transações comuns [BAIXO]
**Problema:** Proventos de FIIs e JCP de ações poderiam ser modelados como `transaction` comum. Porém perdem rastreabilidade (qual ativo gerou, qual foi o DY, ex-date).

**Mitigação:**
- Manter `dividend` como tabela separada (dados de mercado, sem RLS)
- Quando o usuário recebe um provento, gerar `transaction` com link para `dividend.id` via campo extra (ou `transaction.notes` como workaround no MVP)

---

## 7. Decisões de design a confirmar

| Decisão | Opção A | Opção B | Recomendação |
|---|---|---|---|
| Ticker único para B3 + US | Tabela única `asset` com `market` field | Tabelas separadas `b3_asset` / `us_asset` | **B** — schemas diferentes, APIs diferentes |
| Cripto na posição | Unificar em `investment_position` com FK nullable | Tabela separada `crypto_position` | **A** — menos tabelas, FK nullable é padrão |
| Renda fixa na posição | FK em `investment_position` para `fixed_income_bond` | Tabela separada `fixed_income_position` | **Tabela separada** — modelo muito diferente (sem quantidade/preço unitário) |
| Atualização de preços | Edge Function agendada (Supabase) | Polling no cliente | **Edge Function** — evita abuse de API |
| `manual_asset` coexistência | Manter sempre | Deprecar ao migrar para `investment_position` | **Manter** — ativos como imóveis/veículos não têm cotação de mercado |

---

*Documento gerado em 2026-06-29 · Copiloto Financeiro IA · Wealth Architecture Review v1*
