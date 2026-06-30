/**
 * Transaction Categorizer — Open Finance
 * Sprint 9.5  — criado
 * Sprint 9.5B — corrigido nomes de categoria e regex
 * Sprint 9.5C — expandido: e-commerce, academia, beleza, seguros,
 *               PIX saida, tarifas bancarias, telecom, mais marcas
 */

import type { Category } from "@/types/transaction";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CategorizationInput {
  description:       string;
  type:              "income" | "expense";
  providerCategory?: string;
}

// ── Regras ────────────────────────────────────────────────────────────────────
// Categorias disponíveis no banco (migration 001_mvp_schema.sql):
//
// expense: Moradia | Alimentação | Transporte | Saúde | Educação | Lazer |
//          Vestuário | Assinaturas | Pets | Viagem | Investimentos | Impostos | Outros
// income:  Salário | Freelance | Renda Passiva | Dividendos | Reembolso |
//          Presente | Outras Receitas
// both:    Investimentos | Outros
//
// Ordem importa: primeira regra que bater é aplicada.
// ---------------------------------------------------------------------------

const RULES: Array<{
  terms:    string[];
  category: string;
  type?:    "income" | "expense" | "both";
}> = [

  // ══════════ RECEITA ═══════════════════════════════════════════════════════

  {
    terms:    ["salario", "holerite", "folha pagamento", "pagamento salario",
               "vencimento", "remuneracao", "pro labore", "prolabore",
               "13 salario", "ferias ", "rescisao"],
    category: "Salário",
    type:     "income",
  },
  {
    terms:    ["freelance", "autonomo", "servico prestado", "honorario",
               "consultoria recebida", "nota fiscal recebida"],
    category: "Freelance",
    type:     "income",
  },
  {
    terms:    ["dividendo", "jscp", "proventos", "rendimento fii",
               "rendimento fundo", "bonificacao"],
    category: "Dividendos",
    type:     "income",
  },
  {
    terms:    ["renda passiva", "aluguel recebido", "royalties"],
    category: "Renda Passiva",
    type:     "income",
  },
  {
    terms:    ["reembolso", "estorno", "devolucao", "chargeback",
               "cashback", "ressarcimento"],
    category: "Reembolso",
    type:     "income",
  },
  {
    terms:    ["pix recebido", "pix enviado por", "credito pix",
               "transferencia recebida", "ted recebida", "doc recebido",
               "credito em conta", "deposito recebido", "credito transferencia"],
    category: "Outras Receitas",
    type:     "income",
  },

  // ══════════ ALIMENTAÇÃO ═══════════════════════════════════════════════════

  {
    // Supermercados e mercearias
    terms:    ["supermercado", "hipermercado", "atacado", "hortifruti",
               "padaria", "acougue", "quitanda", "mercearia",
               "carrefour", "pao de acucar", "assai", "atacadao",
               "walmart", "prezunic", "bistek", "condor", "fort",
               "comper", "enxuto", "sao pedro", "imperatriz",
               "mini mercado", "minimercado", "mercearia"],
    category: "Alimentação",
    type:     "expense",
  },
  {
    // Delivery e restaurantes
    terms:    ["ifood", "rappi", "uber eats", "ubereats", "james delivery",
               "cornershop", "delivery", "restaurante", "lanchonete",
               "pizzaria", "hamburguer", "hamburger", "hamburgaria",
               "mc donalds", "mcdonalds", "burger king", "subway", "kfc",
               "outback", "churrascaria", "sushi", "japanese", "chinese",
               "temakeria", "tapiocaria", "creperia", "bistrô", "bistro",
               "doceria", "confeitaria", "sorveteria",
               "cafe ", "cafeteria", "starbucks", "coffee shop", "cafezinho"],
    category: "Alimentação",
    type:     "expense",
  },

  // ══════════ TRANSPORTE ════════════════════════════════════════════════════

  {
    terms:    ["uber", "99 ", "99app", "99taxi", "taxi", "cabify",
               "indrive", "in drive", "buser", "passagem",
               "metro ", "metrô", "trem ", "onibus", "ônibus",
               "bilhete unico", "bilhetagem", "transporte publico",
               "viacao ", "rodoviaria",
               "estacionamento", "parking", "zona azul",
               "pedagio", "autoban", "ccr ", "ecovias",
               "combustivel", "gasolina", "etanol", "diesel",
               "shell", "petrobras", "ipiranga", "ale ", "br mania",
               "auto posto", "posto combustivel", "posto de gasolina",
               "oficina", "mecanico", "borracharia", "lavagem carro",
               "detran", "ipva", "seguro auto", "seguro veiculo",
               "renave", "emplacamento", "revisao carro"],
    category: "Transporte",
    type:     "expense",
  },

  // ══════════ SAÚDE ═════════════════════════════════════════════════════════

  {
    terms:    ["farmacia", "drogaria", "droga raia", "drogaraia",
               "ultrafarma", "panvel", "pacheco", "nissei", "pague menos",
               "drogal", "drogasil", "dpsp", "droganossa",
               "medico", "médico", "clinica", "hospital", "ubs ",
               "laboratorio", "exame ", "consulta ", "cirurgia",
               "dentista", "odonto", "ortodontia", "protese",
               "fisioterapia", "psicologia", "psicologo", "psiquiatra",
               "nutricao", "nutricionista",
               "plano de saude", "unimed", "amil", "sulamerica",
               "bradesco saude", "hapvida", "notre dame", "gndi",
               "mediservice", "cassi", "sabesp saude",
               "academia ", "smartfit", "bluefit", "bodytech",
               "bio ritmo", "bioritmo", "crossfit", "pilates",
               "yoga ", "natacao", "personal trainer"],
    category: "Saúde",
    type:     "expense",
  },

  // ══════════ ASSINATURAS ═══════════════════════════════════════════════════

  {
    terms:    ["netflix", "spotify", "amazon prime", "prime video",
               "hbo ", "hbo max", "disney", "apple tv", "apple one",
               "youtube premium", "youtube music", "deezer",
               "crunchyroll", "globoplay", "paramount", "star plus",
               "microsoft 365", "office 365", "google one", "google workspace",
               "icloud", "dropbox", "onedrive",
               "adobe", "photoshop", "illustrator", "creative cloud",
               "canva", "figma",
               "assinatura", "subscription", "plano mensal", "plano anual",
               "recorrente", "cobranca mensal"],
    category: "Assinaturas",
    type:     "expense",
  },

  // ══════════ MORADIA ═══════════════════════════════════════════════════════

  {
    terms:    ["aluguel", "condominio", "iptu", "taxa condominio",
               "agua ", "sabesp", "saneago", "compesa", "copasa",
               "energia ", "enel", "cemig", "copel", "celesc", "elektro",
               "cpfl", "light ", "coelba", "celpe", "cosern", "equatorial",
               "gas encanado", "comgas", "naturgy", "gas natural",
               "internet ", "fibra", "banda larga",
               "claro fibra", "vivo fibra", "tim live", "oi fibra",
               "net combo", "sky ", "directv",
               "seguro residencial", "seguro imovel", "seguro casa",
               "iptu", "condominium", "administration taxa",
               "reforma ", "obra ", "construcao"],
    category: "Moradia",
    type:     "expense",
  },

  // ══════════ EDUCAÇÃO ══════════════════════════════════════════════════════

  {
    terms:    ["escola ", "colegio", "faculdade", "universidade",
               "mensalidade escolar", "matricula", "inscricao",
               "curso ", "aula de", "treinamento", "capacitacao",
               "udemy", "coursera", "alura", "linkedin learning",
               "descomplica", "kuadro", "cursinho",
               "livro ", "livraria", "saraiva", "cultura ",
               "amazon livros", "kindle",
               "educacao", "material escolar", "apostila"],
    category: "Educação",
    type:     "expense",
  },

  // ══════════ LAZER ═════════════════════════════════════════════════════════

  {
    terms:    ["cinema", "cinemark", "kinoplex", "teatro",
               "show ", "ingresso", "ticketmaster", "eventim", "sympla",
               "parque ", "museu", "exposicao", "zoologico",
               "jogo ", "steam", "playstation", "xbox", "nintendo",
               "psn ", "xbox live", "ea sports", "epic games",
               "bar ", "balada", "festa", "clube ",
               "lazer", "hobby", "esporte clube"],
    category: "Lazer",
    type:     "expense",
  },

  // ══════════ VIAGEM ════════════════════════════════════════════════════════

  {
    terms:    ["hotel", "airbnb", "booking", "pousada", "resort",
               "hostel", "hospedagem",
               "passagem aerea", "passagem aviao",
               "latam", "gol ", "azul ", "american airlines",
               "tap ", "tam ", "avianca",
               "viagem", "turismo", "agencia viagem",
               "decolar", "cvc ", "submarino viagens",
               "car rental", "aluguel carro", "localiza", "movida",
               "lounge aeroporto", "vip lounge"],
    category: "Viagem",
    type:     "expense",
  },

  // ══════════ VESTUÁRIO ═════════════════════════════════════════════════════

  {
    terms:    ["renner", "riachuelo", "cea ", "c&a", "hering",
               "zara", "h&m", "forever 21", "gap ",
               "farm ", "animale", "arezzo", "schutz",
               "havaianas", "crocs",
               "nike ", "adidas", "puma ", "new balance", "asics",
               "centauro", "netshoes", "dafiti",
               "roupa", "calcado", "tenis ", "vestuario",
               "moda ", "alfaiataria", "costura"],
    category: "Vestuário",
    type:     "expense",
  },

  // ══════════ PETS ══════════════════════════════════════════════════════════

  {
    terms:    ["pet shop", "petshop", "veterinario", "veterinaria", "vet ",
               "racao ", "petz", "cobasi", "petland", "agropecuaria",
               "banho e tosa", "canil", "gatil", "pet care"],
    category: "Pets",
    type:     "expense",
  },

  // ══════════ INVESTIMENTOS ═════════════════════════════════════════════════

  {
    terms:    ["investimento", "aplicacao renda fixa", "tesouro direto",
               "cdb ", "lci ", "lca ", "lci/lca",
               "fundos de investimento", "fundo de investimento",
               "bolsa de valores", "bovespa", "b3 ",
               "corretora", "xp investimentos", "clear corretora",
               "rico investimentos", "btg investimentos", "nuinvest",
               "inter invest", "warren", "modal mais",
               "previdencia privada", "pgbl", "vgbl",
               "aportes", "resgate cdb"],
    category: "Investimentos",
  },

  // ══════════ IMPOSTOS / TARIFAS ════════════════════════════════════════════

  {
    terms:    ["imposto de renda", "irpf", "irpj", "iof ",
               "das ", "simples nacional",
               "darf", "tributo", "guia pagamento",
               "tarifa bancaria", "tarifa manutencao", "tarifa pacote",
               "anuidade cartao", "manutencao conta", "pacote servicos",
               "taxa administrativa", "taxa servico", "taxa condominio",
               "tarifa pix", "tarifa ted", "tarifa doc"],
    category: "Impostos",
    type:     "expense",
  },

  // ══════════ E-COMMERCE / COMPRAS ══════════════════════════════════════════
  // Mapeado para "Outros" — compras genéricas sem categoria clara

  {
    terms:    ["mercado livre", "mercadolivre", "mlb ",
               "shopee", "aliexpress", "shein",
               "americanas", "casas bahia", "magazine luiza", "magalu",
               "submarino", "extra eletro", "fastshop", "kabum",
               "amazon.com", "amazon br", "amazon ",
               "wish ", "netshoes", "dafiti",
               "lojas marisa", "rchlo", "pernambucanas",
               "compra online", "ecommerce", "loja virtual"],
    category: "Outros",
    type:     "expense",
  },

  // ══════════ BELEZA / CUIDADOS PESSOAIS ════════════════════════════════════

  {
    terms:    ["salao", "cabeleireiro", "barbearia", "barber",
               "estetica", "manicure", "pedicure", "nail",
               "spa ", "massagem", "depilacao",
               "boticario", "natura ", "avon ", "o boticario",
               "sephora", "beauty", "cosmetico", "perfumaria"],
    category: "Outros",
    type:     "expense",
  },

  // ══════════ SEGUROS (genérico) ════════════════════════════════════════════

  {
    terms:    ["porto seguro", "bradesco seguro", "suhai ", "mapfre",
               "liberty seguro", "azul seguro", "tokio marine",
               "allianz", "zurich seguro",
               "seguro vida", "seguro prestamista"],
    category: "Outros",
    type:     "expense",
  },

  // ══════════ PIX / TED SAÍDA (genérico) ═══════════════════════════════════
  // Apenas como último recurso — PIX pode ser qualquer coisa
  // Não mapear para evitar falso positivo; deixar null

];

