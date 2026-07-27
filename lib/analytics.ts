/**
 * Análises de negócio — usado pelo Dashboard e Relatórios.
 *
 * Tudo aqui é puro (não usa store), recebe dados e retorna estruturas
 * prontas pra render. Permite testar facilmente e reusar.
 */

import type { Transaction } from "@/lib/types";
import type { Product } from "@/lib/products";

// ============================================================================
// VENDAS POR DIA (pra gráfico de linha do mês)
// ============================================================================

export interface DailyPoint {
  data: string; // ISO YYYY-MM-DD
  diaLabel: string; // "05/06"
  vendas: number;
  valor: number;
}

export function vendasPorDia(
  transactions: Transaction[],
  diasAtras = 30
): DailyPoint[] {
  const agora = new Date();
  const pontos: DailyPoint[] = [];
  const map = new Map<string, { vendas: number; valor: number }>();

  for (const t of transactions) {
    const key = t.data.slice(0, 10);
    const cur = map.get(key) ?? { vendas: 0, valor: 0 };
    cur.vendas += 1;
    cur.valor += t.valorVendido;
    map.set(key, cur);
  }

  for (let i = diasAtras - 1; i >= 0; i--) {
    const d = new Date(agora);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    pontos.push({
      data: key,
      diaLabel: `${dd}/${mm}`,
      vendas: map.get(key)?.vendas ?? 0,
      valor: map.get(key)?.valor ?? 0,
    });
  }
  return pontos;
}

// ============================================================================
// COMPARATIVO MES A MES
// ============================================================================

export interface MonthCompare {
  mesAtualLabel: string;
  mesAnteriorLabel: string;
  valorAtual: number;
  valorAnterior: number;
  qtdAtual: number;
  qtdAnterior: number;
  variacaoPercentual: number; // (atual - anterior) / anterior * 100
  tendencia: "alta" | "baixa" | "estavel";
}

const MES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function compararMeses(transactions: Transaction[]): MonthCompare {
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();
  const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
  const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

  let valorAtual = 0;
  let valorAnterior = 0;
  let qtdAtual = 0;
  let qtdAnterior = 0;

  for (const t of transactions) {
    const d = new Date(t.data);
    if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
      valorAtual += t.valorVendido;
      qtdAtual += 1;
    } else if (d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior) {
      valorAnterior += t.valorVendido;
      qtdAnterior += 1;
    }
  }

  const variacao =
    valorAnterior === 0
      ? valorAtual > 0
        ? 100
        : 0
      : ((valorAtual - valorAnterior) / valorAnterior) * 100;

  let tendencia: MonthCompare["tendencia"] = "estavel";
  if (variacao > 5) tendencia = "alta";
  else if (variacao < -5) tendencia = "baixa";

  return {
    mesAtualLabel: MES_NOMES[mesAtual],
    mesAnteriorLabel: MES_NOMES[mesAnterior],
    valorAtual,
    valorAnterior,
    qtdAtual,
    qtdAnterior,
    variacaoPercentual: variacao,
    tendencia,
  };
}

// ============================================================================
// MELHOR DIA DA SEMANA / HORÁRIO
// ============================================================================

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface DayOfWeekStat {
  dia: string; // "Segunda"
  diaCurto: string; // "Seg"
  vendas: number;
  valor: number;
  percentual: number; // % do total
}

export function melhorDiaSemana(transactions: Transaction[]): DayOfWeekStat[] {
  const tot = [0, 0, 0, 0, 0, 0, 0];
  const val = [0, 0, 0, 0, 0, 0, 0];
  for (const t of transactions) {
    const d = new Date(t.data);
    tot[d.getDay()] += 1;
    val[d.getDay()] += t.valorVendido;
  }
  const totalValor = val.reduce((s, v) => s + v, 0);
  // Ordem brasileira: Seg, Ter, Qua, Qui, Sex, Sáb, Dom
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  return ordem.map((i) => ({
    dia: DIAS_SEMANA[i],
    diaCurto: DIAS_SEMANA[i].slice(0, 3),
    vendas: tot[i],
    valor: val[i],
    percentual: totalValor === 0 ? 0 : (val[i] / totalValor) * 100,
  }));
}

export interface HourStat {
  hora: number; // 0-23
  horaLabel: string; // "08h"
  vendas: number;
  valor: number;
}

export function melhorHorario(transactions: Transaction[]): HourStat[] {
  const stats: HourStat[] = Array.from({ length: 24 }, (_, h) => ({
    hora: h,
    horaLabel: `${String(h).padStart(2, "0")}h`,
    vendas: 0,
    valor: 0,
  }));
  for (const t of transactions) {
    const d = new Date(t.data);
    const h = d.getHours();
    stats[h].vendas += 1;
    stats[h].valor += t.valorVendido;
  }
  return stats;
}

// ============================================================================
// LUCRO REAL (preço - custo)
// ============================================================================

