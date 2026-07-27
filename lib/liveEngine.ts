import type {
  LiveTransaction,
  PaymentMethod,
  ConnectedMachine,
  RateConfig,
  Maquininha,
} from "./types";
import { BANDEIRAS_CREDITO, BANCOS_PIX, NOMES_PAGADORES } from "./types";
import { uid } from "./utils";

// ============================================================
// Default: 4 máquinas-exemplo (batem com as vendas no mockData)
// ============================================================
export const DEFAULT_MACHINES: ConnectedMachine[] = [
  {
    id: "mac-mp-caixa",
    apelido: "Mercado Pago do caixa",
    marca: "Mercado Pago",
    numeroSerie: "MP-44218-AB",
    contaDestino: "Itaú • Ag 1234 • CC 56789-0",
    taxaPix: 0.99,
    taxaDebito: 1.99,
    taxaCreditoAvista: 3.19,
    taxaCreditoParcelado: 4.49,
    prazoDebito: 1,
    prazoCredito: 14,
    status: "conectada",
    integrationStatus: "conectada",
    ultimaSincronizacao: new Date().toISOString(),
    totalHoje: 1840.5,
    transacoesHoje: 12,
  },
  {
    id: "mac-stone-balcao",
    apelido: "Stone balcão",
    marca: "Stone",
    numeroSerie: "STN-77901-CD",
    contaDestino: "Bradesco • Ag 2210 • CC 14530-2",
    taxaPix: 0.79,
    taxaDebito: 1.49,
    taxaCreditoAvista: 2.99,
    taxaCreditoParcelado: 4.19,
    prazoDebito: 1,
    prazoCredito: 30,
    status: "conectada",
    integrationStatus: "simulada",
    ultimaSincronizacao: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    totalHoje: 620.0,
    transacoesHoje: 5,
  },
  {
    id: "mac-ton-reserva",
    apelido: "Ton reserva",
    marca: "Ton",
    numeroSerie: "TON-30182-EF",
    contaDestino: "Nubank PJ • Conta 11209-7",
    taxaPix: 1.09,
    taxaDebito: 1.39,
    taxaCreditoAvista: 3.49,
    taxaCreditoParcelado: 4.99,
    prazoDebito: 1,
    prazoCredito: 30,
    status: "desconectada",
    integrationStatus: "manual",
    ultimaSincronizacao: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    totalHoje: 220.0,
    transacoesHoje: 1,
  },
  {
    id: "mac-pagbank-entrega",
    apelido: "PagBank entrega",
    marca: "PagBank",
    numeroSerie: "PB-99022-GH",
    contaDestino: "PagBank • Conta digital 8821-3",
    taxaPix: 0.99,
    taxaDebito: 1.69,
    taxaCreditoAvista: 3.29,
    taxaCreditoParcelado: 4.79,
    prazoDebito: 1,
    prazoCredito: 30,
    status: "conectada",
    integrationStatus: "simulada",
    ultimaSincronizacao: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    totalHoje: 0,
    transacoesHoje: 0,
  },
];

// ============================================================
// Pesos pra distribuição realista de transações
// ============================================================
const METHOD_WEIGHTS: Record<PaymentMethod, number> = {
  pix: 0.45,
  debito: 0.22,
  credito_avista: 0.22,
  credito_parcelado: 0.11,
  dinheiro: 0, // dinheiro não cai pela maquininha
};

const VALUE_RANGES: Record<PaymentMethod, [number, number]> = {
  pix: [15, 250],
  debito: [30, 320],
  credito_avista: [50, 500],
  credito_parcelado: [180, 1800],
  dinheiro: [10, 100],
};

function pickWeighted<T>(items: Record<string, number>): string {
  const total = Object.values(items).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(items)) {
    r -= w;
    if (r <= 0) return k;
  }
  return Object.keys(items)[0];
}

