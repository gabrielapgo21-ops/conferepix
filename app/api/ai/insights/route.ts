/**
 * Gera 3 insights curtos e acionáveis sobre o negócio.
 *
 * Recebe o mesmo contexto do chat e devolve um array de:
 *  - emoji
 *  - titulo (curto, até 60 chars)
 *  - descricao (1-2 frases, até 200 chars)
 *  - acao (texto do botão, até 30 chars)
 *  - rota (pra onde levar o usuário ao clicar)
 */

import { NextRequest, NextResponse } from "next/server";

interface BusinessContext {
  nomeLoja?: string;
  totalProdutos: number;
  totalVendasMes: number;
  faturamentoMes: number;
  lucroMes?: number;
  margem?: number;
  topVendidos: { nome: string; qtd: number; faturamento: number }[];
  parados: { nome: string; dias: number }[];
  reposicaoUrgente: { nome: string; motivo: string }[];
  totalClientes: number;
  aniversariantesHoje: string[];
  clientesSumidos: number;
  variacaoMes?: number;
  melhorDia?: string;
  melhorHorario?: string;
}

interface Insight {
  emoji: string;
  titulo: string;
  descricao: string;
  acao: string;
  rota: string;
}

const SYSTEM_PROMPT = (ctx: BusinessContext) => `Você é a "Pix", assistente de IA do ConferePix.

Sua tarefa: gerar EXATAMENTE 3 insights curtos sobre o negócio da dona pra mostrar no dashboard.

Cada insight tem:
- emoji (1 emoji relevante)
- titulo (até 60 chars, observação concreta)
- descricao (1 frase de até 200 chars, explicando ou contextualizando)
- acao (botão de até 30 chars, ex: "Ver lista", "Manda cupom")
- rota (uma destas: "/repor", "/clientes", "/produtos", "/relatorio", "/vendas")

REGRAS:
1. Use APENAS dados que estão abaixo. Não invente.
2. Insights devem ser ACIONÁVEIS — sempre apontam pra uma ação concreta.
3. Sem textão. Curto, direto, brasileiro.
4. Tom amigável, sem ser bobo. Sem "olá" ou "tudo bem?".
5. Varie emojis e tons (uma observação positiva, uma alerta, uma sugestão).
6. NÃO repita dados óbvios — interprete e dê valor.

DADOS DO NEGÓCIO:
- ${ctx.totalProdutos} produtos
- ${ctx.totalVendasMes} vendas no mês, R$ ${ctx.faturamentoMes.toFixed(2)} faturados
${ctx.lucroMes !== undefined ? `- Lucro R$ ${ctx.lucroMes.toFixed(2)} (margem ${ctx.margem?.toFixed(1)}%)` : ""}
${ctx.variacaoMes !== undefined ? `- Variação vs mês passado: ${ctx.variacaoMes > 0 ? "+" : ""}${ctx.variacaoMes.toFixed(1)}%` : ""}
${ctx.melhorDia ? `- Melhor dia: ${ctx.melhorDia}` : ""}
${ctx.melhorHorario ? `- Melhor horário: ${ctx.melhorHorario}` : ""}
- ${ctx.totalClientes} clientes${ctx.clientesSumidos > 0 ? `, ${ctx.clientesSumidos} sumidos` : ""}

TOP VENDIDOS:
${ctx.topVendidos.slice(0, 3).map((p, i) => `${i + 1}. ${p.nome} (${p.qtd}x, R$ ${p.faturamento.toFixed(2)})`).join("\n") || "Sem vendas"}

PARADOS: ${ctx.parados.slice(0, 3).map((p) => `${p.nome} (${p.dias}d)`).join(", ") || "Nenhum"}
REPOR URGENTE: ${ctx.reposicaoUrgente.slice(0, 3).map((p) => p.nome).join(", ") || "Nada"}
${ctx.aniversariantesHoje.length > 0 ? `🎂 ANIVERSÁRIO HOJE: ${ctx.aniversariantesHoje.join(", ")}` : ""}

Responda APENAS um JSON válido com array de 3 insights. Sem markdown. Sem texto antes ou depois. Exemplo:

[
  {"emoji":"📈","titulo":"Vendas crescendo +15%","descricao":"Esse mês tá melhor que o passado. Continua firme!","acao":"Ver relatório","rota":"/relatorio"},
  {"emoji":"⚠️","titulo":"3 produtos parados há 45+ dias","descricao":"Faz promoção pra girar estoque.","acao":"Ver parados","rota":"/produtos"},
  {"emoji":"💚","titulo":"2 aniversariantes hoje","descricao":"Manda parabéns e fideliza.","acao":"Ver clientes","rota":"/clientes"}
]`;

