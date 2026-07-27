/**
 * Endpoint pra simular um webhook do MP sem precisar de ngrok / URL pública.
 * Útil pra testar localhost antes da maquininha chegar.
 *
 * POST → cria uma transação fake e joga no feed real do servidor.
 */
import { NextRequest, NextResponse } from "next/server";
import { appendToFeed, readConfig } from "@/lib/serverStore";
import type { LiveTransaction, PaymentMethod } from "@/lib/types";

function uid() {
  return "mp-test-" + Math.random().toString(36).slice(2, 10);
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFakePayment(metodo?: PaymentMethod): LiveTransaction {
  const m: PaymentMethod =
    metodo ?? rand(["pix", "debito", "credito_avista", "credito_parcelado"]);
  const valor = +(20 + Math.random() * 480).toFixed(2);
  const taxas: Record<PaymentMethod, number> = {
    pix: 0.99,
    debito: 1.99,
    credito_avista: 3.19,
    credito_parcelado: 4.49,
    dinheiro: 0,
  };
  const taxa = taxas[m];
  const valorLiquido = +(valor * (1 - taxa / 100)).toFixed(2);

  const nomes = [
    "Maria Silva",
    "Ana Souza",
    "João Pereira",
    "Bárbara Lima",
    "Letícia Costa",
    "Carla Mendes",
  ];
  const bandeiras = ["Visa", "Master", "Elo"];

  return {
    id: uid(),
    data: new Date().toISOString(),
    metodo: m,
    valor,
    taxa,
    valorLiquido,
    bandeira: m === "pix" ? "Mercado Pago" : rand(bandeiras),
    parcelas: m === "credito_parcelado" ? 2 + Math.floor(Math.random() * 9) : undefined,
    nsu: String(100000 + Math.floor(Math.random() * 899999)),
    maquininhaId: "mp-test",
    pagador:
      m === "pix"
        ? rand(nomes)
        : "Cartão final " + (1000 + Math.floor(Math.random() * 9000)),
    status: "aprovada",
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { metodo?: PaymentMethod };
  const config = await readConfig();
  const fake = generateFakePayment(body.metodo);
  await appendToFeed(fake);
  return NextResponse.json({
    ok: true,
    tx: fake,
    note: config.mpAccessToken
      ? "Webhook teste disparado. Em produção isso viria do MP quando alguém pagar."
      : "Webhook teste disparado. Configure o token MP em /integracao pra receber webhooks reais.",
  });
}
