# src/lib

Configurações e instâncias de bibliotecas externas.

Responsabilidades:
- Cliente Supabase (browser e server)
- Configuração do React Query
- Instância do cliente HTTP (fetch wrapper, axios, etc.)
- Setup de bibliotecas de validação (zod schemas base)
- Configuração de analytics e monitoramento

Exemplos:
```
lib/
├── supabase/
│   ├── client.ts    ← cliente browser
│   └── server.ts    ← cliente server (Server Components)
├── query-client.ts
└── validators.ts
```

Regras:
- Não contém lógica de negócio — apenas configuração
- Exporta instâncias prontas para uso
