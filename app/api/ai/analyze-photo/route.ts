/**
 * Analisa foto de produto em DETALHE.
 *
 * Estratégia:
 *  1. Tenta Llama 3.2 11B Vision (mais detalhado, melhor pra produtos)
 *  2. Cai pro LLaVA 1.5 (estável, free) se falhar
 *  3. Prompt em INGLÊS (modelos são MUITO melhores em EN), saída em JSON
 *  4. Parser traduz EN → PT-BR
 *
 * Retorna ProductSuggestion com 15+ campos.
 */

import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = [
  "Acessórios",
  "Bijuterias",
  "Roupas",
  "Calçados",
  "Cosméticos",
  "Variados",
  "Outros",
] as const;

type Categoria = (typeof CATEGORIES)[number];

interface ProductSuggestion {
  // Básicos
  nome: string;
  categoria: Categoria;
  cor?: string;
  coresSecundarias?: string[];
  modelo?: string;
  // Detalhes ricos
  material?: string;
  padrao?: string; // liso, listrado, floral, animal print
  estilo?: string; // casual, social, esportivo
  publico?: string; // feminino, masculino, infantil, unissex
  estacao?: string; // verão, inverno, qualquer
  acabamento?: string; // fivela, zíper, cadarço
  ocasiao?: string; // dia a dia, festa, trabalho, praia
  // Conteúdo gerado
  descricaoCurta?: string; // 1 frase pra vitrine
  descricaoRica?: string; // 2-3 parágrafos pra marketplace
  hashtags?: string[]; // 8-15 hashtags
  // Sugestões
  precoSugerido?: number;
  // Meta
  confianca: number;
  mock: boolean;
}

// Prompt em INGLÊS — LLMs são muito melhores em inglês
const PROMPT_DETALHADO = `You are an EXPERT product analyst for a small Brazilian retail store. Analyze this product photo in EXTREME DETAIL.

CRITICAL RULES:
- IGNORE all text, labels, tags, brands, words, or letters in the image
- DO NOT transcribe text
- Focus 100% on the PHYSICAL OBJECT — its shape, material, color, style, details

Look at the image and respond in this EXACT format (one line per field, no JSON, no markdown):

PRODUCT_TYPE: [specific type, e.g., "cowboy boot", "midi dress", "hoop earring"]
CATEGORY: [pick ONE: footwear, clothing, jewelry, accessory, cosmetic, other]
MAIN_COLOR: [main color, e.g., "brown", "black", "white"]
SECONDARY_COLORS: [other visible colors separated by commas, or "none"]
MATERIAL: [main material if visible: leather, suede, cotton, denim, plastic, metal, etc, or "unknown"]
PATTERN: [solid, striped, floral, animal print, polka dot, plaid, geometric, or "solid"]
STYLE: [casual, formal, sport, vintage, classic, modern, bohemian, edgy]
TARGET_AUDIENCE: [women, men, kids, unisex]
SEASON: [summer, winter, fall, spring, all-seasons]
DETAILS: [visible details like buckle, zipper, laces, embroidery, pockets, ribbons - separated by commas, or "none"]
OCCASION: [everyday, party, work, beach, sports, formal]
SHORT_DESC: [ONE short sentence describing the product, max 80 chars, NO references to text in image]
RICH_DESC: [2-3 sentences in English describing material, look, and feel — for online catalog. NO brand references.]
ESTIMATED_PRICE_BRL: [rough price estimate in Brazilian Reais for this type of product in a small store, just the number, e.g., 89.90]

Be specific and observational. Do not say "unknown" if you can clearly see the detail. Only say "unknown" when truly not visible.`;

const MODELOS_VISION = [
  "@cf/meta/llama-3.2-11b-vision-instruct",
  "@cf/llava-hf/llava-1.5-7b-hf",
];

// ============================================================================
// DICIONÁRIOS DE TRADUÇÃO EN→PT
// ============================================================================

