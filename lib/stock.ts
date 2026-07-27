/**
 * Inteligência de estoque — sugestões de reposição baseadas em ritmo de venda.
 *
 * Lógica:
 * - "Vendas por dia" = vendido_no_mes / 30 (média)
 * - "Dias até acabar" = quantidade_aprox / vendas_por_dia
 * - Urgência:
 *    🔴 critica  — acabou OU dias_ate_acabar <= 3
 *    🟠 alta     — dias_ate_acabar <= 7
 *    🟡 media    — dias_ate_acabar <= 14
 *    🟢 baixa    — dias_ate_acabar > 14
 * - "Quantidade sugerida" = vendas_por_dia × 30 (reabastecer pra 30 dias)
 *   arredondado pra cima e com mínimo de 5.
 */

import type { Product } from "@/lib/products";

export type Urgencia = "critica" | "alta" | "media" | "baixa";

export interface SugestaoReposicao {
  produto: Product;
  vendasPorDia: number;
  diasAteAcabar: number | null; // null = nunca vai acabar (não vende)
  quantidadeAtual: number;
  quantidadeSugerida: number;
  urgencia: Urgencia;
  motivo: string;
}

const URGENCIA_ORDER: Record<Urgencia, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  critica: "Crítico",
  alta: "Alto",
  media: "Médio",
  baixa: "Baixo",
};

export const URGENCIA_COR: Record<Urgencia, string> = {
  critica: "bg-destructive/15 text-destructive border-destructive/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baixa: "bg-success/15 text-success border-success/30",
};

export const URGENCIA_EMOJI: Record<Urgencia, string> = {
  critica: "🔴",
  alta: "🟠",
  media: "🟡",
  baixa: "🟢",
};

/**
 * Gera sugestões de reposição pra todos os produtos cadastrados.
 * Retorna ordenado por urgência (críticos primeiro).
 */
export function sugerirReposicoes(products: Product[]): SugestaoReposicao[] {
  const result: SugestaoReposicao[] = [];

  for (const p of products) {
    // Ignora produtos temporários
    if (p.tipoCadastro === "temporario") continue;

    const vendidos = p.vendidoNoMes ?? 0;
    const vendasPorDia = vendidos / 30;
    const qtdAtual = p.quantidadeAprox ?? 0;

    let diasAteAcabar: number | null = null;
    if (vendasPorDia > 0) {
      diasAteAcabar = qtdAtual / vendasPorDia;
    }

    // Decisão de urgência
    let urgencia: Urgencia;
    let motivo: string;
    const acabou = p.statusEstoque === "acabou";
    const acabando = p.statusEstoque === "acabando";

    if (acabou) {
      urgencia = "critica";
      motivo = "Você marcou como acabou";
    } else if (vendasPorDia === 0) {
      // Nunca vendeu OU não cadastrou no mês — não sugerimos a menos que tenha 0 estoque
      if (qtdAtual === 0 && p.statusEstoque !== "nao_informado") {
        urgencia = "media";
        motivo = "Sem estoque e sem vendas no mês";
      } else {
        continue; // não precisa repor
      }
    } else if (diasAteAcabar !== null && diasAteAcabar <= 3) {
      urgencia = "critica";
      motivo = `Acaba em ${Math.max(0, Math.ceil(diasAteAcabar))} dias no ritmo atual`;
    } else if (acabando) {
      urgencia = "alta";
      motivo = "Você marcou como está acabando";
    } else if (diasAteAcabar !== null && diasAteAcabar <= 7) {
      urgencia = "alta";
      motivo = `Acaba em ${Math.ceil(diasAteAcabar)} dias no ritmo atual`;
    } else if (diasAteAcabar !== null && diasAteAcabar <= 14) {
      urgencia = "media";
      motivo = `Acaba em ${Math.ceil(diasAteAcabar)} dias`;
    } else {
      continue; // tá tranquilo, não precisa avisar
    }

    // Quantidade sugerida = repor pra mais 30 dias
    let sugerida = Math.ceil(vendasPorDia * 30);
    if (sugerida < 5) sugerida = 5;

    result.push({
      produto: p,
      vendasPorDia,
      diasAteAcabar,
      quantidadeAtual: qtdAtual,
      quantidadeSugerida: sugerida,
      urgencia,
      motivo,
    });
  }

  // Ordena: urgência crescente, depois dias até acabar crescente
  result.sort((a, b) => {
    const u = URGENCIA_ORDER[a.urgencia] - URGENCIA_ORDER[b.urgencia];
    if (u !== 0) return u;
    return (a.diasAteAcabar ?? 999) - (b.diasAteAcabar ?? 999);
  });

  return result;
}

/**
 * Resumo do estoque pra mostrar no dashboard.
 */
export interface EstoqueResumo {
  totalProdutos: number;
  semEstoque: number;
  estoqueBaixo: number; // dias_ate_acabar <= 7
  precisamReposicao: number; // críticos + altos
  valorTotalEstoque: number; // soma de qtd * custo
}

export function resumoEstoque(products: Product[]): EstoqueResumo {
  const sug = sugerirReposicoes(products);
  let valorTotal = 0;
  let semEstoque = 0;
  let estoqueBaixo = 0;

  for (const p of products) {
    if (p.tipoCadastro === "temporario") continue;
    const qtd = p.quantidadeAprox ?? 0;
    const custo = p.custo ?? 0;
    valorTotal += qtd * custo;
    if (p.statusEstoque === "acabou" || qtd === 0) semEstoque += 1;
    if (p.statusEstoque === "acabando") estoqueBaixo += 1;
  }

  const precisam = sug.filter(
    (s) => s.urgencia === "critica" || s.urgencia === "alta"
  ).length;

  return {
    totalProdutos: products.filter((p) => p.tipoCadastro !== "temporario").length,
    semEstoque,
    estoqueBaixo,
    precisamReposicao: precisam,
    valorTotalEstoque: valorTotal,
  };
}

/**
 * Gera texto da lista de compras pra exportar/copiar/WhatsApp.
 */
export function listaDeComprasTxt(sugestoes: SugestaoReposicao[]): string {
  if (sugestoes.length === 0) return "Lista de compras vazia.";
  const linhas: string[] = [];
  linhas.push("🛒 *Lista de compras — ConferePix*");
  linhas.push(`📅 ${new Date().toLocaleDateString("pt-BR")}`);
  linhas.push("");

  const grupos: Record<Urgencia, SugestaoReposicao[]> = {
    critica: [],
    alta: [],
    media: [],
    baixa: [],
  };
  for (const s of sugestoes) grupos[s.urgencia].push(s);

  const labels: Record<Urgencia, string> = {
    critica: "🔴 URGENTE",
    alta: "🟠 Em breve",
    media: "🟡 Pode esperar",
    baixa: "🟢 De olho",
  };

  for (const u of ["critica", "alta", "media", "baixa"] as Urgencia[]) {
    if (grupos[u].length === 0) continue;
    linhas.push(`*${labels[u]}*`);
    for (const s of grupos[u]) {
      linhas.push(
        `• ${s.produto.nome} — comprar ${s.quantidadeSugerida} un.`
      );
    }
    linhas.push("");
  }

  linhas.push("_Gerado pelo ConferePix_");
  return linhas.join("\n");
}
