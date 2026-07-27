"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Mail,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Package,
  Sparkles,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { METHOD_LABELS, type PaymentMethod } from "@/lib/types";
import { computeStatusCadastro } from "@/lib/products";
import { LineChart, BarList, BarVertical } from "@/components/Charts";
import { ProdutoFoto } from "@/components/ProdutoFoto";
import {
  vendasPorDia,
  compararMeses,
  melhorDiaSemana,
  melhorHorario,
  calcularLucro,
  maisVendidos,
  produtosParados,
  transactionsToCSV,
  productsToCSV,
  baixarCSV,
} from "@/lib/analytics";

export default function RelatorioPage() {
  const mounted = useHasMounted();
  const transactions = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);
  const [periodo, setPeriodo] = useState("maio/2026");
  const [emailContador, setEmailContador] = useState("contabil@meuescritorio.com.br");
  const [acao, setAcao] = useState<null | "exportando" | "enviando" | "exportado" | "enviado">(
    null
  );

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  // Cálculos por método
  const methods: PaymentMethod[] = ["pix", "debito", "credito_avista", "credito_parcelado"];
  const resumoPorMetodo = methods.map((m) => {
    const txs = transactions.filter((t) => t.metodo === m);
    return {
      metodo: m,
      qtd: txs.length,
      vendido: txs.reduce((s, t) => s + t.valorVendido, 0),
      recebido: txs.reduce((s, t) => s + t.valorRecebido, 0),
      taxas: txs.reduce((s, t) => s + (t.valorVendido - t.valorEsperado), 0),
      problemas: txs.filter((t) => t.status !== "ok").length,
    };
  });

  const totalVendido = transactions.reduce((s, t) => s + t.valorVendido, 0);
  const totalRecebido = transactions.reduce((s, t) => s + t.valorRecebido, 0);
  const totalTaxas = transactions.reduce((s, t) => s + (t.valorVendido - t.valorEsperado), 0);
  const problematicas = transactions.filter((t) => t.status !== "ok");
  const totalEmRisco = problematicas.reduce(
    (s, t) => s + Math.max(0, t.valorEsperado - t.valorRecebido),
    0
  );

  const handleExportar = () => {
    setAcao("exportando");
    setTimeout(() => setAcao("exportado"), 1500);
    setTimeout(() => setAcao(null), 4000);
  };

  const handleExportCSVTransacoes = () => {
    const csv = transactionsToCSV(transactions);
    const data = new Date().toISOString().slice(0, 10);
    baixarCSV(csv, `conferepix-transacoes-${data}.csv`);
  };

  const handleExportCSVProdutos = () => {
    const csv = productsToCSV(products);
    const data = new Date().toISOString().slice(0, 10);
    baixarCSV(csv, `conferepix-produtos-${data}.csv`);
  };

  const handleEnviar = () => {
    setAcao("enviando");
    setTimeout(() => setAcao("enviado"), 1800);
    setTimeout(() => setAcao(null), 4500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatório mensal</h1>
          <p className="text-muted-foreground mt-1">
            Resumo completo pra enviar ao seu contador.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* === VISÃO GERAL DO MÊS — gráficos + comparativo + lucro === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Visão geral do mês
          </CardTitle>
          <CardDescription>
            Como você tá indo agora, com gráficos pra você enxergar tudo.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2 space-y-6">
          {(() => {
            const pontos = vendasPorDia(transactions, 30);
            const comp = compararMeses(transactions);
            const dias = melhorDiaSemana(transactions);
            const horas = melhorHorario(transactions);
            const lucro = calcularLucro(products);
            const top = maisVendidos(products, 8);
            const parados = produtosParados(products, 30).slice(0, 8);

            // só mostra horas com algum movimento (8h-22h normalmente)
            const horasFiltradas = horas.filter((h) => h.hora >= 6 && h.hora <= 23);

            return (
              <>
                {/* Cards de comparativo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
                    <div className="text-xs text-muted-foreground">
                      Vendido em {comp.mesAtualLabel}
                    </div>
                    <div className="text-2xl font-bold tabular mt-1">
                      {formatBRL(comp.valorAtual)}
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                      {comp.tendencia === "alta" ? (
                        <span className="text-success font-semibold flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />+
                          {comp.variacaoPercentual.toFixed(1)}%
                        </span>
                      ) : comp.tendencia === "baixa" ? (
                        <span className="text-destructive font-semibold flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          {comp.variacaoPercentual.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Estável</span>
                      )}
                      <span className="text-muted-foreground">
                        vs {comp.mesAnteriorLabel} ({formatBRL(comp.valorAnterior)})
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-success/5 p-4 border border-success/10">
                    <div className="text-xs text-muted-foreground">Lucro estimado</div>
                    <div className="text-2xl font-bold tabular mt-1 text-success">
                      {lucro.temDadosSuficientes ? formatBRL(lucro.lucroEstimado) : "—"}
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      {lucro.temDadosSuficientes ? (
                        <>
                          Margem {lucro.margemMedia.toFixed(1)}% ·{" "}
                          <Link href="/produtos" className="underline">
                            {lucro.produtosSemCusto} sem custo
                          </Link>
                        </>
                      ) : (
                        <Link href="/produtos" className="underline">
                          Preenche o custo dos produtos
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-4 border border-border">
                    <div className="text-xs text-muted-foreground">Total de vendas</div>
                    <div className="text-2xl font-bold tabular mt-1">{comp.qtdAtual}</div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      Ticket médio:{" "}
                      {comp.qtdAtual > 0
                        ? formatBRL(comp.valorAtual / comp.qtdAtual)
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Gráfico de linha */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Vendas dos últimos 30 dias
                  </div>
                  <LineChart
                    data={pontos.map((p) => ({ label: p.diaLabel, valor: p.valor }))}
                    height={200}
                  />
                </div>

                {/* Dia e Horário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Melhor dia da semana
                    </div>
                    <BarVertical
                      data={dias.map((d) => ({ label: d.diaCurto, valor: d.valor }))}
                      height={140}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Melhor horário
                    </div>
                    <BarVertical
                      data={horasFiltradas.map((h) => ({
                        label: h.horaLabel,
                        valor: h.valor,
                      }))}
                      height={140}
                    />
                  </div>
                </div>

                {/* Top vendidos + Parados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Top 8 mais vendidos
                    </div>
                    <BarList
                      items={top.map((m) => ({
                        label: m.produto.nome,
                        sublabel: `${m.qtd}x`,
                        icone:
                          m.produto.fotoUrl?.startsWith("data:") ||
                          m.produto.fotoUrl?.startsWith("http")
                            ? "📦"
                            : m.produto.fotoUrl || "📦",
                        valor: m.faturamento,
                      }))}
                      emptyMsg="Sem vendas no mês ainda."
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ArrowDown className="h-3.5 w-3.5 text-warning" />
                      Produtos parados
                    </div>
                    {parados.length === 0 ? (
                      <div className="text-sm text-success bg-success/5 rounded-lg p-4 text-center">
                        <CheckCircle2 className="h-6 w-6 mx-auto mb-1 opacity-70" />
                        Tudo vendendo bem! 🎉
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {parados.map((p) => (
                          <div
                            key={p.produto.id}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0"
                          >
                            <span className="font-medium truncate flex-1">
                              {p.produto.nome}
                            </span>
                            <span className="text-warning font-semibold tabular flex-shrink-0 ml-2">
                              {p.motivo === "nunca_vendeu"
                                ? "nunca vendeu"
                                : `${p.diasParado}d parado`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </Card>

      {/* Exportar planilha (CSV pra Excel) */}
      <Card className="p-5 bg-secondary/30">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-sm">Exportar pra Excel / planilha</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Baixa em CSV — abre direto no Excel, Google Sheets, Numbers.
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button onClick={handleExportCSVTransacoes} variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                Transações ({transactions.length})
              </Button>
              <Button onClick={handleExportCSVProdutos} variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                Produtos ({products.length})
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Período + ações */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Período do relatório</Label>
            <Select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="mt-1.5"
            >
              <option value="maio/2026">Maio de 2026</option>
              <option value="abril/2026">Abril de 2026</option>
              <option value="março/2026">Março de 2026</option>
              <option value="ano-2026">Ano de 2026</option>
            </Select>
          </div>
          <div>
            <Label>E-mail do contador</Label>
            <Input
              type="email"
              value={emailContador}
              onChange={(e) => setEmailContador(e.target.value)}
              placeholder="contador@exemplo.com.br"
              className="mt-1.5"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportar} variant="outline" className="flex-1">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={handleEnviar} className="flex-1">
              <Mail className="h-4 w-4" />
              Enviar
            </Button>
          </div>
        </div>

        {acao && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-sm"
          >
            {acao === "exportando" && (
              <span className="text-muted-foreground">Gerando PDF…</span>
            )}
            {acao === "enviando" && (
              <span className="text-muted-foreground">
                Enviando para {emailContador}…
              </span>
            )}
            {acao === "exportado" && (
              <span className="text-success flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                PDF gerado! (simulação — em produção o download começaria agora)
              </span>
            )}
            {acao === "enviado" && (
              <span className="text-success flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Relatório enviado para {emailContador} (simulação)
              </span>
            )}
          </motion.div>
        )}
      </Card>

      {/* Header do relatório (print-friendly) */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Relatório de movimentação
            </div>
            <div className="text-xl font-bold mt-1">
              <Calendar className="inline h-4 w-4 mr-1.5 -mt-0.5 text-primary" />
              {periodo}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Emitido em</div>
            <div className="text-sm tabular font-medium">{formatDateBR(new Date())}</div>
          </div>
        </div>

        {/* Totais consolidados */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Vendido
            </div>
            <div className="text-xl font-bold tabular mt-1">{formatBRL(totalVendido)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {transactions.length} transações
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" />
              Recebido
            </div>
            <div className="text-xl font-bold tabular text-success mt-1">
              {formatBRL(totalRecebido)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {((totalRecebido / totalVendido) * 100).toFixed(1)}% do vendido
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Receipt className="h-3 w-3" />
              Taxas
            </div>
            <div className="text-xl font-bold tabular text-warning mt-1">
              {formatBRL(totalTaxas)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {((totalTaxas / totalVendido) * 100).toFixed(2)}% médio
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Em risco
            </div>
            <div className="text-xl font-bold tabular text-destructive mt-1">
              {formatBRL(totalEmRisco)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {problematicas.length} divergências
            </div>
          </div>
        </div>

        {/* Resumo por forma de pagamento */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Resumo por forma de pagamento
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left font-medium py-2">Forma</th>
                  <th className="text-right font-medium py-2">Qtd.</th>
                  <th className="text-right font-medium py-2">Vendido</th>
                  <th className="text-right font-medium py-2">Recebido</th>
                  <th className="text-right font-medium py-2">Taxas</th>
                  <th className="text-right font-medium py-2">Divergências</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resumoPorMetodo.map((r) => (
                  <tr key={r.metodo}>
                    <td className="py-3 font-medium">{METHOD_LABELS[r.metodo]}</td>
                    <td className="py-3 text-right tabular">{r.qtd}</td>
                    <td className="py-3 text-right tabular">{formatBRL(r.vendido)}</td>
                    <td className="py-3 text-right tabular text-success">
                      {formatBRL(r.recebido)}
                    </td>
                    <td className="py-3 text-right tabular text-warning">
                      {formatBRL(r.taxas)}
                    </td>
                    <td className="py-3 text-right tabular">
                      {r.problemas > 0 ? (
                        <span className="text-destructive font-semibold">{r.problemas}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-3">Total</td>
                  <td className="py-3 text-right tabular">{transactions.length}</td>
                  <td className="py-3 text-right tabular">{formatBRL(totalVendido)}</td>
                  <td className="py-3 text-right tabular text-success">
                    {formatBRL(totalRecebido)}
                  </td>
                  <td className="py-3 text-right tabular text-warning">
                    {formatBRL(totalTaxas)}
                  </td>
                  <td className="py-3 text-right tabular text-destructive">
                    {problematicas.length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Seção Produtos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Produtos do mês
          </CardTitle>
          <CardDescription>
            Top vendidos, faturamento por categoria e produtos que precisam revisão.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2 space-y-6">
          {(() => {
            const maisVendidos = [...products]
              .filter((p) => (p.vendidoNoMes ?? 0) > 0)
              .sort((a, b) => (b.vendidoNoMes ?? 0) - (a.vendidoNoMes ?? 0))
              .slice(0, 5);
            const tempVendidos = products.filter(
              (p) => p.tipoCadastro === "temporario" && (p.vendidoNoMes ?? 0) > 0
            );
            const incompletos = products.filter(
              (p) => computeStatusCadastro(p) === "incompleto"
            );
            // Faturamento por categoria
            const porCat: Record<string, number> = {};
            products.forEach((p) => {
              if (!p.faturamentoNoMes) return;
              const c = p.categoria ?? "Sem categoria";
              porCat[c] = (porCat[c] ?? 0) + p.faturamentoNoMes;
            });
            const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);

            return (
              <>
                {/* Mais vendidos */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Mais vendidos do mês
                  </div>
                  {maisVendidos.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma venda registrada com produto cadastrado.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {maisVendidos.map((p, i) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </div>
                          <ProdutoFoto fotoUrl={p.fotoUrl} nome={p.nome} className="h-7 w-7" emojiSize="text-lg" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{p.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.vendidoNoMes} vendidos
                            </div>
                          </div>
                          <div className="font-bold tabular text-sm">
                            {formatBRL(p.faturamentoNoMes ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Faturamento por categoria */}
                {cats.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Faturamento por categoria
                    </div>
                    <div className="space-y-1.5">
                      {cats.map(([cat, fat]) => {
                        const total = cats.reduce((s, [, v]) => s + v, 0);
                        const pct = (fat / total) * 100;
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="font-medium">{cat}</span>
                              <span className="tabular">
                                {formatBRL(fat)} · {pct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Temporários vendidos */}
                {tempVendidos.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Produtos temporários vendidos (sem cadastro completo)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tempVendidos.map((p) => (
                        <Badge key={p.id} variant="warning" className="text-[10px]">
                          {p.nome} ({p.vendidoNoMes} vendidos)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precisam revisão */}
                {incompletos.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Produtos que precisam revisão ({incompletos.length})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {incompletos
                        .slice(0, 8)
                        .map((p) => p.nome)
                        .join(", ")}
                      {incompletos.length > 8 && ` + ${incompletos.length - 8} outros`}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Card>

      {/* Lista de problemas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Transações problemáticas ({problematicas.length})
          </CardTitle>
          <CardDescription>
            Para revisar com a maquininha ou banco antes de fechar o mês.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2">
          {problematicas.length === 0 ? (
            <div className="py-10 text-center text-sm text-success">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
              Nenhuma divergência neste período! 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium py-2">Data</th>
                    <th className="text-left font-medium py-2">Descrição</th>
                    <th className="text-left font-medium py-2">Forma</th>
                    <th className="text-right font-medium py-2">Esperado</th>
                    <th className="text-right font-medium py-2">Recebido</th>
                    <th className="text-right font-medium py-2">Diferença</th>
                    <th className="text-left font-medium py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {problematicas.slice(0, 20).map((t) => (
                    <tr key={t.id}>
                      <td className="py-2.5 tabular whitespace-nowrap">
                        {formatDateBR(t.data)}
                      </td>
                      <td className="py-2.5 max-w-xs truncate">{t.descricao}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {METHOD_LABELS[t.metodo]}
                      </td>
                      <td className="py-2.5 text-right tabular">
                        {formatBRL(t.valorEsperado)}
                      </td>
                      <td className="py-2.5 text-right tabular">
                        {t.valorRecebido === 0 ? "—" : formatBRL(t.valorRecebido)}
                      </td>
                      <td className="py-2.5 text-right tabular text-destructive font-semibold">
                        {formatBRL(t.valorRecebido - t.valorEsperado)}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {problematicas.length > 20 && (
                <div className="text-xs text-muted-foreground text-center mt-3">
                  Mostrando 20 de {problematicas.length}. O PDF completo contém todas.
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Observações */}
      <Card className="p-5 bg-secondary/30">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Observação:</strong> este relatório considera
            apenas as transações importadas até o momento. Para fechamento contábil completo,
            confirme com seu contador se há lançamentos manuais a incluir. O envio por e-mail
            e a exportação em PDF estão simulados nesta versão de demonstração.
          </div>
        </div>
      </Card>
    </div>
  );
}
