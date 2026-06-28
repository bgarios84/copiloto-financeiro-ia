# src/utils

Funções utilitárias puras e helpers sem estado.

Responsabilidades:
- Formatação de valores (moeda, datas, percentuais)
- Cálculos matemáticos genéricos
- Manipulação de strings, arrays e objetos
- Helpers de validação simples

Exemplos:
```
utils/
├── format-currency.ts
├── format-date.ts
├── calculate-percentage.ts
└── cn.ts    ← classnames helper (Tailwind)
```

Regras:
- Funções puras — sem side effects, sem estado
- Testáveis unitariamente de forma trivial
- Não importam de camadas de domínio ou aplicação