const CAT_MAP: Record<string, Categoria> = {
  footwear: "Calçados", shoes: "Calçados",
  clothing: "Roupas", clothes: "Roupas", apparel: "Roupas",
  jewelry: "Bijuterias", jewellery: "Bijuterias",
  accessory: "Acessórios", accessories: "Acessórios",
  cosmetic: "Cosméticos", cosmetics: "Cosméticos", makeup: "Cosméticos",
  other: "Outros",
};

const COR_MAP: Record<string, string> = {
  black: "Preto", white: "Branco", red: "Vermelho", blue: "Azul",
  "navy blue": "Azul marinho", navy: "Azul marinho",
  "light blue": "Azul claro", "dark blue": "Azul escuro",
  green: "Verde", "dark green": "Verde escuro", "light green": "Verde claro",
  yellow: "Amarelo", orange: "Laranja", pink: "Rosa",
  "hot pink": "Pink", "light pink": "Rosa claro",
  purple: "Roxo", violet: "Violeta",
  brown: "Marrom", "dark brown": "Marrom escuro", "light brown": "Marrom claro",
  tan: "Caramelo", caramel: "Caramelo",
  gray: "Cinza", grey: "Cinza",
  beige: "Bege", cream: "Creme",
  gold: "Dourado", silver: "Prateado", bronze: "Bronze",
  burgundy: "Vinho", wine: "Vinho",
  coral: "Coral", turquoise: "Turquesa", teal: "Azul-petróleo",
  multicolor: "Colorido", "multi-color": "Colorido",
  nude: "Nude", "off-white": "Off-white",
};

const MAT_MAP: Record<string, string> = {
  leather: "Couro", "faux leather": "Couro sintético",
  suede: "Camurça", nubuck: "Nobuck",
  cotton: "Algodão", linen: "Linho", silk: "Seda",
  wool: "Lã", cashmere: "Cashmere", velvet: "Veludo",
  denim: "Jeans", jean: "Jeans",
  polyester: "Poliéster", nylon: "Nylon", lycra: "Lycra",
  plastic: "Plástico", acrylic: "Acrílico",
  metal: "Metal", "stainless steel": "Aço inox", brass: "Latão",
  gold: "Ouro", silver: "Prata",
  wood: "Madeira", bamboo: "Bambu",
  rubber: "Borracha", canvas: "Lona",
  ceramic: "Cerâmica", glass: "Vidro",
  fabric: "Tecido", knit: "Tricô",
};

const PADRAO_MAP: Record<string, string> = {
  solid: "Liso", "solid color": "Liso",
  striped: "Listrado", stripes: "Listrado",
  floral: "Floral", flowers: "Floral",
  "animal print": "Animal print",
  leopard: "Onça", zebra: "Zebra",
  "polka dot": "Bolinhas", dots: "Bolinhas",
  plaid: "Xadrez", checkered: "Xadrez",
  geometric: "Geométrico", abstract: "Abstrato",
  paisley: "Paisley", tropical: "Tropical",
};

const ESTILO_MAP: Record<string, string> = {
  casual: "Casual", formal: "Social", "semi-formal": "Esporte fino",
  sport: "Esportivo", sporty: "Esportivo", athletic: "Esportivo",
  vintage: "Vintage", retro: "Retrô",
  classic: "Clássico", traditional: "Tradicional",
  modern: "Moderno", minimalist: "Minimalista",
  bohemian: "Boho", boho: "Boho",
  edgy: "Despojado", rocker: "Rocker",
  elegant: "Elegante", chic: "Chique",
};

const PUBLICO_MAP: Record<string, string> = {
  women: "Feminino", woman: "Feminino", female: "Feminino", ladies: "Feminino",
  men: "Masculino", man: "Masculino", male: "Masculino",
  kids: "Infantil", children: "Infantil", baby: "Bebê",
  unisex: "Unissex",
};

