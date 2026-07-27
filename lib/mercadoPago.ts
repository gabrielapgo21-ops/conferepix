/**
 * Cliente Mercado Pago — busca payment details e converte pra LiveTransaction.
 * Usa Access Token (TEST-... ou APP_USR-...) — o mesmo token serve pra ambos.
 * Documentação: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments_id/get
 */

import type { LiveTransaction, PaymentMethod } from "./types";

const MP_API_BASE = "https://api.mercadopago.com";

export interface MPPaymentRaw {
  id: number;
  status: string; // "approved", "pending", "rejected", "refunded"
  status_detail: string;
  payment_method_id: string; // "pix", "visa", "master", "elo", "amex", ...
  payment_type_id: string; // "credit_card", "debit_card", "bank_transfer", "account_money"
  transaction_amount: number;
  installments?: number;
  date_created: string;
  date_approved?: string;
  fee_details?: Array<{ type: string; amount: number; fee_payer: string }>;
  card?: {
    last_four_digits?: string;
    cardholder?: { name?: string };
  };
  payer?: {
    first_name?: string;
    last_name?: string;
    identification?: { type: string; number: string };
  };
  point_of_interaction?: {
    type: string;
    transaction_data?: { bank_info?: { collector?: { account_holder_name?: string } } };
  };
  description?: string;
  collector_id?: number;
  external_reference?: string;
}

/** Busca detalhes de um payment no Mercado Pago via API. */
export async function fetchPayment(
  paymentId: string | number,
  accessToken: string
): Promise<MPPaymentRaw | null> {
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN ausente");
  const url = `${MP_API_BASE}/v1/payments/${paymentId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MP API ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as MPPaymentRaw;
}

/** Mapeia payment_type_id + installments do MP pra PaymentMethod do ConferePix. */
function mapMethod(p: MPPaymentRaw): PaymentMethod {
  const type = p.payment_type_id;
  if (type === "bank_transfer" || type === "account_money" || p.payment_method_id === "pix")
    return "pix";
  if (type === "debit_card") return "debito";
  if (type === "credit_card") {
    return (p.installments ?? 1) > 1 ? "credito_parcelado" : "credito_avista";
  }
  // Fallback (ticket, etc) — tratamos como Pix pra não perder
  return "pix";
}

/** Calcula a taxa cobrada (%) a partir do fee_details do MP. */
function calcFeePercent(p: MPPaymentRaw): number {
  const fees = p.fee_details ?? [];
  const totalFee = fees
    .filter((f) => f.fee_payer === "collector" || !f.fee_payer)
    .reduce((s, f) => s + Math.abs(f.amount), 0);
  if (p.transaction_amount <= 0) return 0;
  return +((totalFee / p.transaction_amount) * 100).toFixed(2);
}

/** Identifica o nome do pagador (Pix tem o nome de quem pagou; cartão é os últimos 4). */
function identifyPayer(p: MPPaymentRaw): string | undefined {
  if (p.payment_type_id === "credit_card" || p.payment_type_id === "debit_card") {
    const last = p.card?.last_four_digits;
    return last ? `Cartão final ${last}` : undefined;
  }
  // Pix — pega o nome do pagador
  const first = p.payer?.first_name;
  const last = p.payer?.last_name;
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return p.point_of_interaction?.transaction_data?.bank_info?.collector?.account_holder_name;
}

function mapBandeira(p: MPPaymentRaw): string | undefined {
  if (p.payment_method_id === "pix") return "Mercado Pago";
  const map: Record<string, string> = {
    visa: "Visa",
    master: "Master",
    elo: "Elo",
    amex: "Amex",
    hipercard: "Hipercard",
  };
  return map[p.payment_method_id] ?? p.payment_method_id?.toUpperCase();
}

function mapStatus(p: MPPaymentRaw): LiveTransaction["status"] {
  if (p.status === "approved") return "aprovada";
  if (p.status === "refunded" || p.status === "charged_back") return "estornada";
  return "pendente";
}

/** Converte payment do MP pra LiveTransaction do app. */
export function normalizePayment(p: MPPaymentRaw, maquininhaId: string): LiveTransaction {
  const taxa = calcFeePercent(p);
  const valorLiquido = +(p.transaction_amount * (1 - taxa / 100)).toFixed(2);
  return {
    id: `mp-${p.id}`,
    data: p.date_approved ?? p.date_created,
    metodo: mapMethod(p),
    valor: p.transaction_amount,
    taxa,
    valorLiquido,
    bandeira: mapBandeira(p),
    parcelas: p.installments && p.installments > 1 ? p.installments : undefined,
    nsu: String(p.id),
    maquininhaId,
    pagador: identifyPayer(p),
    status: mapStatus(p),
  };
}
