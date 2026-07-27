import type {
  Transaction,
  UploadedFile,
  RateConfig,
  PaymentMethod,
  TransactionStatus,
} from "./types";

// Configuração padrão (será editada pelo usuário em /taxas)
export const DEFAULT_RATES: RateConfig = {
  maquininha: "Stone",
  taxaPix: 0.99,
  taxaDebito: 1.49,
  taxaCreditoAvista: 2.99,
  taxaCreditoParcelado: 4.49,
  prazoDebito: 1,
  prazoCredito: 30,
};

// Descrições realistas de pequeno negócio brasileiro
const DESCRICOES_PIX = [
  "Maria Silva - Corte e escova",
  "João Pereira - Reforma cabelo",
  "Ana Carolina - Manicure + pedicure",
  "Pix recebido - José Santos",
  "Carlos Oliveira - Coloração",
  "Pix - Patrícia Costa",
  "Beatriz Ribeiro - Botox capilar",
  "Pix sem identificação",
  "Roberto Lima - Hidratação",
  "Camila Souza - Progressiva",
  "Pix - Eduardo Almeida",
  "Fernanda Dias - Reflexo + corte",
  "Pix recebido 13:42",
  "Lucia Mendes - Tratamento facial",
  "Pix - Rafael Castro",
];

const DESCRICOES_CARTAO = [
  "Venda cartão débito",
  "Venda crédito 1x",
  "Venda crédito 2x",
  "Venda crédito 3x",
  "Venda crédito 4x",
  "Venda crédito 6x",
  "Venda crédito 10x",
  "Pagamento débito - cliente",
  "Crédito Visa à vista",
  "Crédito Mastercard 3x",
  "Débito Elo",
];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randMoney(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAgoNeg(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// Calcula valor esperado a partir da taxa
function calcExpected(valor: number, taxaPct: number): number {
  return Math.round(valor * (1 - taxaPct / 100) * 100) / 100;
}

/**
 * Gera transações realistas com cenários variados:
 * - Maioria OK
 * - Algumas com taxa errada
 * - Algumas pendentes de repasse
 * - Algumas com valor divergente
 * - Pix sem identificação
 */
export function generateMockTransactions(rates: RateConfig = DEFAULT_RATES): Transaction[] {
  const txs: Transaction[] = [];

  // === Vendas-exemplo plugadas em máquinas reais (apareceram pelas integrações) ===
  txs.push(
    {
      id: "ex-mp-caixa",
      data: daysAgo(0),
      metodo: "credito_avista",
      descricao: "MP do caixa — Cliente balcão",
      valorVendido: 99.9,
      valorEsperado: calcExpected(99.9, 3.19),
      valorRecebido: calcExpected(99.9, 3.19),
      taxaEsperada: 3.19,
      taxaCobrada: 3.19,
      status: "repasse_confirmado",
      origem: "maquininha",
      maquininhaId: "mac-mp-caixa",
    },
    {
      id: "ex-stone-balcao",
      data: daysAgo(1),
      metodo: "credito_avista",
      descricao: "Stone balcão — Venda de pacote",
      valorVendido: 149.8,
      valorEsperado: calcExpected(149.8, 2.99),
      valorRecebido: 0,
      taxaEsperada: 2.99,
      taxaCobrada: 2.99,
      status: "aguardando_repasse",
      origem: "maquininha",
      maquininhaId: "mac-stone-balcao",
      diasParaReceber: 28,
      dataRepassePrevisto: daysAgoNeg(28),
    },
    {
      id: "ex-ton-reserva",
      data: daysAgo(2),
      metodo: "credito_avista",
      descricao: "Ton reserva — Atendimento extra",
      valorVendido: 220.0,
      valorEsperado: calcExpected(220.0, 3.49),
      valorRecebido: calcExpected(220.0, 4.49),
      taxaEsperada: 3.49,
      taxaCobrada: 4.49,
      status: "taxa_divergente",
      origem: "maquininha",
      maquininhaId: "mac-ton-reserva",
    },
    {
      id: "ex-pagbank-entrega",
      data: daysAgo(3),
      metodo: "credito_avista",
      descricao: "PagBank entrega — Cancelada pelo cliente",
      valorVendido: 87.5,
      valorEsperado: calcExpected(87.5, 3.29),
      valorRecebido: 0,
      taxaEsperada: 3.29,
      taxaCobrada: 0,
      status: "cancelada",
      origem: "maquininha",
      maquininhaId: "mac-pagbank-entrega",
    }
  );

  // === PIX (15 transações, na maioria OK) ===
  for (let i = 0; i < 15; i++) {
    const valor = randMoney(35, 380);
    const dataDias = Math.floor(Math.random() * 28);
    const isPixSemId = i === 7 || i === 11;

    let status: TransactionStatus = "ok";
    let valorRecebido = calcExpected(valor, rates.taxaPix);
    let taxaCobrada = rates.taxaPix;

    if (isPixSemId) {
      status = "nao_identificado";
    } else if (i === 3) {
      // taxa cobrada maior que esperada
      status = "taxa_divergente";
      taxaCobrada = rates.taxaPix + 0.45;
      valorRecebido = calcExpected(valor, taxaCobrada);
    }

    txs.push({
      id: `pix-${i}`,
      data: daysAgo(dataDias),
      metodo: "pix",
      descricao: randItem(DESCRICOES_PIX),
      valorVendido: valor,
      valorEsperado: calcExpected(valor, rates.taxaPix),
      valorRecebido,
      taxaEsperada: rates.taxaPix,
      taxaCobrada,
      status,
      origem: isPixSemId ? "pix_manual" : "venda_manual",
    });
  }

  // === DÉBITO (8 transações) ===
  for (let i = 0; i < 8; i++) {
    const valor = randMoney(80, 560);
    const dataDias = Math.floor(Math.random() * 28);
    const valorEsp = calcExpected(valor, rates.taxaDebito);

    let status: TransactionStatus = "ok";
    let valorRecebido = valorEsp;
    let taxaCobrada = rates.taxaDebito;

    if (i === 2) {
      // pendente
      status = "falta_receber";
      valorRecebido = 0;
    } else if (i === 5) {
      // taxa maior
      status = "taxa_divergente";
      taxaCobrada = rates.taxaDebito + 0.6;
      valorRecebido = calcExpected(valor, taxaCobrada);
    }

    txs.push({
      id: `deb-${i}`,
      data: daysAgo(dataDias),
      metodo: "debito",
      descricao: randItem(DESCRICOES_CARTAO),
      valorVendido: valor,
      valorEsperado: valorEsp,
      valorRecebido,
      taxaEsperada: rates.taxaDebito,
      taxaCobrada,
      status,
      diasParaReceber: rates.prazoDebito,
      origem: "maquininha",
      maquininhaId: i % 2 === 0 ? "mac-mp-caixa" : "mac-stone-balcao",
    });
  }

  // === CRÉDITO À VISTA (10 transações) ===
  for (let i = 0; i < 10; i++) {
    const valor = randMoney(150, 1200);
    const dataDias = Math.floor(Math.random() * 28);
    const valorEsp = calcExpected(valor, rates.taxaCreditoAvista);

    let status: TransactionStatus = "ok";
    let valorRecebido = valorEsp;
    let taxaCobrada = rates.taxaCreditoAvista;

    if (i === 1 || i === 6) {
      status = "falta_receber";
      valorRecebido = 0;
    } else if (i === 4) {
      status = "taxa_divergente";
      taxaCobrada = rates.taxaCreditoAvista + 0.8;
      valorRecebido = calcExpected(valor, taxaCobrada);
    } else if (i === 8) {
      status = "valor_divergente";
      valorRecebido = valorEsp - randMoney(15, 45);
    }

    txs.push({
      id: `cred-${i}`,
      data: daysAgo(dataDias),
      metodo: "credito_avista",
      descricao: randItem(DESCRICOES_CARTAO),
      valorVendido: valor,
      valorEsperado: valorEsp,
      valorRecebido,
      taxaEsperada: rates.taxaCreditoAvista,
      taxaCobrada,
      status,
      diasParaReceber: rates.prazoCredito,
      origem: "maquininha",
      maquininhaId: i % 2 === 0 ? "mac-mp-caixa" : "mac-stone-balcao",
    });
  }

  // === CRÉDITO PARCELADO (7 transações) ===
  for (let i = 0; i < 7; i++) {
    const valor = randMoney(280, 2200);
    const dataDias = Math.floor(Math.random() * 28);
    const parcelas = randItem([2, 3, 4, 6, 10, 12]);
    const valorEsp = calcExpected(valor, rates.taxaCreditoParcelado);

    let status: TransactionStatus = "ok";
    let valorRecebido = valorEsp;
    let taxaCobrada = rates.taxaCreditoParcelado;

    if (i === 0 || i === 4) {
      status = "falta_receber";
      valorRecebido = 0;
    } else if (i === 2) {
      status = "taxa_divergente";
      taxaCobrada = rates.taxaCreditoParcelado + 1.2;
      valorRecebido = calcExpected(valor, taxaCobrada);
    }

    txs.push({
      id: `parc-${i}`,
      data: daysAgo(dataDias),
      metodo: "credito_parcelado",
      descricao: `${randItem(DESCRICOES_CARTAO)} (${parcelas}x)`,
      valorVendido: valor,
      valorEsperado: valorEsp,
      valorRecebido,
      taxaEsperada: rates.taxaCreditoParcelado,
      taxaCobrada,
      status,
      parcelas,
      diasParaReceber: rates.prazoCredito,
      origem: "maquininha",
      maquininhaId: i % 3 === 0 ? "mac-ton-reserva" : "mac-stone-balcao",
    });
  }

  // Ordena por data desc
  return txs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

export const MOCK_FILES: UploadedFile[] = [
  {
    id: "f1",
    nome: "extrato_bb_maio_2026.csv",
    tipo: "extrato_bancario",
    status: "processado",
    tamanho: 24580,
    dataUpload: daysAgo(2),
    linhasProcessadas: 142,
  },
  {
    id: "f2",
    nome: "stone_repasses_maio.xlsx",
    tipo: "relatorio_maquininha",
    status: "processado",
    tamanho: 38200,
    dataUpload: daysAgo(2),
    linhasProcessadas: 87,
  },
  {
    id: "f3",
    nome: "vendas_balcao_maio.xlsx",
    tipo: "planilha_vendas",
    status: "processado",
    tamanho: 18900,
    dataUpload: daysAgo(5),
    linhasProcessadas: 102,
  },
];
