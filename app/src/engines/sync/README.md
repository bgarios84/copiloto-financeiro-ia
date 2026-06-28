# src/engines/sync

Motor de sincronização de dados financeiros.

Responsabilidades:
- Orquestração de sync com Open Finance / Open Banking
- Deduplicação de transações importadas
- Reconciliação de dados entre fontes
- Gestão de jobs de sincronização (agendamento, retry, status)
- Normalização de dados vindos de diferentes instituições

Exemplos de funções:
- `syncAccount(accountId, provider)`
- `deduplicateTransactions(transactions)`
- `reconcileData(source, target)`