const ESTACAO_MAP: Record<string, string> = {
  summer: "Verão", winter: "Inverno",
  fall: "Outono", autumn: "Outono",
  spring: "Primavera",
  "all-seasons": "Todas as estações", "all seasons": "Todas as estações",
  "any season": "Todas as estações",
};

const OCASIAO_MAP: Record<string, string> = {
  everyday: "Dia a dia", daily: "Dia a dia", casual: "Casual",
  party: "Festa", evening: "Festa", night: "Noite",
  work: "Trabalho", office: "Escritório",
  beach: "Praia", pool: "Piscina",
  sports: "Esporte", gym: "Academia",
  formal: "Formal", wedding: "Casamento",
};

const DETALHE_MAP: Record<string, string> = {
  buckle: "Fivela", zipper: "Zíper", laces: "Cadarço",
  embroidery: "Bordado", "embroidered": "Bordado",
  pocket: "Bolso", pockets: "Bolsos",
  ribbon: "Laço", bow: "Laço",
  button: "Botão", buttons: "Botões",
  fringe: "Franjas", tassels: "Borlas",
  rivets: "Tachas", studs: "Tachas",
  chain: "Corrente", chains: "Correntes",
  belt: "Cinto", strap: "Alça", straps: "Alças",
  collar: "Gola", hood: "Capuz",
  ruffle: "Babado", lace: "Renda",
  sequins: "Paetês", glitter: "Glitter",
  applique: "Aplicação",
  print: "Estampa",
};

