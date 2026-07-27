/**
 * Módulo de clientes (CRM básico) — cadastro, histórico, mensagens WhatsApp.
 *
 * Decisões:
 * - Cliente é OPCIONAL na venda (não bloqueia o fluxo)
 * - Aniversariante é por dia/mês (não exige ano)
 * - "Sumido" = sem compra há >= 30 dias E já comprou antes
 * - Mensagens prontas em PT-BR, todas com placeholders
 */

import type { Transaction } from "@/lib/types";

export interface Customer {
  id: string;
  nome: string;
  telefone?: string; // só números (BR: 11999999999)
  aniversario?: string; // ISO MM-DD ou YYYY-MM-DD
  email?: string;
  observacoes?: string;
  tags?: string[]; // ex: "VIP", "Atacado"
  criadoEm: string; // ISO
}

// ============================================================================
// FORMATAÇÃO DE TELEFONE
// ============================================================================

export function formatarTelefone(telRaw?: string): string {
  if (!telRaw) return "";
  const num = telRaw.replace(/\D/g, "");
  if (num.length === 11) {
    return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`;
  }
  if (num.length === 10) {
    return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
  }
  return telRaw;
}

export function limparTelefone(tel: string): string {
  return tel.replace(/\D/g, "");
}

/**
 * Monta o número internacional pra link wa.me (5511999999999).
 */
export function paraWhatsApp(telRaw?: string): string | null {
  if (!telRaw) return null;
  const limpo = limparTelefone(telRaw);
  if (limpo.length < 10) return null;
  // Já tem 55? mantém. Senão, prefixa.
  if (limpo.startsWith("55") && limpo.length >= 12) return limpo;
  return "55" + limpo;
}

export function linkWhatsApp(telRaw: string | undefined, mensagem: string): string {
  const num = paraWhatsApp(telRaw);
  if (num) {
    return `https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`;
  }
  // Sem número: deixa o usuário escolher pra quem manda
  return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
}

// ============================================================================
// ANÁLISE DE COMPRAS POR CLIENTE
// ============================================================================

export interface ClienteResumo {
  cliente: Customer;
  totalCompras: number;
  ticketMedio: number;
  qtdCompras: number;
  ultimaCompra: string | null; // ISO ou null
  diasDesdeUltima: number | null;
  status: "ativo" | "sumido" | "novo" | "sem_compras";
}

export function resumirCliente(
  cliente: Customer,
  transactions: Transaction[]
): ClienteResumo {
  const minhas = transactions.filter((t) => t.clienteId === cliente.id);
  const total = minhas.reduce((s, t) => s + t.valorVendido, 0);
  const qtd = minhas.length;
  const ticket = qtd > 0 ? total / qtd : 0;
  let ultimaCompra: string | null = null;
  if (qtd > 0) {
    const sorted = [...minhas].sort((a, b) => b.data.localeCompare(a.data));
    ultimaCompra = sorted[0].data;
  }
  let diasDesdeUltima: number | null = null;
  if (ultimaCompra) {
    const d = new Date(ultimaCompra);
    diasDesdeUltima = Math.floor(
      (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const criadoHaDias = Math.floor(
    (Date.now() - new Date(cliente.criadoEm).getTime()) / (1000 * 60 * 60 * 24)
  );

  let status: ClienteResumo["status"];
  if (qtd === 0) {
    status = criadoHaDias < 14 ? "novo" : "sem_compras";
  } else if (diasDesdeUltima !== null && diasDesdeUltima >= 30) {
    status = "sumido";
  } else {
    status = "ativo";
  }

  return {
    cliente,
    totalCompras: total,
    ticketMedio: ticket,
    qtdCompras: qtd,
    ultimaCompra,
    diasDesdeUltima,
    status,
  };
}

export function resumirTodos(
  customers: Customer[],
  transactions: Transaction[]
): ClienteResumo[] {
  return customers
    .map((c) => resumirCliente(c, transactions))
    .sort((a, b) => b.totalCompras - a.totalCompras);
}

// ============================================================================
// ANIVERSARIANTES
// ============================================================================

export interface AniversarioInfo {
  cliente: Customer;
  dia: number;
  mes: number;
  diasAteAniversario: number; // negativo = passou
}

function parseDiaMes(s?: string): { dia: number; mes: number } | null {
  if (!s) return null;
  const partes = s.split("-");
  // YYYY-MM-DD
  if (partes.length === 3) {
    return { mes: parseInt(partes[1]), dia: parseInt(partes[2]) };
  }
  // MM-DD
  if (partes.length === 2) {
    return { mes: parseInt(partes[0]), dia: parseInt(partes[1]) };
  }
  return null;
}

export function aniversariantesDoMes(customers: Customer[]): AniversarioInfo[] {
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const result: AniversarioInfo[] = [];

  for (const c of customers) {
    const dm = parseDiaMes(c.aniversario);
    if (!dm) continue;
    if (dm.mes !== mesAtual) continue;

    const target = new Date(agora.getFullYear(), dm.mes - 1, dm.dia);
    const diff = Math.floor(
      (target.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    );
    result.push({
      cliente: c,
      dia: dm.dia,
      mes: dm.mes,
      diasAteAniversario: diff,
    });
  }
  return result.sort((a, b) => a.dia - b.dia);
}

export function aniversariantesDoDia(customers: Customer[]): Customer[] {
  const agora = new Date();
  return customers.filter((c) => {
    const dm = parseDiaMes(c.aniversario);
    if (!dm) return false;
    return dm.mes === agora.getMonth() + 1 && dm.dia === agora.getDate();
  });
}

// ============================================================================
// MENSAGENS PRONTAS
// ============================================================================

export interface MensagemTemplate {
  id: string;
  titulo: string;
  emoji: string;
  build: (cliente: Customer, nomeLoja?: string) => string;
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

export const TEMPLATES_WHATSAPP: MensagemTemplate[] = [
  {
    id: "boas_vindas",
    titulo: "Boas-vindas",
    emoji: "👋",
    build: (c, loja = "nossa loja") =>
      `Oi, ${primeiroNome(c.nome)}! Tudo bem? 😊\n\nAqui é da ${loja}. Foi um prazer te atender! Qualquer coisa que precisar, só chamar aqui.\n\nVolta sempre! 💚`,
  },
  {
    id: "obrigado_compra",
    titulo: "Obrigada pela compra",
    emoji: "💚",
    build: (c, loja = "nossa loja") =>
      `Oi, ${primeiroNome(c.nome)}! Muito obrigada pela compra na ${loja}! 🌸\n\nSe gostou do produto, conta pra gente. Se tiver qualquer problema, é só me avisar que resolvo na hora.`,
  },
  {
    id: "volta_sumida",
    titulo: "Cliente sumida",
    emoji: "✨",
    build: (c, loja = "a gente") =>
      `Oi, ${primeiroNome(c.nome)}! Sumida! ✨\n\nFaz tempo que ${loja} não te vê por aqui. Tenho novidades chegando — passa pra dar uma olhada quando puder!\n\nTô te esperando 💚`,
  },
  {
    id: "aniversario",
    titulo: "Feliz aniversário",
    emoji: "🎉",
    build: (c) =>
      `Oi, ${primeiroNome(c.nome)}! 🎉\n\nFeliz aniversário! Muita saúde, alegria e realizações pra esse novo ano.\n\nPra comemorar, passa aqui que tem um mimo especial te esperando 🎁`,
  },
  {
    id: "cupom_desconto",
    titulo: "Cupom de desconto",
    emoji: "🎁",
    build: (c) =>
      `Oi, ${primeiroNome(c.nome)}! 🎁\n\nSeparei um desconto especial pra você: *10% OFF* na sua próxima compra.\n\nVálido por 7 dias. Vem aproveitar! 💚`,
  },
  {
    id: "novidades",
    titulo: "Novidades chegaram",
    emoji: "🛍️",
    build: (c) =>
      `Oi, ${primeiroNome(c.nome)}! ✨\n\nChegaram novidades fresquinhas! Acho que você vai amar.\n\nDá uma passada pra ver, sem compromisso 🛍️`,
  },
  {
    id: "lembrete_evento",
    titulo: "Lembrete de evento/promoção",
    emoji: "📣",
    build: (c) =>
      `Oi, ${primeiroNome(c.nome)}! 📣\n\nLembrete: tem promoção especial rolando! Não perde, tá?\n\nPassa lá quando der.`,
  },
];

export function buscarTemplate(id: string): MensagemTemplate | undefined {
  return TEMPLATES_WHATSAPP.find((t) => t.id === id);
}

// ============================================================================
// SUGESTÕES INTELIGENTES
// ============================================================================

/**
 * Sugere ações pra um cliente baseado no histórico.
 * Ex: cliente sumido → "Mande cupom de retorno"
 *     aniversariante hoje → "Felicite!"
 *     primeira compra ainda → "Boas-vindas"
 */
export interface SugestaoAcao {
  templateId: string;
  motivo: string;
  prioridade: number; // menor = mais urgente
}

export function sugerirAcoes(
  cliente: Customer,
  resumo: ClienteResumo
): SugestaoAcao[] {
  const sug: SugestaoAcao[] = [];
  const aniv = parseDiaMes(cliente.aniversario);
  const hoje = new Date();
  if (
    aniv &&
    aniv.mes === hoje.getMonth() + 1 &&
    aniv.dia === hoje.getDate()
  ) {
    sug.push({
      templateId: "aniversario",
      motivo: "Aniversário hoje!",
      prioridade: 0,
    });
  }
  if (resumo.status === "sumido") {
    sug.push({
      templateId: "volta_sumida",
      motivo: `Sem comprar há ${resumo.diasDesdeUltima} dias`,
      prioridade: 1,
    });
    sug.push({
      templateId: "cupom_desconto",
      motivo: "Incentivar volta com desconto",
      prioridade: 2,
    });
  }
  if (resumo.qtdCompras === 1) {
    sug.push({
      templateId: "obrigado_compra",
      motivo: "Primeira compra — agradeça!",
      prioridade: 1,
    });
  }
  if (resumo.qtdCompras === 0 && resumo.status === "novo") {
    sug.push({
      templateId: "boas_vindas",
      motivo: "Cliente novo",
      prioridade: 2,
    });
  }
  return sug.sort((a, b) => a.prioridade - b.prioridade);
}