// ── Mapeamento de categorias do provider ──────────────────────────────────────

const PROVIDER_CATEGORY_MAP: Record<string, string> = {
  // expense
  "alimentacao":              "Alimentação",
  "alimentação":              "Alimentação",
  "supermercados":            "Alimentação",
  "restaurantes":             "Alimentação",
  "delivery":                 "Alimentação",
  "transporte":               "Transporte",
  "transporte por aplicativo":"Transporte",
  "combustivel":              "Transporte",
  "combustível":              "Transporte",
  "saude":                    "Saúde",
  "saúde":                    "Saúde",
  "farmacia":                 "Saúde",
  "farmácia":                 "Saúde",
  "academia":                 "Saúde",
  "assinaturas":              "Assinaturas",
  "streaming":                "Assinaturas",
  "servicos digitais":        "Assinaturas",
  "serviços digitais":        "Assinaturas",
  "moradia":                  "Moradia",
  "casa":                     "Moradia",
  "habitacao":                "Moradia",
  "habitação":                "Moradia",
  "energia":                  "Moradia",
  "agua":                     "Moradia",
  "internet":                 "Moradia",
  "educacao":                 "Educação",
  "educação":                 "Educação",
  "lazer":                    "Lazer",
  "entretenimento":           "Lazer",
  "vestuario":                "Vestuário",
  "vestuário":                "Vestuário",
  "roupas":                   "Vestuário",
  "moda":                     "Vestuário",
  "viagem":                   "Viagem",
  "turismo":                  "Viagem",
  "hotel":                    "Viagem",
  "investimento":             "Investimentos",
  "investimentos":            "Investimentos",
  "impostos":                 "Impostos",
  "taxas":                    "Impostos",
  "financeiro":               "Impostos",
  "tarifas bancarias":        "Impostos",
  "compras":                  "Outros",
  "shopping":                 "Outros",
  "eletronicos":              "Outros",
  "eletrônicos":              "Outros",
  // income
  "salario":                  "Salário",
  "salário":                  "Salário",
  "rendimentos":              "Outras Receitas",
  "transferencia":            "Outras Receitas",
  "transferência":            "Outras Receitas",
  "outros":                   "Outras Receitas",
  "receita":                  "Outras Receitas",
};

