/**
 * Open Finance — Transaction Reconciliation
 * Sprint 9.6 — Conciliacao Automatica v1
 *
 * Funcao pura: sem chamadas ao banco.
 * Recebe o lote de transacoes sincronizadas e retorna acoes de reconciliacao.
 * O service (open-finance.ts) aplica as acoes no banco apos o sync.
 *
 * Regras implementadas (v1):
 *   R1 — INTERNAL_TRANSFER : PIX/TED/DOC entre contas proprias
 *   R2 — CARD_PAYMENT      : Pagamento de fatura de cartao
 *   R3 — DUPLICATE_DEBIT   : Debito duplicado (mesma conta, data, valor)
 *   R4 — MIRRORED_PAIR     : Par credito/debito espelhado entre contas distintas
 *
 * Extensao: adicionar novas regras ao array RECONCILIATION_RULES.
 */

// ── Tipos publicos ────────────────────────────────────────────────────────────

export interface ReconciliationInput {
  /** ID local — public.transaction.id */
  id:          string;
  /** ID externo do provider */
  externalId:  string;
  /** financial_account_id (null se cartao) */
  accountId:   string | null;
  /** credit_card_id (null se conta bancaria) */
  cardId:      string | null;
  /** Data YYYY-MM-DD */
  date:        string;
  /** Valor absoluto */
  amount:      number;
  /** Tipo calculado pelo sync */
  type:        "income" | "expense";
  /** Descricao original */
  description: string;
  /**
   * true se o usuario editou esta transacao manualmente.
   * Transacoes manuais nao sao reconciliadas.
   */
  isManual:    boolean;
}

export type ReconciliationReason =
  | "INTERNAL_TRANSFER"   // PIX/TED/DOC entre contas proprias
  | "CARD_PAYMENT"        // Pagamento de fatura de cartao
  | "DUPLICATE_DEBIT"     // Debito duplicado (mesma conta, data, valor)
  | "MIRRORED_PAIR";      // Par credito/debito espelhado sem keyword

export type ReconciliationAction =
  | "mark_transfer"   // type → "transfer" (exclui de receita/despesa)
  | "mark_ignored";   // is_ignored → true (exclui de todos os calculos)

export interface ReconciliationMatch {
  /** ID da transacao afetada */
  transactionId: string;
  /** ID do par quando houver (transferencias) */
  pairId:        string | null;
  reason:        ReconciliationReason;
  action:        ReconciliationAction;
  notes:         string;
}

export interface ReconciliationResult {
  matchesFound: number;
  matches:      ReconciliationMatch[];
  processedAt:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza string: minusculas, sem acentos, sem pontuacao. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compara valores com tolerancia de 0.1% (cobre IOF e taxas bancarias minimas).
 */
function amountMatch(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  const avg = (a + b) / 2;
  if (avg === 0) return false;
  return Math.abs(a - b) / avg <= 0.001;
}

/** Diferenca absoluta em dias entre duas datas YYYY-MM-DD. */
function dateDiffDays(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000,
  );
}

// ── Palavras-chave ────────────────────────────────────────────────────────────

/** Termos que indicam transferencia de dinheiro entre contas. */
const TRANSFER_KEYWORDS = [
  "pix", "ted", "doc",
  "transf", "transferencia", "transfere", "transferido",
  "envio", "enviado", "remessa",
];

/** Termos que indicam pagamento de fatura de cartao. */
const CARD_PAYMENT_KEYWORDS = [
  "pgto fatura", "pagto fatura", "pagamento fatura",
  "pag fatura", "fatura cartao", "fatura cartao credito",
];

// ── Tipo de regra ─────────────────────────────────────────────────────────────

type RuleFn = (
  tx:   ReconciliationInput,
  all:  ReconciliationInput[],
  seen: Set<string>,
) => ReconciliationMatch[] | null;

// ── Regra R1: Transferencia Interna ──────────────────────────────────────────

/**
 * Ancora: despesa com keyword de transferencia.
 * Busca par receita de conta distinta, mesmo valor (+/-0.1%), data +/-1 dia.
 */
const ruleInternalTransfer: RuleFn = (tx, all, seen) => {
  if (seen.has(tx.id))       return null;
  if (tx.type !== "expense") return null;

  const txNorm = norm(tx.description);
  if (!TRANSFER_KEYWORDS.some((k) => txNorm.includes(k))) return null;

  for (const other of all) {
    if (other.id === tx.id)      continue;
    if (seen.has(other.id))      continue;
    if (other.type !== "income") continue;

    // Contas distintas (previne match na mesma conta)
    if (
      tx.accountId !== null &&
      other.accountId !== null &&
      tx.accountId === other.accountId
    ) continue;

    if (!amountMatch(tx.amount, other.amount))   continue;
    if (dateDiffDays(tx.date, other.date) > 1)   continue;

    seen.add(tx.id);
    seen.add(other.id);

    return [
      {
        transactionId: tx.id,
        pairId:        other.id,
        reason:        "INTERNAL_TRANSFER",
        action:        "mark_transfer",
        notes:         `Debito ${tx.id} <-> Credito ${other.id} | valor=${tx.amount} | data=${tx.date}`,
      },
      {
        transactionId: other.id,
        pairId:        tx.id,
        reason:        "INTERNAL_TRANSFER",
        action:        "mark_transfer",
        notes:         `Credito ${other.id} <-> Debito ${tx.id} | valor=${other.amount} | data=${other.date}`,
      },
    ];
  }

  return null;
};

// ── Regra R2: Pagamento de Fatura ────────────────────────────────────────────

