# src/ai

Integração com modelos e APIs de Inteligência Artificial.

Responsabilidades:
- Definição e versionamento de prompts
- Clientes para APIs de LLM (OpenAI, Anthropic, Google, etc.)
- Chains e pipelines de processamento com IA
- Parsing e validação de respostas de modelos
- RAG (Retrieval-Augmented Generation) e embeddings

Estrutura sugerida:
```
ai/
├── prompts/
├── chains/
├── embeddings/
└── clients/
```

Regras:
- Prompts são tratados como código — versionados e testados
- Respostas de LLM sempre passam por validação antes do uso
