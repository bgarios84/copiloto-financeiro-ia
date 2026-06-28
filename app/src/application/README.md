# src/application

Camada de Aplicação — orquestra os casos de uso do sistema.

Responsabilidades:
- Casos de uso (use cases) que coordenam entidades do domínio
- Comandos (mutations) e queries (leituras) seguindo CQRS
- DTOs (Data Transfer Objects) de entrada e saída
- Validação de inputs antes de chegar ao domínio

Estrutura sugerida:
```
application/
├── use-cases/
├── commands/
├── queries/
└── dtos/
```

Regras:
- Depende apenas de `domain/` e contratos de `infrastructure/`
- Não importa diretamente bibliotecas de UI ou frameworks
