"use client";

/**
 * Tela de reposição de estoque — "o que comprar agora".
 *
 * Mostra:
 * - Lista priorizada (crítico → alto → médio) de produtos que precisam repor
 * - Para cada um: motivo, quantidade sugerida, botão "Comprei X"
 * - Botão "Enviar pro WhatsApp" — abre a lista pronta pra mandar pro fornecedor
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  PackageCheck,
  AlertTriangle,
  ShoppingCart,
  Send,
  Copy,
  History,
  Check,
  Plus,
  Minus,
  ArrowLeft,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBRL, uid, cn, formatDateBR } from "@/lib/utils";
import {
  sugerirReposicoes,
  URGENCIA_LABEL,
  URGENCIA_COR,
  URGENCIA_EMOJI,
  listaDeComprasTxt,
  type Urgencia,
} from "@/lib/stock";
import { DicaContextual } from "@/components/DicaContextual";

export default function ReporPage() {
  const mounted = useHasMounted();
  const products = useStore((s) => s.products);
  const addStockEntry = useStore((s) => s.addStockEntry);
  const stockEntries = useStore((s) => s.stockEntries);

  const sugestoes = useMemo(() => sugerirReposicoes(products), [products]);

  // Estados de "Comprei" — quantidade que digitei pra cada produto antes de confirmar
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<Urgencia | "todos">("todos");
  const [copiado, setCopiado] = useState(false);

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  const setQtd = (id: string, qtd: number) => {
    setQuantidades((p) => ({ ...p, [id]: Math.max(0, qtd) }));
  };

  const confirmarCompra = (
    produtoId: string,
    produtoNome: string,
    qtd: number,
    custoUnitario?: number
  ) => {
    if (qtd <= 0) return;
    addStockEntry({
      id: "stock-" + uid(),
      data: new Date().toISOString(),
      produtoId,
      produtoNome,
      quantidade: qtd,
      custoUnitario: custoUnitario || undefined,
    });
    setConfirmados((c) => new Set(c).add(produtoId));
  };

  const sugestoesFiltradas = sugestoes.filter(
    (s) => filtro === "todos" || s.urgencia === filtro
  );

  const totais = {
    critica: sugestoes.filter((s) => s.urgencia === "critica").length,
    alta: sugestoes.filter((s) => s.urgencia === "alta").length,
    media: sugestoes.filter((s) => s.urgencia === "media").length,
    baixa: sugestoes.filter((s) => s.urgencia === "baixa").length,
  };

  const custoTotalEstimado = sugestoes.reduce((s, sug) => {
    const qtd = quantidades[sug.produto.id] ?? sug.quantidadeSugerida;
    const custo = sug.produto.custo ?? 0;
    return s + qtd * custo;
  }, 0);

  const handleCopiar = async () => {
    const txt = listaDeComprasTxt(sugestoes);
    try {
      await navigator.clipboard.writeText(txt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback: cria textarea e seleciona
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const txt = listaDeComprasTxt(sugestoes);
    const url = `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, "_blank");
  };

  const entradasRecentes = stockEntries.slice(0, 10);

  return (
    <div className="space-y-6">
      <DicaContextual
        id="dica-repor"
        emoji="🛒"
        titulo="Lista de compras inteligente"
        texto="Eu olho seu ritmo de vendas e te falo o que precisa repor. Clica em 'Enviar no WhatsApp' pra mandar a lista direto pro fornecedor!"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            <Link href="/" className="hover:text-foreground">
              <ArrowLeft className="inline h-3 w-3 mr-1" />
              Voltar
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-primary" />
            Repor estoque
          </h1>
          <p className="text-muted-foreground mt-1">
            O que você precisa comprar agora pra não ficar sem.
          </p>
        </div>
        {sugestoes.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={handleCopiar} variant="outline" size="sm">
              {copiado ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiado ? "Copiado!" : "Copiar lista"}
            </Button>
            <Button onClick={handleWhatsApp} size="sm">
              <Send className="h-4 w-4" />
              Enviar no WhatsApp
            </Button>
          </div>
        )}
      </div>

      {/* Resumo + filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["critica", "alta", "media", "baixa"] as Urgencia[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setFiltro(filtro === u ? "todos" : u)}
              className={cn(
                "rounded-lg border p-3 text-left transition active:scale-[0.98]",
                filtro === u ? URGENCIA_COR[u] + " ring-2 ring-current" : "border-border hover:bg-secondary"
              )}
            >
              <div className="text-xs flex items-center gap-1">
                {URGENCIA_EMOJI[u]} {URGENCIA_LABEL[u]}
              </div>
              <div className="text-2xl font-bold tabular mt-1">{totais[u]}</div>
            </button>
          ))}
        </div>
        {filtro !== "todos" && (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            Filtrando por <strong>{URGENCIA_LABEL[filtro]}</strong>.
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className="underline hover:text-foreground"
            >
              Limpar filtro
            </button>
          </div>
        )}
        {custoTotalEstimado > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            Custo estimado pra comprar tudo:{" "}
            <strong className="text-foreground tabular">
              {formatBRL(custoTotalEstimado)}
            </strong>
          </div>
        )}
      </Card>

      {/* Lista de sugestões */}
      {sugestoesFiltradas.length === 0 ? (
        <Card className="p-10 text-center">
          <PackageCheck className="h-12 w-12 mx-auto mb-3 text-success opacity-80" />
          <div className="font-semibold mb-1">Tudo certo no estoque! 🎉</div>
          <div className="text-sm text-muted-foreground">
            Nenhum produto precisa repor agora. Volte aqui de vez em quando.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {sugestoesFiltradas.map((s) => {
            const id = s.produto.id;
            const qtdEscolhida = quantidades[id] ?? s.quantidadeSugerida;
            const jaComprou = confirmados.has(id);
            const custo = s.produto.custo ?? 0;
            const isPhoto =
              s.produto.fotoUrl?.startsWith("data:") ||
              s.produto.fotoUrl?.startsWith("http");
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-card border rounded-xl overflow-hidden",
                  jaComprou ? "border-success/40 bg-success/5" : "border-border"
                )}
              >
                <div className="p-4 flex gap-3">
                  {/* Foto */}
                  <div className="h-14 w-14 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {isPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.produto.fotoUrl!}
                        alt={s.produto.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{s.produto.fotoUrl || "📦"}</span>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate">{s.produto.nome}</div>
                      <span
                        className={cn(
                          "text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border flex-shrink-0",
                          URGENCIA_COR[s.urgencia]
                        )}
                      >
                        {URGENCIA_EMOJI[s.urgencia]} {URGENCIA_LABEL[s.urgencia]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.motivo}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span>
                        Tem agora:{" "}
                        <strong className="text-foreground">
                          {s.quantidadeAtual}
                        </strong>
                      </span>
                      {s.vendasPorDia > 0 && (
                        <span>
                          Vendendo:{" "}
                          <strong className="text-foreground">
                            {s.vendasPorDia.toFixed(1)}/dia
                          </strong>
                        </span>
                      )}
                    </div>

                    {/* Bloco "Quanto comprar" */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <div className="text-xs text-muted-foreground">Comprar:</div>
                      <div className="flex items-center bg-secondary rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setQtd(id, qtdEscolhida - 1)}
                          disabled={jaComprou}
                          className="h-8 w-8 flex items-center justify-center hover:bg-border disabled:opacity-30"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <Input
                          type="number"
                          value={qtdEscolhida}
                          onChange={(e) =>
                            setQtd(id, parseInt(e.target.value) || 0)
                          }
                          disabled={jaComprou}
                          className="h-8 w-14 text-center border-0 bg-transparent tabular font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setQtd(id, qtdEscolhida + 1)}
                          disabled={jaComprou}
                          className="h-8 w-8 flex items-center justify-center hover:bg-border disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {custo > 0 && (
                        <Badge variant="default" className="text-[10px]">
                          {formatBRL(qtdEscolhida * custo)}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={jaComprou ? "outline" : "default"}
                        disabled={jaComprou || qtdEscolhida <= 0}
                        onClick={() =>
                          confirmarCompra(id, s.produto.nome, qtdEscolhida, custo)
                        }
                        className="ml-auto text-xs"
                      >
                        {jaComprou ? (
                          <>
                            <Check className="h-3 w-3" />
                            Comprei
                          </>
                        ) : (
                          "Comprei essa quantidade"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Entradas recentes (histórico) */}
      {entradasRecentes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Últimas compras
            </CardTitle>
            <CardDescription>
              Suas {entradasRecentes.length} entradas de estoque mais recentes.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 -mt-2 space-y-2">
            {entradasRecentes.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.produtoNome}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateBR(e.data)}
                    {e.custoUnitario && (
                      <> · {formatBRL(e.custoUnitario)}/un</>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular">+{e.quantidade}</div>
                  {e.custoUnitario && (
                    <div className="text-xs text-muted-foreground tabular">
                      {formatBRL(e.quantidade * e.custoUnitario)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Aviso explicativo */}
      <Card className="p-4 bg-secondary/30">
        <div className="flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-foreground">Como funciona:</strong> o sistema
            calcula a urgência olhando quantos você vendeu no mês e quanto ainda
            tem em estoque. A quantidade sugerida é o suficiente pra mais 30
            dias. Quando você marcar "Comprei", o estoque é atualizado
            automaticamente.
          </div>
        </div>
      </Card>
    </div>
  );
}
