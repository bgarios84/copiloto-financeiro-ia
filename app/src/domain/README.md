# src/domain

Camada de Domínio — núcleo de negócio da aplicação.

Responsabilidades:
- Entidades de negócio (ex: Conta, Transação, Investimento)
- Value Objects (ex: Dinheiro, Percentual, Período)
- Interfaces de repositórios (contratos, não implementações)
- Eventos de domínio
- Regras e invariantes de negócio

Estrutura sugerida:
```
domain/
├── entities/
├── value-objects/
├── repositories/
└── events/
```

Regras:
- Zero dependências externas — puro TypeScript
- Não conhece Supabase, Next.js, ou qualquer framework
