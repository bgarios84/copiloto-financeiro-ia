# src/services

Serviços de aplicação — orquestração entre camadas para operações complexas.

Responsabilidades:
- Serviços que coordenam múltiplos casos de uso ou engines
- Lógica de negócio transversal que não pertence a uma única feature
- Serviços de notificação, exportação, geração de relatórios

Estrutura sugerida:
```
services/
├── financial-report.service.ts
├── data-export.service.ts
└── alert.service.ts
```

Regras:
- Diferente de `application/use-cases/`: serviços podem orquestrar múltiplos use cases
- Pode ser chamado tanto por Server Actions quanto por API Routes
