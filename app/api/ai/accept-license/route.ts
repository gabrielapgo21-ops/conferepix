/**
 * Aceita a licença do Llama 3.2 Vision (exigência da Meta/Cloudflare).
 * Você só precisa abrir essa URL UMA VEZ na vida. Depois o modelo fica liberado pra conta.
 *
 * Como usar: abre https://confere-pix.vercel.app/api/ai/accept-license no navegador.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { ok: false, error: "Credenciais Cloudflare não configuradas" },
      { status: 500 }
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "agree",
        max_tokens: 50,
      }),
    });

    const text = await res.text();

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      mensagem: res.ok
        ? "🎉 Licença aceita! Agora pode usar a IA pra reconhecer produtos."
        : "Algo deu errado — confere a mensagem.",
      response: text.slice(0, 1000),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
