# src/shared

Código compartilhado entre todas as camadas da aplicação.

Responsabilidades:
- Tipos e interfaces transversais
- Classes de erro customizadas (AppError, DomainError, etc.)
- Constantes globais da aplicação
- Utilitários genéricos sem dependência de domínio específico
- Enums compartilhados

Estrutura sugerida:
```
shared/
├── errors/
├── constants/
├── enums/
└── types/
```

Regras:
- Não importa de nenhuma outra camada do projeto
- Pode ser importado por qualquer camada
