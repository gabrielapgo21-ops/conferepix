"use client";

import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Receipt,
  AlertTriangle,
  Clock,
  Check,
  AlertCircle,
  FileQuestion,
  ArrowUpRight,
  Smartphone,
  Info,
  Package,
} from "lucide-react";
import { computeStatusCadastro } from "@/lib/products";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBRL, formatRelativeDate } from "@/lib/utils";
import { LineChart, BarList, BarVertical } from "@/components/Charts";
import {
  vendasPorDia,
  compararMeses,
  melhorDiaSemana,
  calcularLucro,
  maisVendidos,
  produtosParados,
} from "@/lib/analytics";
import { sugerirReposicoes, URGENCIA_EMOJI } from "@/lib/stock";
import {
  aniversariantesDoMes,
  aniversariantesDoDia,
  resumirTodos,
} from "@/lib/customers";
import { AIInsights } from "@/components/AIInsights";
import {
  Sparkles,
  TrendingDown,
  ArrowDown,
  ShoppingCart,
  Cake,
  Users,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { METHOD_LABELS } from "@/lib/types";

export default function DashboardPage() {
  const mounted = useHasMounted();
  const transactions = useStore((s) => s.transactions);
  const machines = useStore((s) => s.machines);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-secondary rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // === Cálculos ===
  const totalVendido = transactions.reduce((s, t) => s + t.valorVendido, 0);
  const totalRecebido = transactions.reduce((s, t) => s + t.valorRecebido, 0);
  const totalTaxas = transactions.reduce(
    (s, t) => s + (t.valorVendido - t.valorEsperado),
    0
  );
  const divergencias = transactions.filter(
    (t) => t.status !== "ok" && t.status !== "falta_receber"
  );
  const pendentes = transactions.filter((t) => t.status === "falta_receber");
  const okCount = transactions.filter((t) => t.status === "ok").length;
  const taxaProblema = transactions.filter((t) => t.status === "taxa_divergente").length;
  const naoIdent = transactions.filter((t) => t.status === "nao_identificado").length;

  // Por método de pagamento
  const byMethod = (
    ["pix", "debito", "credito_avista", "credito_parcelado"] as const
  ).map((m) => ({
    name: METHOD_LABELS[m],
    valor: transactions
      .filter((t) => t.metodo === m)
      .reduce((s, t) => s + t.valorVendido, 0),
    qtd: transactions.filter((t) => t.metodo === m).length,
  }));

  const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316"];

  const ultimasDivergencias = [...divergencias]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  const cardsStatus = [
    {
      label: "Recebido corretamente",
      count: okCount,
      icon: Check,
      tone: "success" as const,
    },
    {
      label: "Falta receber",
      count: pendentes.length,
      icon: Clock,
      tone: "warning" as const,
    },
    {
      label: "Taxa acima do esperado",
      count: taxaProblema,
      icon: AlertCircle,
      tone: "destructive" as const,
    },
    {
      label: "Precisa conferir",
      count: naoIdent,
      icon: FileQuestion,
      tone: "default" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Resumo de maio/2026
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Olá, vamos conferir suas vendas?
          </h1>
          <p className="text-muted-foreground mt-1">
            {transactions.length} transações registradas neste período.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/uploads">
              <ArrowUpRight className="h-4 w-4" />
              Subir extrato
            </Link>
          </Button>
          <Button asChild variant="success">
            <Link href="/ao-vivo">
              <span className="h-2 w-2 rounded-full bg-success-foreground animate-pulse" />
              Ver Ao Vivo
            </Link>
          </Button>
        </div>
      </div>

      {/* === IA Insights — gerados pela Pix === */}
      <AIInsights />

      {/* Stats principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total vendido"
          value={formatBRL(totalVendido)}
          icon={TrendingUp}
          tone="default"
          delta={{ value: "+12,4% vs abril", positive: true }}
        />
        <StatCard
          label="Total recebido"
          value={formatBRL(totalRecebido)}
          icon={Wallet}
          tone="success"
          description={`${((totalRecebido / totalVendido) * 100).toFixed(0)}% do vendido`}
        />
        <StatCard
          label="Total em taxas"
          value={formatBRL(totalTaxas)}
          icon={Receipt}
          tone="warning"
          description={`${((totalTaxas / totalVendido) * 100).toFixed(2)}% médio`}
        />
        <StatCard
          label="Possíveis divergências"
          value={String(divergencias.length)}
          icon={AlertTriangle}
          tone="destructive"
          description={`R$ ${divergencias
            .reduce((s, t) => s + (t.valorEsperado - t.valorRecebido), 0)
            .toFixed(2)
            .replace(".", ",")} em risco`}
        />
      </div>

      {/* Bloco Produtos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Produtos
            </CardTitle>
            <CardDescription>Resumo dos produtos cadastrados</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/produtos">Gerenciar</Link>
          </Button>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2">
          {(() => {
            const incompletos = products.filter(
              (p) => computeStatusCadastro(p) === "incompleto"
            ).length;
            const acabando = products.filter((p) => p.statusEstoque === "acabando").length;
            const tempVendidos = products.filter(
              (p) => p.tipoCadastro === "temporario" && (p.vendidoNoMes ?? 0) > 0
            ).length;
            const top = [...products]
              .filter((p) => p.vendidoNoMes && p.vendidoNoMes > 0)
              .sort((a, b) => (b.vendidoNoMes ?? 0) - (a.vendidoNoMes ?? 0))[0];
            return (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-lg bg-primary/5 p-3">
                  <div className="text-xs text-muted-foreground">Cadastrados</div>
                  <div className="text-2xl font-bold tabular mt-1">
                    {products.length}
                  </div>
                </div>
                <div className="rounded-lg bg-warning/10 p-3">
                  <div className="text-xs text-muted-foreground">Incompletos</div>
                  <div className="text-2xl font-bold tabular mt-1 text-warning">
                    {incompletos}
                  </div>
                </div>
                <div className="rounded-lg bg-success/10 p-3 sm:col-span-2 lg:col-span-1">
                  <div className="text-xs text-muted-foreground">Mais vendido</div>
                  <div className="font-bold tabular mt-1 truncate text-sm">
                    {top ? (
                      <>
                        {top.fotoUrl ?? "📦"} {top.nome}
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {top?.vendidoNoMes ?? 0} vendidos
                  </div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <div className="text-xs text-muted-foreground">Está acabando</div>
                  <div className="text-2xl font-bold tabular mt-1 text-destructive">
                    {acabando}
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  <div className="text-xs text-muted-foreground">Temp. vendidos</div>
                  <div className="text-2xl font-bold tabular mt-1">{tempVendidos}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* === Alerta de reposição (só aparece se tem produto pra repor) === */}
      {(() => {
        const sug = sugerirReposicoes(products);
        const criticos = sug.filter((s) => s.urgencia === "critica");
        const altos = sug.filter((s) => s.urgencia === "alta");
        const totalUrgentes = criticos.length + altos.length;
        if (totalUrgentes === 0) return null;
        return (
          <Card className="border-warning/30 bg-warning/5">
            <div className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-warning" />
                  <div>
                    <div className="font-semibold">
                      {totalUrgentes} produto{totalUrgentes > 1 ? "s" : ""} pedindo
                      reposição
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {criticos.length > 0 && (
                        <>🔴 {criticos.length} crítico{criticos.length > 1 ? "s" : ""}</>
                      )}
                      {criticos.length > 0 && altos.length > 0 && " · "}
                      {altos.length > 0 && (
                        <>🟠 {altos.length} em breve</>
                      )}
                    </div>
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link href="/repor">
                    Ver lista
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sug.slice(0, 6).map((s) => (
                  <Link
                    key={s.produto.id}
                    href="/repor"
                    className="inline-flex items-center gap-1 text-xs bg-card border border-border rounded-full px-2 py-1 hover:bg-secondary"
                  >
                    <span>{URGENCIA_EMOJI[s.urgencia]}</span>
                    <span className="font-medium truncate max-w-[120px]">
                      {s.produto.nome}
                    </span>
                  </Link>
                ))}
                {sug.length > 6 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{sug.length - 6}
                  </span>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* === Visão geral do mês — gráficos, comparativo, mais vendidos, parados, lucro === */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Visão geral do mês
            </CardTitle>
            <CardDescription>
              Como tá indo o negócio agora, comparado com o mês passado.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/relatorio">Ver tudo</Link>
          </Button>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2 space-y-6">
          {(() => {
            const pontos = vendasPorDia(transactions, 30);
            const comp = compararMeses(transactions);
            const dias = melhorDiaSemana(transactions);
            const lucro = calcularLucro(products);
            const top = maisVendidos(products, 5);
            const parados = produtosParados(products, 30).slice(0, 5);
            return (
              <>
                {/* Comparativo + Lucro em cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
                    <div className="text-xs text-muted-foreground">
                      Vendido em {comp.mesAtualLabel}
                    </div>
                    <div className="text-2xl font-bold tabular mt-1">
                      {formatBRL(comp.valorAtual)}
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-1">
                      {comp.tendencia === "alta" ? (
                        <span className="text-success font-semibold flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          +{comp.variacaoPercentual.toFixed(1)}%
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
                        vs {comp.mesAnteriorLabel}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-success/5 p-3 border border-success/10">
                    <div className="text-xs text-muted-foreground">Lucro estimado</div>
                    <div className="text-2xl font-bold tabular mt-1 text-success">
                      {lucro.temDadosSuficientes
                        ? formatBRL(lucro.lucroEstimado)
                        : "—"}
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      {lucro.temDadosSuficientes
                        ? `Margem média ${lucro.margemMedia.toFixed(1)}%`
                        : "Preencha o custo dos produtos pra ver"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-3 border border-border">
                    <div className="text-xs text-muted-foreground">Total de vendas</div>
                    <div className="text-2xl font-bold tabular mt-1">{comp.qtdAtual}</div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      Mês passado: {comp.qtdAnterior}
                    </div>
                  </div>
                </div>

                {/* Gráfico de linha — vendas últimos 30 dias */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Vendas dos últimos 30 dias
                  </div>
                  <LineChart
                    data={pontos.map((p) => ({ label: p.diaLabel, valor: p.valor }))}
                    height={160}
                  />
                </div>

                {/* Dia da semana + mais vendidos lado a lado */}
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
                      Top 5 mais vendidos
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
                      emptyMsg="Ainda não há vendas no mês."
                    />
                  </div>
                </div>

                {/* Produtos parados */}
                {parados.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDown className="h-4 w-4 text-warning" />
                      <div className="font-semibold text-sm">
                        {parados.length} produto{parados.length > 1 ? "s" : ""} parado
                        {parados.length > 1 ? "s" : ""} há mais de 30 dias
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {parados.map((p) => (
                        <div
                          key={p.produto.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-medium truncate flex-1">
                            {p.produto.nome}
                          </span>
                          <span className="text-muted-foreground tabular flex-shrink-0 ml-2">
                            {p.motivo === "nunca_vendeu"
                              ? "nunca vendeu"
                              : `há ${p.diasParado} dias`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                      💡 Dica: faça uma promoção desses produtos ou retire do
                      destaque pra dar espaço aos que vendem mais.
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Card>

      {/* === Bloco Clientes — aniversariantes, sumidos, top === */}
      {customers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Clientes
              </CardTitle>
              <CardDescription>
                Quem precisa de atenção agora.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/clientes">Gerenciar</Link>
            </Button>
          </CardHeader>
          <div className="px-6 pb-6 -mt-2 space-y-4">
            {(() => {
              const hoje = aniversariantesDoDia(customers);
              const mes = aniversariantesDoMes(customers);
              const resumos = resumirTodos(customers, transactions);
              const sumidos = resumos.filter((r) => r.status === "sumido");
              const top3 = resumos.filter((r) => r.qtdCompras > 0).slice(0, 3);

              return (
                <>
                  {/* Aniversariante de hoje */}
                  {hoje.length > 0 && (
                    <Link
                      href="/clientes"
                      className="block rounded-lg bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 p-3 hover:from-pink-100 hover:to-rose-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🎂</div>
                        <div className="flex-1">
                          <div className="font-bold text-pink-900 text-sm">
                            {hoje.length === 1
                              ? `${hoje[0].nome} faz aniversário hoje!`
                              : `${hoje.length} aniversariantes hoje!`}
                          </div>
                          <div className="text-xs text-pink-700">
                            Manda parabéns 🎉
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-pink-700" />
                      </div>
                    </Link>
                  )}

                  {/* Resumo em colunas */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-primary/5 p-3">
                      <div className="text-xs text-muted-foreground">
                        Cadastrados
                      </div>
                      <div className="text-2xl font-bold tabular mt-1">
                        {customers.length}
                      </div>
                    </div>
                    <div className="rounded-lg bg-pink-50 dark:bg-pink-950/20 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Cake className="h-3 w-3" /> Aniversário no mês
                      </div>
                      <div className="text-2xl font-bold tabular mt-1 text-pink-600">
                        {mes.length}
                      </div>
                    </div>
                    <div className="rounded-lg bg-warning/10 p-3">
                      <div className="text-xs text-muted-foreground">
                        Sumidos
                      </div>
                      <div className="text-2xl font-bold tabular mt-1 text-warning">
                        {sumidos.length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        +30 dias sem compra
                      </div>
                    </div>
                    <div className="rounded-lg bg-success/10 p-3">
                      <div className="text-xs text-muted-foreground">
                        Cliente top
                      </div>
                      <div className="font-bold tabular mt-1 text-sm truncate">
                        {top3[0]?.cliente.nome ?? "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {top3[0] ? formatBRL(top3[0].totalCompras) : ""}
                      </div>
                    </div>
                  </div>

                  {/* Sumidos action */}
                  {sumidos.length > 0 && (
                    <Link
                      href="/clientes"
                      className="block rounded-lg border border-warning/30 bg-warning/5 p-3 hover:bg-warning/10 transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-xl">✨</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">
                            Manda cupom pros {sumidos.length} cliente
                            {sumidos.length > 1 ? "s" : ""} sumido
                            {sumidos.length > 1 ? "s" : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Você tem mensagens prontas pra mandar no WhatsApp.
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-warning" />
                      </div>
                    </Link>
                  )}
                </>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Bloco Maquininhas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Maquininhas
            </CardTitle>
            <CardDescription>
              Resumo das suas {machines.length} maquininhas cadastradas
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/maquininhas">Gerenciar</Link>
          </Button>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2">
          {(() => {
            const txMaq = transactions.filter((t) => t.origem === "maquininha");
            const hoje = txMaq.filter(
              (t) => new Date(t.data).toDateString() === new Date().toDateString()
            );
            const aguardando = txMaq.filter(
              (t) =>
                t.status === "aguardando_repasse" || t.status === "falta_receber"
            );
            const totalAguardando = aguardando.reduce(
              (s, t) => s + (t.valorEsperado || 0),
              0
            );
            const taxasEstimadas = txMaq.reduce(
              (s, t) => s + Math.max(0, t.valorVendido - t.valorEsperado),
              0
            );
            const divergencias = txMaq.filter(
              (t) =>
                t.status === "taxa_divergente" ||
                t.status === "valor_divergente" ||
                t.status === "cancelada"
            ).length;
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg bg-primary/5 p-3">
                  <div className="text-xs text-muted-foreground">Vendas hoje</div>
                  <div className="text-2xl font-bold tabular mt-1">{hoje.length}</div>
                </div>
                <div className="rounded-lg bg-warning/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    Aguardando repasse
                  </div>
                  <div className="text-2xl font-bold tabular mt-1 text-warning">
                    {formatBRL(totalAguardando)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {aguardando.length} transações
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  <div className="text-xs text-muted-foreground">Taxas estimadas</div>
                  <div className="text-2xl font-bold tabular mt-1">
                    {formatBRL(taxasEstimadas)}
                  </div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <div className="text-xs text-muted-foreground">Divergências</div>
                  <div className="text-2xl font-bold tabular mt-1 text-destructive">
                    {divergencias}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Cards de status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cardsStatus.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4 hover:border-primary/40 transition-colors cursor-pointer">
              <Link href="/conferencia" className="block">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "flex h-9 w-9 items-center justify-center rounded-lg " +
                      (c.tone === "success"
                        ? "bg-success/10 text-success"
                        : c.tone === "warning"
                          ? "bg-warning/10 text-warning"
                          : c.tone === "destructive"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary")
                    }
                  >
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-semibold tabular leading-none">{c.count}</div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {c.label}
                    </div>
                  </div>
                </div>
              </Link>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de barras: vendas por forma de pagamento */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vendas por forma de pagamento</CardTitle>
            <CardDescription>Total vendido em maio/2026</CardDescription>
          </CardHeader>
          <div className="px-2 pb-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMethod} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(220 9% 46%)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(220 9% 46%)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)
                  }
                />
                <Tooltip
                  formatter={(v: number) => formatBRL(v)}
                  contentStyle={{
                    background: "white",
                    border: "1px solid hsl(220 13% 91%)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                  {byMethod.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição</CardTitle>
            <CardDescription>Por forma de pagamento</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={byMethod}
                  dataKey="valor"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {byMethod.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatBRL(v)}
                  contentStyle={{
                    background: "white",
                    border: "1px solid hsl(220 13% 91%)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3">
              {byMethod.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="flex-1">{m.name}</span>
                  <span className="text-muted-foreground tabular">{m.qtd}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Últimas divergências */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Últimas divergências encontradas</CardTitle>
            <CardDescription>Transações que precisam da sua atenção</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/conferencia">Ver todas</Link>
          </Button>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2">
          {ultimasDivergencias.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma divergência encontrada. Tudo certo por aqui! ✅
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ultimasDivergencias.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.descricao}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{METHOD_LABELS[t.metodo]}</span>
                      <span>•</span>
                      <span>{formatRelativeDate(t.data)}</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="font-semibold tabular text-sm">
                      {formatBRL(t.valorVendido)}
                    </div>
                    {t.valorRecebido > 0 && t.valorRecebido !== t.valorEsperado && (
                      <div className="text-xs text-destructive tabular">
                        {formatBRL(t.valorRecebido - t.valorEsperado)} diferença
                      </div>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Aviso de produto */}
      <Card className="p-4 bg-secondary/30 border-border">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">O ConferePix não é uma maquininha.</strong>{" "}
            O app registra, acompanha e confere as vendas que entraram nas suas
            maquininhas — mostra se a taxa veio certa e se o valor líquido caiu na
            conta. Quem recebe o dinheiro continua sendo a sua adquirente (MP, Stone,
            Ton, etc).
          </div>
        </div>
      </Card>
    </div>
  );
}