export interface LucroStat {
  faturamentoBruto: number;
  custoEstimado: number;
  lucroEstimado: number;
  margemMedia: number;
  produtosComCusto: number;
  produtosSemCusto: number;
  temDadosSuficientes: boolean;
}

export function calcularLucro(products: Product[]): LucroStat {
  let faturamento = 0;
  let custo = 0;
  let comCusto = 0;
  let semCusto = 0;

  for (const p of products) {
    const vendidos = p.vendidoNoMes ?? 0;
    if (vendidos === 0) continue;
    const fat = p.faturamentoNoMes ?? vendidos * p.preco;
    faturamento += fat;
    if (p.custo && p.custo > 0) {
      custo += vendidos * p.custo;
      comCusto += 1;
    } else {
      semCusto += 1;
    }
  }

  const lucro = faturamento - custo;
  const margem = faturamento === 0 ? 0 : (lucro / faturamento) * 100;

  return {
    faturamentoBruto: faturamento,
    custoEstimado: custo,
    lucroEstimado: lucro,
    margemMedia: margem,
    produtosComCusto: comCusto,
    produtosSemCusto: semCusto,
    temDadosSuficientes: comCusto > 0,
  };
}

// ============================================================================
// PRODUTOS PARADOS (sem venda há X dias)
// ============================================================================

export interface ParadoInfo {
  produto: Product;
  diasParado: number;
  motivo: "nunca_vendeu" | "muito_tempo";
}

export function produtosParados(
  products: Product[],
  diasLimite = 30
): ParadoInfo[] {
  const agora = new Date();
  const result: ParadoInfo[] = [];

  for (const p of products) {
    // Ignora produtos temporários ou recém criados (< 7 dias)
    if (p.tipoCadastro === "temporario") continue;
    const criadoEm = new Date(p.criadoEm);
    const diasDesdeCriado = Math.floor(
      (agora.getTime() - criadoEm.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diasDesdeCriado < 7) continue;

    if (!p.ultimaVenda) {
      // Nunca vendeu — só sinaliza se foi cadastrado há tempo
      if (diasDesdeCriado >= diasLimite) {
        result.push({
          produto: p,
          diasParado: diasDesdeCriado,
          motivo: "nunca_vendeu",
        });
      }
      continue;
    }

    const ultimaVenda = new Date(p.ultimaVenda);
    const diasSemVender = Math.floor(
      (agora.getTime() - ultimaVenda.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diasSemVender >= diasLimite) {
      result.push({
        produto: p,
        diasParado: diasSemVender,
        motivo: "muito_tempo",
      });
    }
  }

  // Mais parados primeiro
  result.sort((a, b) => b.diasParado - a.diasParado);
  return result;
}

// ============================================================================
// MAIS VENDIDOS
// ============================================================================

export interface MaisVendido {
  produto: Product;
  qtd: number;
  faturamento: number;
}

export function maisVendidos(products: Product[], topN = 10): MaisVendido[] {
  return [...products]
    .filter((p) => (p.vendidoNoMes ?? 0) > 0)
    .sort((a, b) => (b.vendidoNoMes ?? 0) - (a.vendidoNoMes ?? 0))
    .slice(0, topN)
    .map((p) => ({
      produto: p,
      qtd: p.vendidoNoMes ?? 0,
      faturamento: p.faturamentoNoMes ?? (p.vendidoNoMes ?? 0) * p.preco,
    }));
}

// ============================================================================
// EXPORT CSV
// ============================================================================

function escapeCSV(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes(";") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const headers = [
    "Data",
    "Descrição",
    "Método",
    "Valor Vendido",
    "Valor Esperado",
    "Valor Recebido",
    "Status",
  ];
  const lines = [headers.join(",")];
  for (const t of transactions) {
    lines.push(
      [
        t.data.slice(0, 10),
        escapeCSV(t.descricao),
        t.metodo,
        t.valorVendido.toFixed(2).replace(".", ","),
        t.valorEsperado.toFixed(2).replace(".", ","),
        t.valorRecebido.toFixed(2).replace(".", ","),
        t.status,
      ].join(",")
    );
  }
  return lines.join("\n");
}

export function productsToCSV(products: Product[]): string {
  const headers = [
    "Nome",
    "Código",
    "Categoria",
    "Preço",
    "Custo",
    "Estoque",
    "Vendido no mês",
    "Faturamento no mês",
  ];
  const lines = [headers.join(",")];
  for (const p of products) {
    lines.push(
      [
        escapeCSV(p.nome),
        p.codigoBarras ?? "",
        p.categoria ?? "",
        p.preco.toFixed(2).replace(".", ","),
        (p.custo ?? 0).toFixed(2).replace(".", ","),
        p.statusEstoque,
        p.vendidoNoMes ?? 0,
        (p.faturamentoNoMes ?? 0).toFixed(2).replace(".", ","),
      ].join(",")
    );
  }
  return lines.join("\n");
}

export function baixarCSV(conteudo: string, nomeArquivo: string) {
  // BOM pra Excel reconhecer UTF-8
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