const TYPE_MAP: Record<string, string> = {
  // Calçados específicos
  "cowboy boot": "Bota cowboy",
  "western boot": "Bota cowboy",
  "ankle boot": "Bota cano curto",
  "knee boot": "Bota cano longo",
  "knee-high boot": "Bota cano longo",
  "over-the-knee boot": "Bota acima do joelho",
  "chelsea boot": "Bota chelsea",
  "combat boot": "Coturno",
  "hiking boot": "Bota de trilha",
  "rain boot": "Galocha", "rubber boot": "Galocha",
  bootie: "Bota cano curto", booties: "Bota cano curto",
  boot: "Bota", boots: "Bota",
  "running shoe": "Tênis", "athletic shoe": "Tênis",
  "tennis shoe": "Tênis", "sport shoe": "Tênis",
  sneaker: "Tênis", sneakers: "Tênis",
  trainers: "Tênis", trainer: "Tênis",
  "high heel": "Salto alto", stiletto: "Scarpin",
  pump: "Scarpin", pumps: "Scarpin",
  wedge: "Anabela", wedges: "Anabela",
  heel: "Salto", heels: "Salto",
  "dress shoe": "Sapato social", oxford: "Sapato oxford",
  loafer: "Mocassim", loafers: "Mocassim",
  moccasin: "Mocassim",
  "flip flop": "Chinelo", flipflop: "Chinelo",
  sandal: "Sandália", sandals: "Sandália",
  slipper: "Chinelo", slippers: "Chinelo",
  "ballet flat": "Sapatilha", flat: "Sapatilha", flats: "Sapatilha",
  espadrille: "Alpargata",
  shoe: "Sapato", shoes: "Sapato",
  // Roupas
  "t-shirt": "Camiseta", tshirt: "Camiseta", tee: "Camiseta",
  "tank top": "Regata",
  "polo shirt": "Camisa polo", polo: "Camisa polo",
  "dress shirt": "Camisa social",
  blouse: "Blusa", shirt: "Camisa",
  "long sleeve": "Manga longa", "short sleeve": "Manga curta",
  "maxi dress": "Vestido longo", "midi dress": "Vestido midi",
  "mini dress": "Vestido curto", "evening dress": "Vestido de festa",
  "summer dress": "Vestido", dress: "Vestido",
  "pencil skirt": "Saia lápis", "maxi skirt": "Saia longa", skirt: "Saia",
  leggings: "Legging", legging: "Legging",
  "yoga pants": "Calça de yoga", "sweat pants": "Calça moletom",
  sweatpants: "Calça moletom",
  jeans: "Calça jeans", jean: "Calça jeans",
  pants: "Calça", pant: "Calça", trousers: "Calça",
  shorts: "Shorts", short: "Shorts",
  "denim jacket": "Jaqueta jeans", "leather jacket": "Jaqueta de couro",
  "bomber jacket": "Jaqueta bomber",
  jacket: "Jaqueta", blazer: "Blazer",
  "trench coat": "Trench coat", coat: "Casaco",
  cardigan: "Cardigã", sweater: "Suéter", pullover: "Suéter",
  hoodie: "Moletom com capuz",
  sweatshirt: "Moletom", jumpsuit: "Macacão", romper: "Macaquinho",
  swimsuit: "Maiô", bikini: "Biquíni",
  pajama: "Pijama", pajamas: "Pijama",
  bra: "Sutiã", underwear: "Cueca",
  // Bijuterias
  "hoop earring": "Brinco argola", "stud earring": "Brinco pino",
  "drop earring": "Brinco gota",
  earring: "Brinco", earrings: "Brinco",
  "choker necklace": "Gargantilha", choker: "Gargantilha",
  "pendant necklace": "Colar com pingente",
  necklace: "Colar", chain: "Corrente",
  "charm bracelet": "Pulseira de berloques", bangle: "Bracelete",
  bracelet: "Pulseira", anklet: "Tornozeleira",
  "engagement ring": "Anel de noivado", "wedding ring": "Aliança",
  ring: "Anel",
  pendant: "Pingente", brooch: "Broche",
  // Acessórios
  "tote bag": "Bolsa sacola", "crossbody bag": "Bolsa transversal",
  "shoulder bag": "Bolsa de ombro", "handbag": "Bolsa de mão",
  "clutch bag": "Bolsa clutch", clutch: "Bolsa clutch",
  "backpack": "Mochila", "fanny pack": "Pochete",
  bag: "Bolsa", purse: "Bolsa",
  wallet: "Carteira", "card holder": "Porta-cartão",
  "baseball cap": "Boné", cap: "Boné",
  "sun hat": "Chapéu de sol", "winter hat": "Gorro", beanie: "Gorro",
  hat: "Chapéu",
  scarf: "Cachecol", shawl: "Xale", bandana: "Bandana",
  "leather belt": "Cinto de couro", belt: "Cinto",
  sunglasses: "Óculos de sol", glasses: "Óculos",
  "wrist watch": "Relógio", watch: "Relógio",
  "hair clip": "Presilha", scrunchie: "Elástico",
  // Cosméticos
  "lip gloss": "Gloss labial", "lip balm": "Hidratante labial",
  lipstick: "Batom",
  mascara: "Máscara de cílios",
  eyeliner: "Delineador", "eye shadow": "Sombra",
  foundation: "Base", concealer: "Corretivo",
  blush: "Blush", bronzer: "Bronzer", highlighter: "Iluminador",
  perfume: "Perfume", cologne: "Colônia",
  "nail polish": "Esmalte",
  moisturizer: "Hidratante", "face cream": "Creme facial",
  "body lotion": "Loção corporal", shampoo: "Shampoo",
  conditioner: "Condicionador",
};

// ============================================================================
// HELPERS DE PARSE
// ============================================================================

