# src/features

Módulos verticais de feature — agrupam tudo que pertence a uma funcionalidade.

Responsabilidades:
- Componentes específicos de cada feature (não reutilizáveis globalmente)
- Hooks de feature (estado local, fetch de dados)
- Lógica de apresentação e transformação de dados para UI
- Formulários e validações de tela

Estrutura sugerida:
```
features/
├── dashboard/
├── transactions/
├── investments/
├── budget/
└── reports/
```

Regras:
- Cada feature é auto-contida — minimiza acoplamento entre features
- Pode importar de `components/`, `hooks/`, `services/` e `application/`
- Não importa de outras features diretamente
