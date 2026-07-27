/**
 * Webhook do Mercado Pago.
 *
 * O MP manda POST aqui sempre que rola um evento (pagamento aprovado, estornado, etc).
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * Payload típico:
 * { "action": "payment.created", "type": "payment", "data": { "id": "1234567890" } }
 *
 * Como o webhook só manda o ID, a gente busca os detalhes via API com o Access Token.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchPayment, normalizePayment } from "@/lib/mercadoPago";
import { readConfig, appendToFeed } from "@/lib/serverStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, action, data } = body as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };

    // Só processa eventos de payment
    if (type !== "payment" || !data?.id) {
      return NextResponse.json({ received: true, ignored: true, reason: "not a payment event" });
    }

    const config = await readConfig();
    if (!config.mpAccessToken) {
      console.error("[MP webhook] Access Token não configurado");
      return NextResponse.json(
        { received: true, error: "MP não configurado no ConferePix" },
        { status: 200 } // sempre 200 pro MP não tentar reenviar infinito
      );
    }

    const payment = await fetchPayment(data.id, config.mpAccessToken);
    if (!payment) {
      return NextResponse.json({ received: true, error: "payment not found" });
    }

    const tx = normalizePayment(payment, config.mpMaquininhaId ?? "mp-default");
    await appendToFeed(tx);

    console.log(
      `[MP webhook] ${action} #${payment.id} → ${tx.metodo} R$ ${tx.valor.toFixed(2)} (${tx.status})`
    );

    return NextResponse.json({
      received: true,
      processed: true,
      action,
      txId: tx.id,
    });
  } catch (err) {
    console.error("[MP webhook] erro:", err);
    // Devolvemos 200 mesmo em erro pra evitar retry agressivo do MP enquanto debug
    return NextResponse.json(
      { received: true, error: (err as Error).message },
      { status: 200 }
    );
  }
}

// Permite GET pra testar se a URL tá acessível (MP faz um GET de validação às vezes)
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "ConferePix · Mercado Pago webhook",
    info: "Envie POST com o payload do MP pra processar.",
  });
}
