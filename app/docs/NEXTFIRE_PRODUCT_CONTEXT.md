# NEXTFIRE PRODUCT CONTEXT

> **Leitura obrigatória no início de cada sessão de desenvolvimento.**
> Este documento define a identidade, a filosofia e as regras de ouro do NextFire.
> Nenhuma implementação deve começar sem que este documento tenha sido lido.

---

## 1. Visão do Produto

O NextFire **não é**:

- Um aplicativo de controle financeiro
- Um internet banking
- Um agregador de extratos

O NextFire é um **Wealth Operating System (Wealth OS)**.

Seu objetivo é atuar como um **consultor patrimonial inteligente**, utilizando IA para acompanhar toda a vida financeira do usuário e transformar dados em decisões.

A IA (FIRE) analisa continuamente:

- Patrimônio total e evolução
- Carteira de investimentos e performance
- Fluxo de caixa e despesas recorrentes
- Metas de curto, médio e longo prazo
- Aposentadoria e independência financeira
- Orçamento e desvios comportamentais
- Oportunidades de otimização
- Riscos e alertas proativos

O FIRE sempre prioriza **decisões financeiras**, não apenas exibição de dados.

---

## 2. Filosofia do FIRE

O FIRE nunca fala como um robô ou como um sistema.

**Nunca usar:**

> "O usuário possui R$ 500.000 em patrimônio."
> "Foi identificado um gasto elevado."
> "O sistema detectou..."

**Sempre usar:**

> "Seu patrimônio cresceu 3,2% este mês."
> "Sua carteira está concentrada em renda fixa — vale revisar."
> "Observei que seus gastos com alimentação subiram 18% acima da média."
> "Identifiquei uma oportunidade de rebalanceamento na sua carteira."
> "Hoje sua maior oportunidade de economia está em Restaurantes."

O FIRE age como um **consultor patrimonial experiente** — direto, empático, proativo e orientado a resultados.

---

## 3. Design

**Tema:** Dark Premium

**Referências visuais:**

- Apple — minimalismo e tipografia
- Arc Browser — personalidade e hierarquia
- Stripe Dashboard — densidade sem ruído
- Vercel — foco e clareza
- Linear — velocidade e precisão
- Notion — espaço e respiração

**O NextFire nunca deve parecer:**

- Um ERP corporativo
- Um sistema bancário dos anos 2000
- Uma planilha digitalizada

**Priorizar sempre:**

- Muito espaço em branco — dados respiram
- Hierarquia clara — o mais importante domina a tela
- Simplicidade — nenhum elemento sem propósito
- Animações discretas — feedback sem distração
- Gráficos elegantes — visualização como linguagem

---

## 4. Dashboard Central

O Dashboard deve responder apenas uma pergunta:

> **"O que é mais importante para mim hoje?"**

Regras absolutas:

- Nunca mostrar métricas sem contexto interpretado
- Nunca exibir números sem dizer o que significam
- Todas as informações devem ser filtradas e interpretadas pelo FIRE
- O Dashboard não é um painel de controle — é um briefing executivo diário

---

## 5. Hero AI

O Hero é o ponto focal do Dashboard. Deve entregar um **resumo executivo personalizado**.

Regras:

- Nunca listar apenas patrimônio
- Nunca mostrar apenas saldo de contas
- Sempre interpretar os dados: contexto, tendência, oportunidade ou risco
- O texto do Hero deve mudar conforme os dados reais do usuário
- Deve refletir o momento financeiro atual, não um estado genérico

---

## 6. Prioridades do Dia

Cada prioridade exibida no Dashboard deve:

- Nascer de dados reais e cálculos do engine
- Nunca usar placeholders ou frases genéricas
- Ter uma rota de ação específica (`/investments`, `/transactions`, `/fire`, etc.)
- Representar uma decisão concreta que o usuário pode tomar agora

Exemplos válidos:

> "Seu CDB vence em 7 dias — defina o destino do resgate."
> "Você está R$ 340 acima do orçamento em Alimentação este mês."
> "Sua reserva de emergência cobre apenas 2,1 meses — recomendo aportar R$ 800."

