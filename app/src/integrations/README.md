# src/integrations

Conectores com serviços e APIs externas.

Responsabilidades:
- Integração com Open Finance / Open Banking
- APIs de cotações e dados de mercado (B3, CVM, etc.)
- Integração com corretoras e bancos
- Webhooks de entrada e saída
- Autenticação OAuth com provedores externos

Estrutura sugerida:
```
integrations/
├── open-finance/
├── market-data/
├── brokers/
└── webhooks/
```

Regras:
- Cada integração tem seu próprio adaptador isolado
- Falhas de integração não propagam erros crus — sempre mapeados para erros de domínio
