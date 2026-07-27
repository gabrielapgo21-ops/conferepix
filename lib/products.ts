/**
 * Produtos cadastrados — cadastro progressivo (sem ERP fiscal).
 * Conceito-chave: produtos podem entrar como "rápido" ou "temporário"
 * durante uma venda, e depois ser "completados" aos poucos.
 */

export type EstoqueStatus = "bastante" | "acabando" | "acabou" | "nao_informado";

export type CadastroTipo = "confirmado" | "rapido" | "temporario" | "sem_codigo";

export type CadastroStatus = "completo" | "incompleto";

export type ProductCategory =
  | "Acessórios"
  | "Bijuterias"
  | "Roupas"
  | "Calçados"
  | "Cosméticos"
  | "Variados"
  | "Outros";

export interface Product {
  id: string;
  nome: string;
  codigoBarras?: string;
  categoria?: ProductCategory;
  preco: number; // venda
  custo?: number; // compra (opcional)
  fotoUrl?: string; // emoji ou URL
  statusEstoque: EstoqueStatus;
  tipoCadastro: CadastroTipo;
  quantidadeAprox?: number;
  observacoes?: string;
  criadoEm: string; // ISO
  // Métricas calculadas (preenchidas a partir das transações)
  vendidoNoMes?: number;
  ultimaVenda?: string; // ISO
  faturamentoNoMes?: number;

  // ===== Campos específicos do CATÁLOGO SITE (opcional) =====
  // Usados quando o produto aparece no site externo do usuário
  catalogo?: {
    codigoSite?: string; // ex: "M-01", "F-38" (usado como id no site)
    genero?: "Masculino" | "Feminino" | "Unissex" | "Infantil";
    marca?: string; // ex: "Silverado", "Chapelaria Garcia"
    modelo?: string;
    material?: string; // ex: "Couro bovino", "Camurça"
    cor?: string;
    tamanhos?: string; // ex: "35,36,37" ou "44"
    estilo?: string; // ex: "Bico Redondo", "Bico Fino"
    caracteristicas?: string; // texto livre com detalhes
    faixa?: string; // ex: "R$ 250,00" (string livre pra mostrar no site)
    precoDe?: string; // preço "riscado" pra desconto (opcional)
    fotoSite?: string; // caminho relativo no site, ex: "fotos/M-01.webp"
    premium?: boolean;
    superPromocao?: boolean; // "isExtra" no site
    publicado?: boolean; // se true, sai no catálogo
  };
}

export const ESTOQUE_LABELS: Record<EstoqueStatus, string> = {
  bastante: "Tem bastante",
  acabando: "Está acabando",
  acabou: "Acabou",
  nao_informado: "Não informado",
};

export const TIPO_LABELS: Record<CadastroTipo, string> = {
  confirmado: "Confirmado",
  rapido: "Rápido",
  temporario: "Temporário",
  sem_codigo: "Sem código",
};

export const STATUS_CADASTRO_LABELS: Record<CadastroStatus, string> = {
  completo: "Completo",
  incompleto: "Incompleto",
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Acessórios",
  "Bijuterias",
  "Roupas",
  "Calçados",
  "Cosméticos",
  "Variados",
  "Outros",
];

/** Cor e ícone por categoria — pra visual rico estilo Shopify POS */
export const CATEGORY_STYLE: Record<
  ProductCategory,
  { cor: string; bg: string; icone: string }
> = {
  "Acessórios": { cor: "#B45309", bg: "#FEF3C7", icone: "👜" },
  "Bijuterias": { cor: "#9333EA", bg: "#F3E8FF", icone: "💎" },
  "Roupas":     { cor: "#0EA5E9", bg: "#E0F2FE", icone: "👚" },
  "Calçados":   { cor: "#DC2626", bg: "#FEE2E2", icone: "👡" },
  "Cosméticos": { cor: "#EC4899", bg: "#FCE7F3", icone: "🧴" },
  "Variados":   { cor: "#16A34A", bg: "#DCFCE7", icone: "📦" },
  "Outros":     { cor: "#6B7280", bg: "#F3F4F6", icone: "🏷️" },
};

/**
 * Calcula se o cadastro está completo.
 * Precisa de: nome não-genérico, categoria, preço, foto. Código é opcional pra "sem_codigo".
 */
export function computeStatusCadastro(p: Product): CadastroStatus {
  if (!p.nome || p.nome.length < 4) return "incompleto";
  if (!p.categoria) return "incompleto";
  if (!p.preco || p.preco <= 0) return "incompleto";
  if (!p.fotoUrl) return "incompleto";
  if (p.tipoCadastro === "temporario" || p.tipoCadastro === "rapido") return "incompleto";
  return "completo";
}

/**
 * Retorna o que falta pra cadastro ficar completo.
 */
export function getMissingFields(p: Product): string[] {
  const missing: string[] = [];
  if (!p.nome || p.nome.length < 4) missing.push("nome melhor");
  if (!p.fotoUrl) missing.push("foto");
  if (!p.categoria) missing.push("categoria");
  if (!p.codigoBarras && p.tipoCadastro !== "sem_codigo") missing.push("código");
  if (!p.preco || p.preco <= 0) missing.push("preço");
  return missing;
}

