# src/engines

Motores de processamento especializados do Copiloto Financeiro.

Cada subdiretório é um motor independente com responsabilidade única.
Os motores são os "cérebros" do sistema — processam dados financeiros, 
geram análises e tomam decisões automatizadas.

Motores disponíveis:
- `finance/` — cálculos financeiros fundamentais
- `investments/` — análise de investimentos
- `portfolio/` — gestão de portfólio
- `sync/` — sincronização de dados
- `ai/` — inteligência artificial financeira
- `notifications/` — alertas e notificações
- `market-intelligence/` — inteligência de mercado

Regras:
- Cada motor é independente e testável isoladamente
- Comunicação entre motores via eventos ou serviços de orquestração
- Não acessam banco de dados diretamente — usam repositórios de `infrastructure/`