function getField(text: string, key: string): string {
  const re = new RegExp(`${key}\\s*:\\s*(.+?)(?:\\n|$)`, "i");
  const m = text.match(re);
  return m ? m[1].trim().replace(/^[\[\("']|[\]\)"']$/g, "").trim() : "";
}

function traduzMap(s: string, map: Record<string, string>): string {
  const low = s.toLowerCase().trim();
  // Tenta match exato primeiro
  if (map[low]) return map[low];
  // Procura substring
  for (const [en, pt] of Object.entries(map)) {
    if (low.includes(en)) return pt;
  }
  return s; // mantém original se não achou
}

function traduzLista(s: string, map: Record<string, string>): string[] {
  if (!s || /^(none|n\/a|nothing|unknown)$/i.test(s.trim())) return [];
  return s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => traduzMap(x, map))
    .filter((x) => !!x);
}

function ehVago(s: string): boolean {
  return !s || /^(unknown|none|n\/a|nothing|not visible|no\b)/i.test(s.trim());
}

function parseRespostaIA(texto: string): Partial<ProductSuggestion> {
  const productType = getField(texto, "PRODUCT_TYPE").toLowerCase();
  const rawCategory = getField(texto, "CATEGORY").toLowerCase();
  const mainColor = getField(texto, "MAIN_COLOR");
  const secondaryColors = getField(texto, "SECONDARY_COLORS");
  const material = getField(texto, "MATERIAL");
  const pattern = getField(texto, "PATTERN");
  const style = getField(texto, "STYLE");
  const audience = getField(texto, "TARGET_AUDIENCE");
  const season = getField(texto, "SEASON");
  const details = getField(texto, "DETAILS");
  const occasion = getField(texto, "OCCASION");
  const shortDesc = getField(texto, "SHORT_DESC");
  const richDesc = getField(texto, "RICH_DESC");
  const priceStr = getField(texto, "ESTIMATED_PRICE_BRL");

  // Categoria
  let categoria: Categoria = "Outros";
  for (const [en, pt] of Object.entries(CAT_MAP)) {
    if (rawCategory.includes(en)) {
      categoria = pt;
      break;
    }
  }
  // Fallback pelo tipo
  if (categoria === "Outros") {
    if (/(boot|shoe|sneaker|sandal|heel|slipper|loafer|flat|cowboy)/.test(productType))
      categoria = "Calçados";
    else if (/(shirt|dress|blouse|skirt|pant|jean|jacket|coat|sweater|hoodie|short|romper|jumpsuit)/.test(productType))
      categoria = "Roupas";
    else if (/(earring|necklace|bracelet|ring|pendant|brooch|chain|choker)/.test(productType))
      categoria = "Bijuterias";
    else if (/(bag|purse|wallet|hat|cap|scarf|belt|sunglass|watch)/.test(productType))
      categoria = "Acessórios";
    else if (/(lipstick|mascara|foundation|perfume|cream|nail|polish|blush|gloss)/.test(productType))
      categoria = "Cosméticos";
  }

  // Nome (tipo de produto traduzido)
  let nomePt = productType;
  for (const [en, pt] of Object.entries(TYPE_MAP)) {
    if (productType.includes(en)) {
      nomePt = pt;
      break;
    }
  }
  nomePt = nomePt.charAt(0).toUpperCase() + nomePt.slice(1);

  // Cor traduzida
  let cor: string | undefined;
  if (!ehVago(mainColor)) {
    cor = traduzMap(mainColor, COR_MAP) || mainColor;
  }

  // Cores secundárias
  const coresSecundarias = traduzLista(secondaryColors, COR_MAP);

  // Material
  let materialPt: string | undefined;
  if (!ehVago(material)) {
    materialPt = traduzMap(material, MAT_MAP);
  }

  // Padrão
  let padraoPt: string | undefined;
  if (!ehVago(pattern) && pattern.toLowerCase() !== "solid") {
    padraoPt = traduzMap(pattern, PADRAO_MAP);
  }

  // Estilo
  let estiloPt: string | undefined;
  if (!ehVago(style)) {
    estiloPt = traduzMap(style, ESTILO_MAP);
  }

  // Público
  let publicoPt: string | undefined;
  if (!ehVago(audience)) {
    publicoPt = traduzMap(audience, PUBLICO_MAP);
  }

  // Estação
  let estacaoPt: string | undefined;
  if (!ehVago(season)) {
    estacaoPt = traduzMap(season, ESTACAO_MAP);
  }

  // Acabamento (detalhes)
  let acabamentoPt: string | undefined;
  const detalhes = traduzLista(details, DETALHE_MAP);
  if (detalhes.length > 0) {
    acabamentoPt = detalhes.join(", ");
  }

  // Ocasião
  let ocasiaoPt: string | undefined;
  if (!ehVago(occasion)) {
    ocasiaoPt = traduzMap(occasion, OCASIAO_MAP);
  }

  // Constrói nome final completo: "Bota cowboy marrom de couro"
  let nomeFinal = nomePt;
  const adicionais: string[] = [];
  if (cor && !nomeFinal.toLowerCase().includes(cor.toLowerCase())) {
    adicionais.push(cor.toLowerCase());
  }
  if (materialPt && /(couro|jeans|veludo|seda|tricô)/i.test(materialPt)) {
    adicionais.push(`de ${materialPt.toLowerCase()}`);
  }
  if (adicionais.length > 0 && nomeFinal.length < 25) {
    nomeFinal = `${nomePt} ${adicionais.join(" ")}`;
  }
  if (nomeFinal.length > 60) nomeFinal = nomeFinal.slice(0, 60);

  // Descrição rica traduzida (simples — preserva inglês se não tradutor)
  // O modelo dá em EN. Vamos pegar a descrição em PT-BR diretamente da SHORT_DESC quando der,
  // mas pra RICH_DESC mantemos em inglês como fallback. Idealmente traduzir, mas demos prioridade
  // ao essencial. (Futuro: fazer outra chamada IA pra traduzir.)
  const descricaoCurta = !ehVago(shortDesc) ? shortDesc : undefined;
  const descricaoRica = !ehVago(richDesc) ? richDesc : undefined;

  // Hashtags inferidas — não pede pra IA, gera com base nos dados
  const hashtagsArr: string[] = [];
  if (categoria !== "Outros") {
    hashtagsArr.push(`#${categoria.toLowerCase().replace(/ç/g, "c").replace(/[áàâã]/g, "a").replace(/[éê]/g, "e").replace(/í/g, "i").replace(/[óôõ]/g, "o").replace(/ú/g, "u")}`);
  }
  if (publicoPt) hashtagsArr.push(`#${publicoPt.toLowerCase()}`);
  if (estiloPt) hashtagsArr.push(`#${estiloPt.toLowerCase().replace(/\s/g, "")}`);
  if (cor) hashtagsArr.push(`#${cor.toLowerCase().replace(/\s/g, "")}`);
  hashtagsArr.push("#modabrasil", "#vendas", "#lojinha");
  const hashtags = Array.from(new Set(hashtagsArr));

  // Preço sugerido
  let precoSugerido: number | undefined;
  if (priceStr) {
    const num = parseFloat(
      priceStr.replace(/[^\d.,-]/g, "").replace(",", ".")
    );
    if (!isNaN(num) && num > 0 && num < 10000) {
      precoSugerido = num;
    }
  }

  return {
    nome: nomeFinal,
    categoria,
    cor,
    coresSecundarias: coresSecundarias.length > 0 ? coresSecundarias : undefined,
    modelo: estiloPt,
    material: materialPt,
    padrao: padraoPt,
    estilo: estiloPt,
    publico: publicoPt,
    estacao: estacaoPt,
    acabamento: acabamentoPt,
    ocasiao: ocasiaoPt,
    descricaoCurta,
    descricaoRica,
    hashtags,
    precoSugerido,
    confianca: 0.85,
    mock: false,
  };
}

// ============================================================================
// CHAMADA À CLOUDFLARE — cascata de modelos
// ============================================================================

async function callVisionModel(
  imageArray: number[],
  accountId: string,
  apiToken: string
): Promise<string> {
  for (const modelo of MODELOS_VISION) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelo}`;

      let body: string;
      if (modelo.includes("llama-3.2")) {
        // Llama 3.2 Vision usa formato OpenAI messages com image_url base64
        const base64 = Buffer.from(imageArray).toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        body = JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT_DETALHADO },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 800,
          temperature: 0.3,
        });
      } else {
        // LLaVA usa formato {image: bytes, prompt}
        body = JSON.stringify({
          image: imageArray,
          prompt: PROMPT_DETALHADO,
          max_tokens: 800,
        });
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const texto: string =
        data?.result?.response?.choices?.[0]?.message?.content ||
        data?.result?.response ||
        data?.result?.description ||
        "";

      if (texto && texto.length > 50) {
        return texto;
      }
    } catch {
      continue;
    }
  }
  throw new Error("Nenhum modelo de visão respondeu");
}

async function analyzeWithCloudflare(
  imageBase64: string
): Promise<ProductSuggestion> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("Credenciais Cloudflare não configuradas");
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const imageArray = Array.from(buffer);

  const responseText = await callVisionModel(imageArray, accountId, apiToken);
  const parsed = parseRespostaIA(responseText);

  return {
    nome: parsed.nome || "Produto novo",
    categoria: parsed.categoria || "Outros",
    cor: parsed.cor,
    coresSecundarias: parsed.coresSecundarias,
    modelo: parsed.modelo,
    material: parsed.material,
    padrao: parsed.padrao,
    estilo: parsed.estilo,
    publico: parsed.publico,
    estacao: parsed.estacao,
    acabamento: parsed.acabamento,
    ocasiao: parsed.ocasiao,
    descricaoCurta: parsed.descricaoCurta,
    descricaoRica: parsed.descricaoRica,
    hashtags: parsed.hashtags,
    precoSugerido: parsed.precoSugerido,
    confianca: parsed.confianca || 0.8,
    mock: false,
  };
}

// ============================================================================
// MOCK FALLBACK (regras simples)
// ============================================================================

const MOCK_POOL: ProductSuggestion[] = [
  {
    nome: "Bota cano longo marrom",
    categoria: "Calçados",
    cor: "Marrom",
    modelo: "Cano longo",
    material: "Couro",
    estilo: "Casual",
    publico: "Feminino",
    estacao: "Inverno",
    descricaoCurta: "Bota de couro marrom estilo cano longo.",
    hashtags: ["#calcados", "#feminino", "#bota", "#marrom", "#inverno"],
    precoSugerido: 189.9,
    confianca: 0.7,
    mock: true,
  },
  {
    nome: "Bolsa transversal preta",
    categoria: "Acessórios",
    cor: "Preto",
    modelo: "Transversal",
    material: "Couro sintético",
    estilo: "Casual",
    publico: "Feminino",
    descricaoCurta: "Bolsa transversal em couro sintético preto.",
    hashtags: ["#acessorios", "#bolsa", "#preta", "#feminino"],
    precoSugerido: 119.9,
    confianca: 0.7,
    mock: true,
  },
];

function pickMock(): ProductSuggestion {
  return MOCK_POOL[Math.floor(Math.random() * MOCK_POOL.length)];
}

// ============================================================================
// HANDLER POST
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const imagemBase64 = body.imagem as string | undefined;

    if (!imagemBase64) {
      return NextResponse.json(
        { error: "Manda a imagem como base64 no campo 'imagem'" },
        { status: 400 }
      );
    }

    const hasCloudflare =
      !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_API_TOKEN;

    if (hasCloudflare) {
      try {
        const suggestion = await analyzeWithCloudflare(imagemBase64);
        return NextResponse.json({
          ok: true,
          sugestao: suggestion,
          modo: "cloudflare",
        });
      } catch (e) {
        console.warn("[AI] falhou:", (e as Error).message);
        return NextResponse.json({
          ok: true,
          sugestao: pickMock(),
          modo: "mock",
          mensagem: "IA fora do ar: " + (e as Error).message,
        });
      }
    }

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    return NextResponse.json({
      ok: true,
      sugestao: pickMock(),
      modo: "mock",
      mensagem: "Sem credenciais Cloudflare",
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