/**
 * Debito de CONTA (nao cartao) com keyword de pagamento de fatura.
 * Marcado como transferencia — as despesas individuais do cartao ja foram sync.
 */
const ruleCardPayment: RuleFn = (tx, _all, seen) => {
  if (seen.has(tx.id))       return null;
  if (tx.type !== "expense") return null;
  if (!tx.accountId)         return null; // deve ser conta, nao cartao

  const txNorm = norm(tx.description);
  if (!CARD_PAYMENT_KEYWORDS.some((k) => txNorm.includes(norm(k)))) return null;

  seen.add(tx.id);
  return [
    {
      transactionId: tx.id,
      pairId:        null,
      reason:        "CARD_PAYMENT",
      action:        "mark_transfer",
      notes:         `Pagamento de fatura identificado: "${tx.description}"`,
    },
  ];
};

// ── Regra R3: Debito Duplicado ────────────────────────────────────────────────

/**
 * Duas despesas na mesma conta, mesma data, mesmo valor.
 * A segunda ocorrencia e marcada como ignorada.
 */
const ruleDuplicateDebit: RuleFn = (tx, all, seen) => {
  if (seen.has(tx.id))       return null;
  if (tx.type !== "expense") return null;
  if (!tx.accountId)         return null;

  for (const other of all) {
    if (other.id === tx.id)                    continue;
    if (seen.has(other.id))                    continue;
    if (other.type !== "expense")              continue;
    if (other.accountId !== tx.accountId)      continue;
    if (other.date !== tx.date)                continue;
    if (!amountMatch(tx.amount, other.amount)) continue;

    // tx e a primeira ocorrencia — marca OTHER como ignorada
    seen.add(other.id);
    return [
      {
        transactionId: other.id,
        pairId:        tx.id,
        reason:        "DUPLICATE_DEBIT",
        action:        "mark_ignored",
        notes:         `Duplicata de ${tx.id} | conta=${tx.accountId} | data=${tx.date} | valor=${tx.amount}`,
      },
    ];
  }

  return null;
};

// ── Regra R4: Par Espelhado ───────────────────────────────────────────────────

/**
 * Despesa + receita de contas distintas, mesmo valor (+/-0.1%), data +/-1 dia,
 * SEM keyword de transferencia (seria coberto por R1).
 * Indica transferencia nao-sinalizada na descricao.
 */
const ruleMirroredPair: RuleFn = (tx, all, seen) => {
  if (seen.has(tx.id))       return null;
  if (tx.type !== "expense") return null;

  // Evitar sobreposicao com R1
  const txNorm = norm(tx.description);
  if (TRANSFER_KEYWORDS.some((k) => txNorm.includes(k))) return null;

  for (const other of all) {
    if (other.id === tx.id)      continue;
    if (seen.has(other.id))      continue;
    if (other.type !== "income") continue;

    if (
      tx.accountId !== null &&
      other.accountId !== null &&
      tx.accountId === other.accountId
    ) continue;

    if (!amountMatch(tx.amount, other.amount))  continue;
    if (dateDiffDays(tx.date, other.date) > 1)  continue;

    seen.add(tx.id);
    seen.add(other.id);

    return [
      {
        transactionId: tx.id,
        pairId:        other.id,
        reason:        "MIRRORED_PAIR",
        action:        "mark_transfer",
        notes:         `Par espelhado: ${tx.id} <-> ${other.id} | valor=${tx.amount}`,
      },
      {
        transactionId: other.id,
        pairId:        tx.id,
        reason:        "MIRRORED_PAIR",
        action:        "mark_transfer",
        notes:         `Par espelhado: ${other.id} <-> ${tx.id} | valor=${other.amount}`,
      },
    ];
  }

  return null;
};

// ── Pipeline de regras ────────────────────────────────────────────────────────

/**
 * Regras em ordem de prioridade.
 * Cada transacao e processada por no maximo uma regra (a de maior prioridade).
 * Para adicionar novas regras: implementar RuleFn e inserir aqui.
 */
const RECONCILIATION_RULES: RuleFn[] = [
  ruleInternalTransfer,  // R1 — mais especifica (keyword + par)
  ruleCardPayment,       // R2 — keyword de fatura
  ruleDuplicateDebit,    // R3 — mesmo debito duplicado
  ruleMirroredPair,      // R4 — par espelhado sem keyword
];

// ── Funcao principal ──────────────────────────────────────────────────────────

/**
 * Reconcilia um lote de transacoes sincronizadas.
 *
 * Funcao pura — sem efeitos colaterais, sem chamadas ao banco.
 * Transacoes com isManual=true sao ignoradas (preserva edicoes do usuario).
 * Cada transacao e processada por no maximo uma regra (a de maior prioridade).
 *
 * @param transactions - lote de transacoes da rodada de sync atual
 * @returns ReconciliationResult — acoes a aplicar no banco
 */
export function reconcileTransactions(
  transactions: ReconciliationInput[],
): ReconciliationResult {
  // Filtrar transacoes editadas manualmente
  const eligible = transactions.filter((tx) => !tx.isManual);

  const seen:    Set<string>           = new Set();
  const matches: ReconciliationMatch[] = [];

  for (const tx of eligible) {
    for (const rule of RECONCILIATION_RULES) {
      const result = rule(tx, eligible, seen);
      if (result) {
        matches.push(...result);
        break; // apenas a regra de maior prioridade se aplica
      }
    }
  }

  return {
    matchesFound: matches.length,
    matches,
    processedAt:  new Date().toISOString(),
  };
}
