# src/providers

Context Providers e wrappers globais da aplicação.

Responsabilidades:
- Providers de contexto React (Theme, Auth, Query Client, etc.)
- Wrapper raiz que compõe todos os providers (`AppProviders`)
- Configuração do React Query / SWR
- Providers de bibliotecas de UI (Toaster, Tooltip, etc.)

Regras:
- Providers são compostos em um único componente raiz usado em `src/app/layout.tsx`
- Não contém lógica de negócio — apenas setup de contexto
