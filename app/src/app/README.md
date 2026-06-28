# src/app

Camada de roteamento do Next.js App Router.

Responsabilidades:
- Definição de rotas, layouts e páginas da aplicação
- Configuração de metadata, loading states e error boundaries por rota
- Organização por segmentos de URL (pastas = rotas)
- Integração com Server Components e Client Components do Next.js 15

Regras:
- Não contém lógica de negócio — delega para `features/` ou `application/`
- Arquivos permitidos: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
