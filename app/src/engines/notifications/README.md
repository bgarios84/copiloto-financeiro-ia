# src/engines/notifications

Motor de notificações e alertas financeiros.

Responsabilidades:
- Geração de alertas baseados em regras (ex: gasto acima do orçamento)
- Notificações de vencimento (contas, investimentos)
- Alertas de oportunidades de mercado
- Gestão de preferências de notificação por usuário
- Dispatch para múltiplos canais (push, email, in-app)

Exemplos de funções:
- `checkBudgetAlerts(userId)`
- `generateDueDateAlerts(bills)`
- `dispatchNotification(userId, notification, channels)`
