# src/hooks

React hooks customizados de uso geral na aplicação.

Responsabilidades:
- Hooks de estado global (ex: useUser, useTheme)
- Hooks de utilitários de UI (ex: useDebounce, useMediaQuery)
- Hooks de integração com providers (ex: useSupabase, useToast)
- Hooks de ciclo de vida e performance

Regras:
- Hooks específicos de uma feature ficam em `features/<nome>/hooks/`
- Apenas hooks verdadeiramente reutilizáveis ficam aqui
- Nomenclatura: sempre prefixar com `use`
