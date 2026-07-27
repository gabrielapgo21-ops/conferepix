"use client";

/**
 * Estúdio de Marketing IA — gera conteúdo pronto a partir de cada produto.
 *
 * Fluxo:
 *  1. Escolhe um produto
 *  2. Escolhe o tipo (post, descrição, hashtags, etc)
 *  3. IA gera, você copia ou edita
 *  4. Compartilha direto (WhatsApp, copia, etc)
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Hash,
  MessageCircle,
  ShoppingBag,
  DollarSign,
  PartyPopper,
  Copy,
  Check,
  Loader2,
  Search,
  Send,
  RefreshCw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatBRL } from "@/lib/utils";
import { DicaContextual } from "@/components/DicaContextual";
import type { Product } from "@/lib/products";

type TipoGeracao =
  | "post_instagram"
  | "descricao_marketplace"
  | "copy_whatsapp"
  | "hashtags"
  | "preco_sugerido"
  | "ideia_promocao";

interface OpcaoTipo {
  id: TipoGeracao;
  emoji: string;
  titulo: string;
  desc: string;
  icone: React.ElementType;
}

const TIPOS: OpcaoTipo[] = [
  {
    id: "post_instagram",
    emoji: "📱",
    titulo: "Post Instagram",
    desc: "Pronto pra colar no Insta/Facebook",
    icone: Sparkles,
  },
  {
    id: "descricao_marketplace",
    emoji: "🛒",
    titulo: "Descrição marketplace",
    desc: "Pra Shopee, ML, site",
    icone: ShoppingBag,
  },
  {
    id: "copy_whatsapp",
    emoji: "💬",
    titulo: "Status WhatsApp",
    desc: "Mensagem curta de divulgação",
    icone: MessageCircle,
  },
  {
    id: "hashtags",
    emoji: "#️⃣",
    titulo: "15 hashtags",
    desc: "Mistura de alcance e nicho",
    icone: Hash,
  },
  {
    id: "preco_sugerido",
    emoji: "💰",
    titulo: "Preço sugerido",
    desc: "Análise + margem saudável",
    icone: DollarSign,
  },
  {
    id: "ideia_promocao",
    emoji: "🎁",
    titulo: "3 ideias de promoção",
    desc: "Combos, descontos, fidelidade",
    icone: PartyPopper,
  },
];

export default function MarketingIAPage() {
  const mounted = useHasMounted();
  const products = useStore((s) => s.products);
  const nomeLoja = useStore((s) => s.store.nomeLoja);

  const [produtoSel, setProdutoSel] = useState<Product | null>(null);
  const [busca, setBusca] = useState("");
  const [tipoSel, setTipoSel] = useState<TipoGeracao | null>(null);
  const [resultado, setResultado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  const resultadosBusca = useMemo(() => {
    if (!busca || busca.length < 1) return [];
    const q = busca.toLowerCase();
    return products
      .filter((p) => p.nome.toLowerCase().includes(q))
      .slice(0, 6);
  }, [products, busca]);

  const topProdutos = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.vendidoNoMes ?? 0) - (a.vendidoNoMes ?? 0))
      .slice(0, 6);
  }, [products]);

  const gerar = async (tipo: TipoGeracao) => {
    if (!produtoSel) return;
    setTipoSel(tipo);
    setResultado("");
    setCopiado(false);
    setCarregando(true);
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          produto: {
            nome: produtoSel.nome,
            categoria: produtoSel.categoria,
            preco: produtoSel.preco,
            custo: produtoSel.custo,
            vendidoNoMes: produtoSel.vendidoNoMes,
            observacoes: produtoSel.observacoes,
          },
          loja: { nomeLoja },
        }),
      });
      const data = await res.json();
      if (data?.resultado) {
        setResultado(data.resultado);
        setModo(data.modo || "?");
      }
    } catch {
      setResultado(
        "Deu erro pra gerar agora. Verifica sua conexão e tenta de novo."
      );
    } finally {
      setCarregando(false);
    }
  };

  const handleCopiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = resultado;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!resultado) return;
    const url = `https://wa.me/?text=${encodeURIComponent(resultado)}`;
    window.open(url, "_blank");
  };

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  const tipoAtual = TIPOS.find((t) => t.id === tipoSel);

  return (
    <div className="space-y-6">
      <DicaContextual
        id="dica-marketing-ia"
        emoji="✨"
        titulo="Conteúdo pronto em segundos"
        texto="Escolhe um produto, escolhe o tipo (post, descrição, hashtags...) e eu gero pra você. Copia e cola onde quiser!"
      />

      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">
          <Link href="/" className="hover:text-foreground">
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Voltar
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-blue-600 text-primary-foreground flex items-center justify-center">
            <Wand2 className="h-5 w-5" />
          </div>
          Estúdio de Marketing IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Escolhe um produto, escolhe o tipo, a Pix gera tudo pronto pra você
          colar.
        </p>
      </div>

      {/* PASSO 1: Escolher produto */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
            1
          </div>
          <div className="font-semibold">Escolhe o produto</div>
        </div>

        {produtoSel ? (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/30 rounded-lg p-3">
            <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {produtoSel.fotoUrl?.startsWith("data:") ||
              produtoSel.fotoUrl?.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={produtoSel.fotoUrl}
                  alt={produtoSel.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl">{produtoSel.fotoUrl ?? "📦"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{produtoSel.nome}</div>
              <div className="text-xs text-muted-foreground">
                {produtoSel.categoria ?? "Sem categoria"}
                {produtoSel.preco
                  ? ` · ${formatBRL(produtoSel.preco)}`
                  : ""}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setProdutoSel(null);
                setTipoSel(null);
                setResultado("");
              }}
            >
              Trocar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                className="pl-9"
              />
            </div>

            {resultadosBusca.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border mb-3">
                {resultadosBusca.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProdutoSel(p);
                      setBusca("");
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/40 text-left"
                  >
                    <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center overflow-hidden">
                      {p.fotoUrl?.startsWith("data:") ||
                      p.fotoUrl?.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.fotoUrl}
                          alt={p.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">{p.fotoUrl ?? "📦"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {p.nome}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatBRL(p.preco)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {topProdutos.length > 0 && !busca && (
              <>
                <div className="text-xs text-muted-foreground mb-2">
                  Ou escolhe um dos seus produtos:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {topProdutos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProdutoSel(p)}
                      className="text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 p-2 transition active:scale-95"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.fotoUrl?.startsWith("data:") ||
                          p.fotoUrl?.startsWith("http") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.fotoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-base">
                              {p.fotoUrl ?? "📦"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">
                            {p.nome}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatBRL(p.preco)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* PASSO 2: Escolher tipo */}
      {produtoSel && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                2
              </div>
              <div className="font-semibold">O que quer gerar?</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TIPOS.map((t) => {
                const Icone = t.icone;
                const active = tipoSel === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => gerar(t.id)}
                    disabled={carregando}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition active:scale-95",
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30",
                      carregando && "opacity-50 cursor-wait"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{t.emoji}</span>
                      <Icone className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="font-semibold text-sm">{t.titulo}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* PASSO 3: Resultado */}
      {(carregando || resultado) && tipoAtual && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/20 dark:to-blue-950/20 px-5 py-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xl">{tipoAtual.emoji}</span>
                <div>
                  <div className="font-bold text-sm leading-tight">
                    {tipoAtual.titulo}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">
                    {tipoAtual.desc}
                  </div>
                </div>
              </div>
              {resultado && !carregando && (
                <button
                  type="button"
                  onClick={() => gerar(tipoAtual.id)}
                  className="h-7 w-7 rounded-md hover:bg-white/50 dark:hover:bg-black/20 flex items-center justify-center"
                  title="Gerar outra versão"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="p-5">
              {carregando ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">A Pix tá pensando...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    className="w-full min-h-[180px] rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed font-medium whitespace-pre-wrap"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCopiar} size="sm" className="flex-1">
                      {copiado ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar texto
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleWhatsApp}
                      size="sm"
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <Send className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>

                  {modo && modo !== "cloudflare" && (
                    <div className="text-[10px] text-muted-foreground">
                      💡 Modo offline — geração local. A IA online dá resultados
                      melhores quando estiver disponível.
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
