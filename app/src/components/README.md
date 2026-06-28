# src/components

Componentes de UI reutilizáveis e agnósticos de feature.

Responsabilidades:
- Componentes visuais genéricos (botões, cards, modais, tabelas)
- Extensões e customizações dos componentes shadcn/ui
- Componentes de layout (Header, Sidebar, Footer)
- Design system local da aplicação

Estrutura sugerida:
```
components/
├── ui/           ← shadcn/ui overrides e extensões
├── layout/
├── charts/
└── feedback/
```

Regras:
- Não contém lógica de negócio
- Recebe dados via props — não faz fetch direto
- Deve ser reutilizável em qualquer feature