---

## 7. Páginas do Sistema

Cada página deve:

- **Alimentar o Dashboard Central** com dados e insights próprios
- **Gerar inteligência local** — não apenas exibir listas
- **Funcionar como um módulo independente** com análise, contexto e ação

Páginas existentes e suas funções:

| Rota | Módulo | Função principal |
|---|---|---|
| `/` | Dashboard | Briefing executivo diário |
| `/transactions` | Fluxo de Caixa | Análise de padrões de gasto |
| `/investments` | Carteira | Performance e rebalanceamento |
| `/assets` | Patrimônio | Composição e evolução |
| `/fire` | Simulador FIRE | Independência financeira |
| `/health` | Saúde Financeira | Score e vulnerabilidades |
| `/open-finance` | Conexões | Sincronização de dados externos |
| `/timeline` | Linha do Tempo | Eventos e marcos financeiros |

---

## 8. Qualidade dos Dados

O NextFire opera com integridade sobre os dados do usuário.

Regras:

- Quanto melhores os dados, mais precisos e acionáveis os insights
- Sempre mostrar **transparência sobre a qualidade dos dados disponíveis**
- Nunca inventar dados ou usar mocks em produção
- Alertar o usuário quando dados estiverem incompletos ou desatualizados
- O painel de qualidade de dados deve ser visível e honesto

---

## 9. Experiência do Usuário

O usuário deve sentir que possui um **CIO financeiro pessoal** — não um app.

O FIRE deve:

- **Antecipar problemas** antes que o usuário perceba
- **Identificar oportunidades** que o usuário não veria sozinho
- **Nunca apenas responder perguntas** — sempre ir além, propor, alertar, sugerir
- Tratar o usuário como alguém inteligente que precisa de contexto, não de tutoriais

A experiência deve ser: *"Ele já sabia o que eu precisava saber antes de eu perguntar."*

---

## 10. Arquitetura

**Regra absoluta: nunca duplicar lógica.**

Sempre reutilizar e respeitar a hierarquia existente:

```
Services        → queries ao banco, mutações, RLS
Engines/Libs    → cálculos, regras de negócio, scores
Adapters        → transformação de dados entre camadas
Types           → contratos de dados compartilhados
Providers       → abstrações de APIs externas (Pluggy, BRAPI)
```

**Proibido:**

- Criar lógica de cálculo dentro de componentes React
- Duplicar queries que já existem em services
- Criar types locais para dados que já têm type global
- Quebrar o padrão Server Component (page.tsx) → Client Component (*Client.tsx)
- Expor credenciais server-side no frontend (nunca `NEXT_PUBLIC_` para secrets)
- Criar migrations sem aprovação explícita
- Instalar bibliotecas sem necessidade justificada

---

## 11. Desenvolvimento

**Protocolo obrigatório antes de qualquer implementação:**

1. **Ler este documento** — entender identidade, filosofia e arquitetura
2. **Ler os arquivos afetados** — nunca escrever sem ter lido o contexto
3. **Preservar a arquitetura** — services, engines, adapters, types
4. **Preservar a identidade visual** — dark premium, espaço, hierarquia
5. **Não alterar componentes aprovados** sem necessidade explícita e justificada
6. **Verificar tsc --noEmit** após qualquer alteração em TypeScript
7. **Rodar npm test** se houver testes relacionados ao módulo alterado

**Regras de ouro:**

- Nunca criar backend fora do padrão Next.js (Server Actions + Route Handlers)
- Nunca conectar APIs diretamente no frontend — sempre via provider pattern
- Todas as operações de banco respeitam RLS — `requireAuth()` como segunda camada
- Nunca armazenar senha ou token sensível em texto puro
- Nunca criar migration sem pedir confirmação e explicar o impacto

---

*Documento criado em: 2026-07-02*
*Versão: 1.0*
*Manter atualizado conforme o produto evolui.*
