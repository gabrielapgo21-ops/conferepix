/**
 * Estúdio de Marketing IA.
 *
 * Aceita um tipo de geração e os dados do produto, retorna texto/sugestão.
 *
 * Tipos:
 *  - "post_instagram": post pronto pra Instagram/Facebook com chamada
 *  - "descricao_marketplace": descrição rica pra Shopee/ML/site
 *  - "copy_whatsapp": mensagem de divulgação no WhatsApp
 *  - "hashtags": 15 hashtags relevantes
 *  - "preco_sugerido": preço sugerido + análise
 *  - "ideia_promocao": 3 ideias de promoção/combo
 */

import { NextRequest, NextResponse } from "next/server";

type Tipo =
  | "post_instagram"
  | "descricao_marketplace"
  | "copy_whatsapp"
  | "hashtags"
  | "preco_sugerido"
  | "ideia_promocao";

interface ProdutoInfo {
  nome: string;
  categoria?: string;
  cor?: string;
  modelo?: string;
  preco?: number;
  custo?: number;
  vendidoNoMes?: number;
  observacoes?: string;
}

interface ContextoLoja {
  nomeLoja?: string;
  cidade?: string;
}

const TIPO_PROMPTS: Record<Tipo, (p: ProdutoInfo, l: ContextoLoja) => string> = {
  post_instagram: (p, l) => `Você é copywriter de uma loja brasileira pequena. Gera um post de Instagram pra esse produto:

PRODUTO: ${p.nome}
${p.categoria ? `Categoria: ${p.categoria}` : ""}
${p.cor ? `Cor: ${p.cor}` : ""}
${p.modelo ? `Modelo: ${p.modelo}` : ""}
${p.preco ? `Preço: R$ ${p.preco.toFixed(2)}` : ""}
${l.nomeLoja ? `Loja: ${l.nomeLoja}` : ""}

REGRAS:
- Tom: divertido, brasileiro, fluido
- 3-5 linhas de texto curto
- 1 emoji por linha no máximo
- 1 chamada pra ação ("comenta aqui!", "manda DM", "corre que voou")
- NÃO inclui hashtags (isso vem em outra chamada)
- NÃO usa palavras hipocritamente bonitas ("apaixonante", "incrível", "imperdível")

Responda APENAS o texto do post. Sem aspas, sem markdown, sem explicação.`,

  descricao_marketplace: (p) => `Você é redator de e-commerce brasileiro. Gera descrição rica pra esse produto vender em marketplace (Shopee, Mercado Livre):

PRODUTO: ${p.nome}
${p.categoria ? `Categoria: ${p.categoria}` : ""}
${p.cor ? `Cor: ${p.cor}` : ""}
${p.modelo ? `Modelo: ${p.modelo}` : ""}
${p.observacoes ? `Detalhes: ${p.observacoes}` : ""}

REGRAS:
- 4-6 linhas
- Estrutura: linha 1 = título magnético; linhas 2-4 = descrição/benefícios; linha 5 = quem é pra; linha 6 = chamada
- Sem clichê. Português direto e prático.
- Mencione material/uso quando fizer sentido
- Tom profissional mas humano

Responde APENAS a descrição. Sem markdown.`,

  copy_whatsapp: (p, l) => `Você é dona de uma loja BR e tá divulgando um produto novo no WhatsApp.

PRODUTO: ${p.nome}
${p.preco ? `Preço: R$ ${p.preco.toFixed(2)}` : ""}
${p.cor ? `Cor: ${p.cor}` : ""}
${l.nomeLoja ? `Loja: ${l.nomeLoja}` : ""}

Escreve uma mensagem CURTA pra status do WhatsApp:
- 2-3 linhas no máximo
- Tom brasileira, informal mas vendendo
- Emoji 1 ou 2
- Chamada clara: "passa lá", "chama no DM", "tem pouco"

Responde APENAS a mensagem. Sem aspas.`,

  hashtags: (p) => `Gera 15 hashtags relevantes pra esse produto vender no Instagram brasileiro:

PRODUTO: ${p.nome}
${p.categoria ? `Categoria: ${p.categoria}` : ""}
${p.cor ? `Cor: ${p.cor}` : ""}

REGRAS:
- Mistura: 5 ALTAS (#moda #estilo etc, muitas pessoas), 5 MÉDIAS (categoria específica), 5 NICHO (pequenas, qualificadas)
- Em português BR
- SEM #s da marca da loja
- Sem espaços, com #

Responda APENAS uma linha com as 15 hashtags separadas por espaço. Nada mais.`,

  preco_sugerido: (p) => `Você é consultor de pequenos negócios brasileiros. Sugere um preço de venda inteligente pra esse produto:

PRODUTO: ${p.nome}
${p.categoria ? `Categoria: ${p.categoria}` : ""}
${p.custo ? `Custo (compra): R$ ${p.custo.toFixed(2)}` : "Custo: não informado"}
${p.preco ? `Preço atual: R$ ${p.preco.toFixed(2)}` : ""}
${p.vendidoNoMes !== undefined ? `Vendeu ${p.vendidoNoMes}x esse mês` : ""}

REGRAS:
- Sugere UM preço (em reais)
- Explica em 2-3 linhas POR QUE
- Considera: margem saudável (60-80% pra varejo pequeno), giro, mercado BR
- Se não tiver custo, sugere com base no mercado e fala que sem custo é estimativa
- Estrutura:
  Linha 1: "Sugiro: R$ X,XX"
  Linha 2-3: explicação curta
  Linha 4: "Margem nesse preço: XX%" (se tiver custo)

Responda em texto puro, sem markdown.`,

  ideia_promocao: (p) => `Você é consultora de varejo BR. Sugere 3 ideias práticas de promoção pra esse produto:

PRODUTO: ${p.nome}
${p.categoria ? `Categoria: ${p.categoria}` : ""}
${p.preco ? `Preço: R$ ${p.preco.toFixed(2)}` : ""}
${p.vendidoNoMes !== undefined ? `Vende ${p.vendidoNoMes}x/mês` : ""}

REGRAS:
- 3 ideias numeradas (1., 2., 3.)
- Cada uma: nome curto + 1 frase explicando
- Variadas (1 desconto direto, 1 combo, 1 fidelidade/criativa)
- Específicas e práticas (não "faça promoção")
- BR, dia a dia de pequeno comércio

Responda APENAS as 3 ideias numeradas. Nada mais.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tipo = body.tipo as Tipo;
    const produto = (body.produto || {}) as ProdutoInfo;
    const loja = (body.loja || {}) as ContextoLoja;

    if (!TIPO_PROMPTS[tipo]) {
      return NextResponse.json(
        {
          error: "Tipo inválido. Use: post_instagram, descricao_marketplace, copy_whatsapp, hashtags, preco_sugerido, ideia_promocao",
        },
        { status: 400 }
      );
    }

    if (!produto.nome) {
      return NextResponse.json(
        { error: "Manda o nome do produto em 'produto.nome'" },
        { status: 400 }
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json({
        ok: true,
        modo: "mock",
        resultado: mockResposta(tipo, produto, loja),
      });
    }

    const prompt = TIPO_PROMPTS[tipo](produto, loja);
    const MODELOS = [
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/meta/llama-3.1-8b-instruct-fast",
      "@cf/meta/llama-3-8b-instruct",
      "@cf/meta/llama-2-7b-chat-fp16",
    ];

    const payload = {
      messages: [{ role: "user", content: prompt }],
      max_tokens: tipo === "hashtags" ? 200 : 500,
      temperature: tipo === "hashtags" ? 0.4 : 0.75,
    };

    let resposta = "";

    for (const modelo of MODELOS) {
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelo}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const r: string =
          data?.result?.response?.choices?.[0]?.message?.content ||
          data?.result?.response ||
          "";
        if (r) {
          resposta = r.trim();
          break;
        }
      } catch {
        continue;
      }
    }

    if (!resposta) {
      return NextResponse.json({
        ok: true,
        modo: "mock",
        resultado: mockResposta(tipo, produto, loja),
      });
    }

    return NextResponse.json({
      ok: true,
      modo: "cloudflare",
      resultado: resposta,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

function mockResposta(tipo: Tipo, p: ProdutoInfo, l: ContextoLoja): string {
  const loja = l.nomeLoja || "a loja";
  switch (tipo) {
    case "post_instagram":
      return `Olha que perfeição que chegou na ${loja} 😍\n${p.nome}${p.cor ? ` na cor ${p.cor}` : ""}${p.preco ? ` por R$ ${p.preco.toFixed(2)}` : ""}.\nGarante o seu antes que acabe 👀\nManda DM ou comenta aqui 💚`;
    case "descricao_marketplace":
      return `${p.nome}${p.cor ? ` — ${p.cor}` : ""}\n\nProduto de qualidade pensado pra durar e te acompanhar no dia a dia. Ideal pra quem busca${p.categoria ? ` ${p.categoria.toLowerCase()}` : " estilo"} sem complicação.\n\nPerfeito pra usar em diversas ocasiões. Envio rápido e produto conferido antes da postagem.\n\nQualquer dúvida, é só chamar!`;
    case "copy_whatsapp":
      return `Oi! Chegou ${p.nome}${p.cor ? ` ${p.cor}` : ""}${p.preco ? ` por R$ ${p.preco.toFixed(2)}` : ""} 💚 Passa lá pra dar uma olhada ou me chama no privado!`;
    case "hashtags":
      const cat = (p.categoria || "moda").toLowerCase();
      return `#${cat} #brasil #vendas #compreonline #estilo #lojinha #${cat}br #moda #tendencia #lookdodia #${cat}feminino #compreaqui #loja #novidade #amei`;
    case "preco_sugerido":
      if (p.custo) {
        const sugerido = Math.round(p.custo * 2.5);
        const margem = ((sugerido - p.custo) / sugerido) * 100;
        return `Sugiro: R$ ${sugerido.toFixed(2)}\n\nPra essa categoria, margem de 60-70% é saudável. Esse preço cobre custo, taxa e dá lucro pra reinvestir.\n\nMargem nesse preço: ${margem.toFixed(0)}%`;
      }
      return `Sugiro: R$ ${(p.preco ? p.preco * 1.1 : 99.9).toFixed(2)}\n\nSem custo informado, é estimativa de mercado. Cadastra o custo no produto pra eu dar uma sugestão mais certeira.`;
    case "ideia_promocao":
      return `1. Leve 2, pague 1.5\n   Cliente compra 2 unidades com 25% de desconto na segunda. Ótimo pra girar estoque.\n\n2. Combo "${p.nome} + complemento"\n   Junta com outro produto da loja por preço cheio + 20% off. Aumenta ticket médio.\n\n3. Cupom de retorno\n   Quem comprar agora ganha cupom de R$ 10 pra próxima compra (válido 15 dias). Fideliza.`;
  }
}

export const maxDuration = 30;