// ── Normalizacao ──────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // remove diacriticos (acentos)
    .replace(/[^a-z0-9\s]/g, " ")      // remove caracteres especiais
    .replace(/\s+/g, " ")
    .trim();
}

// ── Lookup por nome de categoria ──────────────────────────────────────────────

function findCategoryId(
  targetName: string,
  categories: Category[],
  type: "income" | "expense",
): string | null {
  const target = normalize(targetName);

  const exact = categories.find(
    (c) =>
      normalize(c.name) === target &&
      (c.type === type || c.type === "both"),
  );
  if (exact) return exact.id;

  const anyType = categories.find((c) => normalize(c.name) === target);
  if (anyType) return anyType.id;

  const partial = categories.find(
    (c) =>
      target.includes(normalize(c.name)) ||
      normalize(c.name).includes(target),
  );
  if (partial) return partial.id;

  return null;
}

// ── Funcao principal ──────────────────────────────────────────────────────────

/**
 * Determina o category_id para uma transacao de forma deterministica.
 *
 * @param input      Dados da transacao
 * @param categories Categorias pai carregadas do banco (parent_id IS NULL)
 * @returns          category_id ou null se nenhuma regra bater
 */
export function categorizeTransaction(
  input: CategorizationInput,
  categories: Category[],
): string | null {
  if (categories.length === 0) return null;

  const descNorm = normalize(input.description);

  // Passo 1: categoria do provider (Pluggy)
  if (input.providerCategory) {
    const provNorm   = normalize(input.providerCategory);
    const mappedName = PROVIDER_CATEGORY_MAP[provNorm];
    if (mappedName) {
      const id = findCategoryId(mappedName, categories, input.type);
      if (id) return id;
    }
    const directId = findCategoryId(input.providerCategory, categories, input.type);
    if (directId) return directId;
  }

  // Passo 2: regras por termos na descricao
  for (const rule of RULES) {
    if (rule.type && rule.type !== "both" && rule.type !== input.type) continue;

    const matched = rule.terms.some((term) => descNorm.includes(normalize(term)));
    if (!matched) continue;

    const id = findCategoryId(rule.category, categories, input.type);
    if (id) return id;
  }

  // Passo 3: fallback por tipo
  if (input.type === "income") {
    const id = findCategoryId("Outras Receitas", categories, "income");
    if (id) return id;
  }

  return null;
}
