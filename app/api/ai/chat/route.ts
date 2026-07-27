/**
 * Chat com assistente de negócio do ConferePix.
 *
 * Usa Cloudflare Workers AI Llama 3.1 8B Instruct (free, rápido, bom em PT-BR).
 *
 * O cliente manda:
 *  - mensagens: array do histórico (role: user|assistant)
 *  - contexto: snapshot do negócio (totais, top vendidos, sumidos, parados...)
 *
 * O servidor injeta um system prompt com personalidade + dados, e chama a IA.
 */

import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BusinessContext {
  nomeLoja?: string;
  // Snapshot atual
  totalProdutos: number;
  totalVendasMes: number;
  faturamentoMes: number;
  lucroMes?: number;
  margem?: number;
  // Top 5 vendidos
  topVendidos: { nome: string; qtd: number; faturamento: number }[];
  // Produtos parados (3)
  parados: { nome: string; dias: number }[];
  // Estoque crítico
  reposicaoUrgente: { nome: string; motivo: string }[];
  // Clientes
  totalClientes: number;
  aniversariantesHoje: string[];
  clientesSumidos: number;
  // Mês passado vs atual
  variacaoMes?: number;
  // Forma de pagamento favorita
  formaPagamentoTop?: string;
}

const SYSTEM_PROMPT = (ctx: BusinessContext, nomeLoja: string) => `Você é a "Pix", assistente de IA do ConferePix — um app de gestão pra pequenas lojistas brasileiras.

PERSONALIDADE:
- Conversa em PT-BR informal mas profissional
- Acessível, amigável, prestativa
- DIRETO ao ponto: respostas curtas (1-4 frases). NÃO escreve textão.
- Usa emojis com moderação (1-2 por resposta no máximo)
- Trata a dona com carinho: chama de "você", evita "senhora"

CONTEXTO DO NEGÓCIO (${nomeLoja}):
- ${ctx.totalProdutos} produtos cadastrados
- ${ctx.totalVendasMes} vendas no mês, faturamento de R$ ${ctx.faturamentoMes.toFixed(2)}
${ctx.lucroMes !== undefined ? `- Lucro estimado: R$ ${ctx.lucroMes.toFixed(2)} (margem ${ctx.margem?.toFixed(1)}%)` : ""}
${ctx.variacaoMes !== undefined ? `- Variação vs mês passado: ${ctx.variacaoMes > 0 ? "+" : ""}${ctx.variacaoMes.toFixed(1)}%` : ""}
- ${ctx.totalClientes} clientes cadastrados${ctx.clientesSumidos > 0 ? `, ${ctx.clientesSumidos} sumidos (+30 dias)` : ""}

TOP VENDIDOS DO MÊS:
${ctx.topVendidos.slice(0, 5).map((p, i) => `${i + 1}. ${p.nome} — ${p.qtd}x (R$ ${p.faturamento.toFixed(2)})`).join("\n") || "Sem vendas ainda"}

${ctx.parados.length > 0 ? `PARADOS:\n${ctx.parados.slice(0, 3).map((p) => `- ${p.nome} (${p.dias} dias sem vender)`).join("\n")}\n` : ""}
${ctx.reposicaoUrgente.length > 0 ? `PRECISA REPOR URGENTE:\n${ctx.reposicaoUrgente.slice(0, 3).map((p) => `- ${p.nome} (${p.motivo})`).join("\n")}\n` : ""}
${ctx.aniversariantesHoje.length > 0 ? `🎂 ANIVERSARIANTE HOJE: ${ctx.aniversariantesHoje.join(", ")}\n` : ""}

REGRAS:
1. Use APENAS dados acima. Não invente nomes de produtos/clientes.
2. Se não souber, fale: "Não tenho essa informação aqui."
3. Sugestões devem ser ACIONÁVEIS (ex: "Manda cupom de 10% pros sumidos" não "Tenta vender mais").
4. NÃO fale sobre você ser uma IA, modelo de linguagem etc. Você é a Pix.
5. Se a pergunta for fora do escopo do negócio, redireciona com carinho.
6. Valores em reais: sempre "R$ X,XX".
7. NÃO repita a pergunta no início da resposta.

Responda em português brasileiro.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mensagens = (body.mensagens || []) as ChatMessage[];
    const contexto = (body.contexto || {}) as BusinessContext;
    const nomeLoja = contexto.nomeLoja || "sua loja";

    if (!Array.isArray(mensagens) || mensagens.length === 0) {
      return NextResponse.json(
        { error: "Manda pelo menos uma mensagem em 'mensagens'." },
        { status: 400 }
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      // Fallback simples sem IA
      return NextResponse.json({
        ok: true,
        modo: "mock",
        resposta:
          "Tô sem conexão com a IA agora. Configura as credenciais Cloudflare pra eu poder responder de verdade. Enquanto isso, dá uma olhada no Dashboard e Relatórios — tem tudo que você precisa lá! 📊",
      });
    }

    const systemPrompt = SYSTEM_PROMPT(contexto, nomeLoja);
    const payload = {
      messages: [
        { role: "system", content: systemPrompt },
        ...mensagens.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 350,
      temperature: 0.6,
    };

    // Lista de modelos pra tentar em ordem. Se um falhar, tenta o próximo.
    // Llama 3.1 8B é estável; deixamos versões mais recentes também como fallback.
    const MODELOS = [
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/meta/llama-3.1-8b-instruct-fast",
      "@cf/meta/llama-3-8b-instruct",
      "@cf/meta/llama-2-7b-chat-fp16",
    ];

    let resposta = "";
    let modeloUsado = "";
    let ultimoErro = "";

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

        if (!res.ok) {
          ultimoErro = `${modelo} → ${res.status}: ${(await res.text()).slice(0, 150)}`;
          continue;
        }

        const data = await res.json();
        const r =
          data?.result?.response?.choices?.[0]?.message?.content ||
          data?.result?.response ||
          data?.response ||
          "";

        if (r && typeof r === "string") {
          resposta = r.trim();
          modeloUsado = modelo;
          break;
        }
        ultimoErro = `${modelo} → resposta vazia: ${JSON.stringify(data).slice(0, 150)}`;
      } catch (e) {
        ultimoErro = `${modelo} → ${(e as Error).message}`;
      }
    }

    if (!resposta) {
      return NextResponse.json({
        ok: true,
        modo: "mock",
        resposta:
          "Hmm, todos os modelos de IA tão fora do ar agora. Tenta de novo em uns minutos. Enquanto isso, dá uma olhada no Dashboard! 📊",
        debug: ultimoErro,
      });
    }

    return NextResponse.json({
      ok: true,
      modo: "cloudflare",
      modelo: modeloUsado,
      resposta,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