// ============================================================
// Mock data: 12 produtos realistas pra loja pequena BR
// ============================================================
function ago(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-bolsa-caramelo",
    nome: "Bolsa feminina caramelo",
    codigoBarras: "789012345001",
    categoria: "Acessórios",
    preco: 149.9,
    custo: 65,
    fotoUrl: "👜",
    statusEstoque: "bastante",
    tipoCadastro: "confirmado",
    quantidadeAprox: 8,
    criadoEm: ago(30),
  },
  {
    id: "prod-brinco-argola",
    nome: "Brinco argola dourado",
    codigoBarras: "789012345002",
    categoria: "Bijuterias",
    preco: 29.9,
    custo: 8,
    fotoUrl: "💎",
    statusEstoque: "acabando",
    tipoCadastro: "confirmado",
    quantidadeAprox: 3,
    criadoEm: ago(25),
  },
  {
    id: "prod-blusa-canelada",
    nome: "Blusa canelada preta",
    codigoBarras: "789012345003",
    categoria: "Roupas",
    preco: 79.9,
    custo: 32,
    fotoUrl: "👚",
    statusEstoque: "bastante",
    tipoCadastro: "confirmado",
    quantidadeAprox: 12,
    criadoEm: ago(20),
  },
  {
    id: "prod-presilha-infantil",
    nome: "Presilha infantil colorida",
    codigoBarras: "789012345004",
    categoria: "Acessórios",
    preco: 12.9,
    custo: 3,
    fotoUrl: "🎀",
    statusEstoque: "bastante",
    tipoCadastro: "confirmado",
    quantidadeAprox: 25,
    criadoEm: ago(18),
  },
  {
    id: "prod-creme-hidratante",
    nome: "Creme hidratante 250ml",
    codigoBarras: "789012345005",
    categoria: "Cosméticos",
    preco: 49.9,
    custo: 22,
    fotoUrl: "🧴",
    statusEstoque: "acabando",
    tipoCadastro: "confirmado",
    quantidadeAprox: 4,
    criadoEm: ago(15),
  },
  {
    id: "prod-chinelo-fem",
    nome: "Chinelo feminino",
    codigoBarras: "789012345006",
    categoria: "Calçados",
    preco: 39.9,
    custo: 15,
    fotoUrl: "👡",
    statusEstoque: "bastante",
    tipoCadastro: "confirmado",
    quantidadeAprox: 10,
    criadoEm: ago(12),
  },
  {
    id: "prod-sem-codigo-promo",
    nome: "Produto sem código - promoção",
    categoria: undefined,
    preco: 19.9,
    statusEstoque: "nao_informado",
    tipoCadastro: "sem_codigo",
    criadoEm: ago(8),
  },
  {
    id: "prod-lote-bijus",
    nome: "Lote novo - bijuterias variadas",
    categoria: "Bijuterias",
    preco: 0,
    statusEstoque: "nao_informado",
    tipoCadastro: "temporario",
    observacoes: "Preço varia por peça (R$ 5–25). Revisar.",
    criadoEm: ago(5),
  },
  {
    id: "prod-item-avulso-25",
    nome: "Item avulso R$ 25",
    preco: 25,
    statusEstoque: "nao_informado",
    tipoCadastro: "temporario",
    criadoEm: ago(3),
  },
  {
    id: "prod-vestido-floral",
    nome: "Vestido floral midi",
    codigoBarras: "789012345010",
    categoria: "Roupas",
    preco: 129.9,
    custo: 48,
    fotoUrl: "👗",
    statusEstoque: "bastante",
    tipoCadastro: "confirmado",
    quantidadeAprox: 6,
    criadoEm: ago(22),
  },
  {
    id: "prod-carteira-masc",
    nome: "Carteira masculina preta",
    codigoBarras: "789012345011",
    categoria: "Acessórios",
    preco: 89.9,
    custo: 38,
    fotoUrl: "👛",
    statusEstoque: "acabou",
    tipoCadastro: "confirmado",
    quantidadeAprox: 0,
    criadoEm: ago(28),
  },
  {
    id: "prod-cinto-fem-dourado",
    nome: "Cinto feminino dourado",
    categoria: "Acessórios",
    preco: 45,
    statusEstoque: "acabando",
    tipoCadastro: "rapido",
    observacoes: "Falta tirar foto e cadastrar código.",
    criadoEm: ago(2),
  },
];

/**
 * Helper pra gerar vendido_no_mes/última_venda a partir de transações
 * (simulação determinística baseada no id pra mock ficar estável).
 */
export function enrichWithSales(products: Product[]): Product[] {
  const salesMock: Record<string, { qtd: number; ultima: number; ticket: number }> = {
    "prod-bolsa-caramelo": { qtd: 4, ultima: 1, ticket: 149.9 },
    "prod-brinco-argola": { qtd: 12, ultima: 0, ticket: 29.9 },
    "prod-blusa-canelada": { qtd: 8, ultima: 0, ticket: 79.9 },
    "prod-presilha-infantil": { qtd: 22, ultima: 1, ticket: 12.9 },
    "prod-creme-hidratante": { qtd: 7, ultima: 2, ticket: 49.9 },
    "prod-chinelo-fem": { qtd: 9, ultima: 1, ticket: 39.9 },
    "prod-vestido-floral": { qtd: 3, ultima: 4, ticket: 129.9 },
    "prod-cinto-fem-dourado": { qtd: 2, ultima: 1, ticket: 45 },
    "prod-item-avulso-25": { qtd: 5, ultima: 0, ticket: 25 },
    "prod-sem-codigo-promo": { qtd: 3, ultima: 3, ticket: 19.9 },
  };
  return products.map((p) => {
    const s = salesMock[p.id];
    if (!s) return p;
    return {
      ...p,
      vendidoNoMes: s.qtd,
      ultimaVenda: ago(s.ultima),
      faturamentoNoMes: +(s.qtd * s.ticket).toFixed(2),
    };
  });
}