function randomInRange([min, max]: [number, number]): number {
  const v = min + Math.random() * (max - min);
  // arredonda pra .00, .50 ou .90 — valores mais "reais"
  return Math.round(v * 100) / 100;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// Gera uma transação realista
// ============================================================
export function generateLiveTransaction(
  rates: RateConfig,
  machineId: string
): LiveTransaction {
  const metodo = pickWeighted(METHOD_WEIGHTS) as PaymentMethod;
  const valor = randomInRange(VALUE_RANGES[metodo]);

  let taxa = 0;
  if (metodo === "pix") taxa = rates.taxaPix;
  else if (metodo === "debito") taxa = rates.taxaDebito;
  else if (metodo === "credito_avista") taxa = rates.taxaCreditoAvista;
  else taxa = rates.taxaCreditoParcelado;

  // 8% de chance da maquininha cobrar uma taxa "errada" pra demonstrar divergência
  if (Math.random() < 0.08) taxa += 0.4 + Math.random() * 0.6;

  const valorLiquido = +(valor * (1 - taxa / 100)).toFixed(2);

  const parcelas =
    metodo === "credito_parcelado"
      ? 2 + Math.floor(Math.random() * 9) // 2 a 10
      : undefined;

  const bandeira =
    metodo === "pix"
      ? pick(BANCOS_PIX)
      : pick(BANDEIRAS_CREDITO);

  const pagador =
    metodo === "pix"
      ? pick(NOMES_PAGADORES)
      : "Cartão final " + (1000 + Math.floor(Math.random() * 9000));

  return {
    id: uid(),
    data: new Date().toISOString(),
    metodo,
    valor,
    taxa: +taxa.toFixed(2),
    valorLiquido,
    bandeira,
    parcelas,
    nsu: String(100000 + Math.floor(Math.random() * 899999)),
    maquininhaId: machineId,
    pagador,
    status: "aprovada",
  };
}

export function generateInitialLiveFeed(
  rates: RateConfig,
  machines: ConnectedMachine[],
  count = 12
): LiveTransaction[] {
  const txs: LiveTransaction[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const machine = machines[Math.floor(Math.random() * machines.length)];
    const t = generateLiveTransaction(rates, machine.id);
    // distribuído nas últimas 2 horas, em ordem decrescente
    t.data = new Date(now - i * (1000 * 60 * 10) - Math.random() * 60000).toISOString();
    txs.push(t);
  }
  return txs;
}

// ============================================================
// Lista de marcas disponíveis pra cadastrar
// ============================================================
export interface MachineBrand {
  marca: Maquininha;
  cor: string;
  descricao: string;
  status: "disponivel" | "em_breve" | "manual";
}

export const MACHINE_BRANDS: MachineBrand[] = [
  {
    marca: "Mercado Pago",
    cor: "#00B1EA",
    descricao: "Integração via API pública (token de desenvolvedor)",
    status: "disponivel",
  },
  {
    marca: "Stone",
    cor: "#00C853",
    descricao: "Integração via parceria — em breve",
    status: "em_breve",
  },
  {
    marca: "Ton",
    cor: "#1D2C57",
    descricao: "Integração via parceria — em breve",
    status: "em_breve",
  },
  {
    marca: "Cielo",
    cor: "#0066B3",
    descricao: "Integração via parceria — em breve",
    status: "em_breve",
  },
  {
    marca: "Rede",
    cor: "#E60050",
    descricao: "Integração via parceria — em breve",
    status: "em_breve",
  },
  {
    marca: "PagSeguro",
    cor: "#FFB200",
    descricao: "Integração via parceria — em breve",
    status: "em_breve",
  },
  {
    marca: "PagBank",
    cor: "#33B5F1",
    descricao: "Integração via parceria — em breve",
    status: "em_breve",
  },
  {
    marca: "Sicoob",
    cor: "#00AE9D",
    descricao: "Sicoob — cooperativa de crédito. Integração em breve",
    status: "em_breve",
  },
  {
    marca: "Sicredi",
    cor: "#3FA535",
    descricao: "Sicredi / Vero — cooperativa. Integração em breve",
    status: "em_breve",
  },
  {
    marca: "SafraPay",
    cor: "#0058A5",
    descricao: "Banco Safra — integração em breve",
    status: "em_breve",
  },
  {
    marca: "Sumup",
    cor: "#3CB44B",
    descricao: "SumUp — integração em breve",
    status: "em_breve",
  },
  {
    marca: "InfinitePay",
    cor: "#101820",
    descricao: "InfinitePay — integração em breve",
    status: "em_breve",
  },
  {
    marca: "Getnet",
    cor: "#FF671B",
    descricao: "Getnet (Santander) — integração em breve",
    status: "em_breve",
  },
  {
    marca: "BB Pay",
    cor: "#FFD300",
    descricao: "Banco do Brasil — integração em breve",
    status: "em_breve",
  },
  {
    marca: "Caixa Pay",
    cor: "#0070AF",
    descricao: "Caixa Econômica — integração em breve",
    status: "em_breve",
  },
  {
    marca: "Bin",
    cor: "#000000",
    descricao: "Bin maquininha — integração em breve",
    status: "em_breve",
  },
  {
    marca: "Outro",
    cor: "#6E7C8C",
    descricao: "Cadastro manual — informa o que cair",
    status: "manual",
  },
];
