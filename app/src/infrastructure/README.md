# src/infrastructure

Camada de Infraestrutura — implementações concretas de contratos do domínio.

Responsabilidades:
- Implementações de repositórios usando Supabase
- Clientes HTTP para APIs externas (Open Finance, Bolsa, etc.)
- Adaptadores para serviços de terceiros
- Mapeamento entre entidades de domínio e modelos de banco de dados

Estrutura sugerida:
```
infrastructure/
├── supabase/
├── repositories/
├── adapters/
└── mappers/
```

Regras:
- Implementa interfaces definidas em `domain/repositories/`
- É a única camada que conhece os detalhes técnicos de persistência
