# src/types

Tipos e interfaces TypeScript globais da aplicação.

Responsabilidades:
- Tipos gerados automaticamente (ex: tipos do Supabase via `supabase gen types`)
- Interfaces e tipos compartilhados entre domínio e UI
- Tipos de API response/request
- Augmentations de tipos de bibliotecas externas

Exemplos:
```
types/
├── database.types.ts    ← gerado pelo Supabase CLI
├── api.types.ts
└── globals.d.ts
```

Regras:
- Tipos de domínio puro ficam em `domain/`
- Aqui ficam tipos técnicos e de integração