const ROTAS_VALIDAS = ["/repor", "/clientes", "/produtos", "/relatorio", "/vendas", "/"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contexto = (body.contexto || {}) as BusinessContext;

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json({
        ok: true,
        modo: "mock",
        insights: mockInsights(contexto),
      });
    }

    const MODELOS = [
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/meta/llama-3.1-8b-instruct-fast",
      "@cf/meta/llama-3-8b-instruct",
      "@cf/meta/llama-2-7b-chat-fp16",
    ];

    const payload = {
      messages: [{ role: "system", content: SYSTEM_PROMPT(contexto) }],
      max_tokens: 700,
      temperature: 0.5,
    };

    let txt: string = "";

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
          txt = r;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!txt) {
      return NextResponse.json({
        ok: true,
        modo: "mock",
        insights: mockInsights(contexto),
      });
    }

    // Extrai JSON array da resposta
    const match = txt.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({
        ok: true,
        modo: "mock_fallback",
        insights: mockInsights(contexto),
      });
    }

    try {
      const parsed = JSON.parse(match[0]) as Insight[];
      const validados = parsed
        .filter(
          (i) =>
            i &&
            typeof i.titulo === "string" &&
            typeof i.descricao === "string" &&
            typeof i.acao === "string" &&
            typeof i.rota === "string"
        )
        .map((i) => ({
          emoji: String(i.emoji ?? "💡").slice(0, 4),
          titulo: String(i.titulo).slice(0, 80),
          descricao: String(i.descricao).slice(0, 220),
          acao: String(i.acao).slice(0, 30),
          rota: ROTAS_VALIDAS.includes(i.rota) ? i.rota : "/",
        }))
        .slice(0, 3);

      if (validados.length === 0) {
        return NextResponse.json({
          ok: true,
          modo: "mock_validacao_falhou",
          insights: mockInsights(contexto),
        });
      }

      return NextResponse.json({
        ok: true,
        modo: "cloudflare",
        insights: validados,
      });
    } catch {
      return NextResponse.json({
        ok: true,
        modo: "mock_parse_falhou",
        insights: mockInsights(contexto),
      });
    }
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

// Fallback inteligente sem IA — regras simples
function mockInsights(ctx: BusinessContext): Insight[] {
  const result: Insight[] = [];

  if (ctx.aniversariantesHoje.length > 0) {
    result.push({
      emoji: "🎂",
      titulo: `${ctx.aniversariantesHoje.length} aniversariante${ctx.aniversariantesHoje.length > 1 ? "s" : ""} hoje`,
      descricao: `${ctx.aniversariantesHoje.join(", ")} faz aniversário. Manda parabéns!`,
      acao: "Mandar mensagem",
      rota: "/clientes",
    });
  }

  if (ctx.variacaoMes !== undefined && ctx.variacaoMes > 10) {
    result.push({
      emoji: "📈",
      titulo: `Vendas +${ctx.variacaoMes.toFixed(0)}% vs mês passado`,
      descricao: "Tá num ritmo bom! Mantém o foco no que tá funcionando.",
      acao: "Ver relatório",
      rota: "/relatorio",
    });
  } else if (ctx.variacaoMes !== undefined && ctx.variacaoMes < -10) {
    result.push({
      emoji: "📉",
      titulo: `Vendas ${ctx.variacaoMes.toFixed(0)}% vs mês passado`,
      descricao: "Considere uma promoção ou cupom pra reativar clientes.",
      acao: "Ver clientes",
      rota: "/clientes",
    });
  }

  if (ctx.reposicaoUrgente.length > 0) {
    result.push({
      emoji: "🛒",
      titulo: `${ctx.reposicaoUrgente.length} produto${ctx.reposicaoUrgente.length > 1 ? "s" : ""} pra repor`,
      descricao: `${ctx.reposicaoUrgente[0].nome} ${ctx.reposicaoUrgente[0].motivo.toLowerCase()}.`,
      acao: "Lista de compras",
      rota: "/repor",
    });
  }

  if (ctx.clientesSumidos >= 3) {
    result.push({
      emoji: "✨",
      titulo: `${ctx.clientesSumidos} clientes sumidos`,
      descricao: "Manda cupom de desconto pra trazer de volta.",
      acao: "Mandar cupom",
      rota: "/clientes",
    });
  }

  if (ctx.parados.length >= 2) {
    result.push({
      emoji: "💤",
      titulo: `${ctx.parados.length} produtos parados`,
      descricao: `${ctx.parados[0].nome} não vende há ${ctx.parados[0].dias} dias. Faça promoção.`,
      acao: "Ver produtos",
      rota: "/produtos",
    });
  }

  if (ctx.topVendidos.length > 0 && result.length < 3) {
    result.push({
      emoji: "⭐",
      titulo: `${ctx.topVendidos[0].nome} é seu top`,
      descricao: `${ctx.topVendidos[0].qtd} vendas no mês. Aumenta a margem? Aumenta o estoque?`,
      acao: "Ver produto",
      rota: "/produtos",
    });
  }

  // Default se nenhuma das regras pegou
  while (result.length < 3) {
    result.push({
      emoji: "💡",
      titulo: "Tudo tranquilo por aqui",
      descricao:
        ctx.totalVendasMes === 0
          ? "Faz a primeira venda do mês! Comece o ritmo."
          : "Continua firme. Volta sempre pra eu te atualizar.",
      acao: "Ver dashboard",
      rota: "/",
    });
  }

  return result.slice(0, 3);
}

export const maxDuration = 30;
