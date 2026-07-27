"use client";

/**
 * Cards de insights gerados pela IA, renderizados no Dashboard.
 *
 * Faz fetch /api/ai/insights com o contexto do negócio
 * e cacheia em localStorage por 30 minutos (não recarrega a cada navegação).
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, ArrowUpRight, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import {
  compararMeses,
  calcularLucro,
  maisVendidos,
  produtosParados,
  melhorDiaSemana,
} from "@/lib/analytics";
import { sugerirReposicoes } from "@/lib/stock";
import { aniversariantesDoDia, resumirTodos } from "@/lib/customers";

interface Insight {
  emoji: string;
  titulo: string;
  descricao: string;
  acao: string;
  rota: string;
}

const CACHE_KEY = "conferepix-ai-insights";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export function AIInsights() {
  const transactions = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const nomeLoja = useStore((s) => s.store.nomeLoja);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState<string>("");

  const contexto = useMemo(() => {
    const comp = compararMeses(transactions);
    const lucro = calcularLucro(products);
    const top = maisVendidos(products, 5);
    const parados = produtosParados(products, 30).slice(0, 3);
    const sug = sugerirReposicoes(products);
    const reposicaoUrgente = sug
      .filter((s) => s.urgencia === "critica" || s.urgencia === "alta")
      .slice(0, 3)
      .map((s) => ({ nome: s.produto.nome, motivo: s.motivo }));
    const hojeAniv = aniversariantesDoDia(customers);
    const resumos = resumirTodos(customers, transactions);
    const sumidos = resumos.filter((r) => r.status === "sumido").length;
    const dias = melhorDiaSemana(transactions);
    const melhorDia = dias.reduce(
      (best, d) => (d.valor > best.valor ? d : best),
      dias[0]
    )?.dia;

    return {
      nomeLoja,
      totalProdutos: products.length,
      totalVendasMes: comp.qtdAtual,
      faturamentoMes: comp.valorAtual,
      lucroMes: lucro.temDadosSuficientes ? lucro.lucroEstimado : undefined,
      margem: lucro.temDadosSuficientes ? lucro.margemMedia : undefined,
      variacaoMes: comp.variacaoPercentual,
      melhorDia,
      topVendidos: top.map((t) => ({
        nome: t.produto.nome,
        qtd: t.qtd,
        faturamento: t.faturamento,
      })),
      parados: parados.map((p) => ({
        nome: p.produto.nome,
        dias: p.diasParado,
      })),
      reposicaoUrgente,
      totalClientes: customers.length,
      aniversariantesHoje: hojeAniv.map((c) => c.nome),
      clientesSumidos: sumidos,
    };
  }, [transactions, products, customers, nomeLoja]);

  const gerar = async (force = false) => {
    // Tenta cache
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (
            parsed?.ts &&
            Date.now() - parsed.ts < CACHE_TTL_MS &&
            Array.isArray(parsed.insights) &&
            parsed.insights.length > 0
          ) {
            setInsights(parsed.insights);
            setModo(parsed.modo || "cache");
            return;
          }
        }
      } catch {
        // ignora
      }
    }

    setCarregando(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contexto }),
      });
      const data = await res.json();
      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
        setModo(data.modo || "?");
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              insights: data.insights,
              modo: data.modo,
            })
          );
        } catch {
          // ignora quota
        }
      }
    } catch {
      // ignora — dashboard continua sem o card
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (insights.length === 0 && !carregando) return null;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-blue-50 to-purple-50 dark:from-primary/20 dark:via-blue-950/20 dark:to-purple-950/20 px-5 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-blue-600 text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">
              Insights da Pix
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Análise IA do seu negócio
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => gerar(true)}
          disabled={carregando}
          className="h-7 w-7 rounded-md hover:bg-white/50 dark:hover:bg-black/20 flex items-center justify-center disabled:opacity-40"
          title="Atualizar insights"
        >
          {carregando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {carregando && insights.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-secondary/30 p-3 animate-pulse"
              >
                <div className="h-5 w-12 bg-secondary rounded mb-2" />
                <div className="h-4 w-3/4 bg-secondary rounded mb-1.5" />
                <div className="h-3 w-full bg-secondary rounded" />
              </div>
            ))
          : insights.map((insight, i) => (
              <motion.div
                key={`${insight.titulo}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={insight.rota}
                  className="block rounded-lg border border-border hover:border-primary/40 bg-card hover:bg-primary/5 p-3 transition group h-full"
                >
                  <div className="text-2xl mb-1.5">{insight.emoji}</div>
                  <div className="font-bold text-sm leading-tight mb-1">
                    {insight.titulo}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {insight.descricao}
                  </div>
                  <div className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    {insight.acao}
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </Link>
              </motion.div>
            ))}
      </div>

      {modo && modo !== "cloudflare" && modo !== "cache" && (
        <div className="px-4 pb-3 text-[10px] text-muted-foreground">
          💡 Modo offline — insights gerados localmente
        </div>
      )}
    </Card>
  );
}
