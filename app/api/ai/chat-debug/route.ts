/**
 * Diagnóstico do chat — testa os 4 modelos da Cloudflare e mostra qual funciona.
 *
 * Como usar: abre https://confere-pix.vercel.app/api/ai/chat-debug
 */

import { NextResponse } from "next/server";

const MODELOS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3-8b-instruct",
  "@cf/meta/llama-2-7b-chat-fp16",
];

export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json({
      ok: false,
      problema: "Credenciais Cloudflare não configuradas",
    });
  }

  const resultados: Record<string, unknown> = {};

  for (const modelo of MODELOS) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelo}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: "Diga apenas: oi! em português." },
          ],
          max_tokens: 30,
        }),
      });
      const txt = await res.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(txt);
      } catch {
        parsed = txt.slice(0, 200);
      }
      resultados[modelo] = {
        status: res.status,
        ok: res.ok,
        body: typeof parsed === "string" ? parsed : JSON.stringify(parsed).slice(0, 350),
      };
    } catch (e) {
      resultados[modelo] = {
        erro: (e as Error).message,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    accountIdLength: accountId.length,
    apiTokenLength: apiToken.length,
    resultados,
  });
}
