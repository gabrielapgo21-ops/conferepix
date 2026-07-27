"use client";

/**
 * PDV (Ponto de Venda) avançado — carrinho, desconto, troco, cliente, cupom WhatsApp.
 *
 * Esquerda (md+): grid de produtos populares + busca
 * Direita: carrinho com itens, desconto, cliente vinculado, total, formas de pagamento
 *
 * No mobile, o carrinho fica embaixo (single column).
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  CheckCircle2,
  Smartphone,
  Banknote,
  Receipt,
  Search,
  Package,
  Plus,
  Minus,
  Trash2,
  Percent,
  User,
  X,
  MessageCircle,
  ScanLine,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScannerModal } from "@/components/ScannerModal";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import { DicaContextual } from "@/components/DicaContextual";
import { formatBRL, uid, cn } from "@/lib/utils";
import type {
  PaymentMethod,
  Transaction,
  TransactionStatus,
  TransactionSource,
} from "@/lib/types";
import type { Product } from "@/lib/products";
import type { Customer } from "@/lib/customers";

type FormaTopo = "pix" | "dinheiro" | "maquininha";

interface CartItem {
  produtoId?: string; // opcional pra itens avulsos
  nome: string;
  preco: number;
  qtd: number;
  fotoUrl?: string;
}

function calcExpected(valor: number, taxaPct: number): number {
  return Math.round(valor * (1 - taxaPct / 100) * 100) / 100;
}

export default function VendasPage() {
  const mounted = useHasMounted();
  const machines = useStore((s) => s.machines);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const addSale = useStore((s) => s.addSale);
  const updateProduct = useStore((s) => s.updateProduct);

  // ===== Carrinho =====
  const [cart, setCart] = useState<CartItem[]>([]);
  const [busca, setBusca] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // ===== Cliente =====
  const [clienteSel, setClienteSel] = useState<Customer | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [mostrarBuscaCliente, setMostrarBuscaCliente] = useState(false);

  // ===== Desconto =====
  const [desconto, setDesconto] = useState(0); // valor absoluto em R$
  const [tipoDesc, setTipoDesc] = useState<"reais" | "percentual">("reais");
  const [percentualDesc, setPercentualDesc] = useState(0);

  // ===== Pagamento =====
  const [formaTopo, setFormaTopo] = useState<FormaTopo>("pix");
  const [maquininhaId, setMaquininhaId] = useState(machines[0]?.id ?? "");
  const [metodoMaq, setMetodoMaq] = useState<PaymentMethod>("credito_avista");
  const [parcelas, setParcelas] = useState(2);
  const [valorRecebido, setValorRecebido] = useState(0); // pra calcular troco no dinheiro

  // ===== Pagamento misto =====
  const [misto, setMisto] = useState(false);
  const [valorParte2, setValorParte2] = useState(0);
  const [parte2Forma, setParte2Forma] = useState<"pix" | "dinheiro" | "maquininha">("dinheiro");

  // ===== Pós-venda =====
  const [vendaConfirmada, setVendaConfirmada] = useState<{
    total: number;
    troco: number;
    cliente: Customer | null;
  } | null>(null);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const maquininha = machines.find((m) => m.id === maquininhaId);

  // ===== Cálculos =====
  const subtotal = cart.reduce((s, i) => s + i.preco * i.qtd, 0);
  const descontoEfetivo =
    tipoDesc === "percentual" ? (subtotal * percentualDesc) / 100 : desconto;
  const descontoLimitado = Math.min(descontoEfetivo, subtotal);
  const total = Math.max(0, subtotal - descontoLimitado);
  const troco = Math.max(0, valorRecebido - total);

  const taxa = useMemo(() => {
    if (formaTopo === "dinheiro" || formaTopo === "pix") return 0;
    if (!maquininha) return 0;
    if (metodoMaq === "debito") return maquininha.taxaDebito;
    if (metodoMaq === "credito_avista") return maquininha.taxaCreditoAvista;
    if (metodoMaq === "credito_parcelado") return maquininha.taxaCreditoParcelado;
    return 0;
  }, [formaTopo, maquininha, metodoMaq]);

  const valorLiquido = calcExpected(total, taxa);

  // ===== Busca de produto =====
  const resultadosBusca = useMemo(() => {
    if (!busca || busca.length < 1) return [];
    const q = busca.toLowerCase();
    return products
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          (p.codigoBarras ?? "").includes(q) ||
          (p.categoria ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, busca]);

  // ===== Top vendidos pra mostrar como sugestão =====
  const topVendidos = useMemo(() => {
    return [...products]
      .filter((p) => p.vendidoNoMes && p.vendidoNoMes > 0)
      .sort((a, b) => (b.vendidoNoMes ?? 0) - (a.vendidoNoMes ?? 0))
      .slice(0, 8);
  }, [products]);

  // ===== Busca de cliente =====
  const resultadosCliente = useMemo(() => {
    if (!buscaCliente || buscaCliente.length < 1) return [];
    const q = buscaCliente.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.telefone ?? "").includes(buscaCliente)
      )
      .slice(0, 5);
  }, [customers, buscaCliente]);

  // ===== Ações do carrinho =====
  const addToCart = (p: Product) => {
    setCart((c) => {
      const idx = c.findIndex((i) => i.produtoId === p.id);
      if (idx >= 0) {
        const nv = [...c];
        nv[idx] = { ...nv[idx], qtd: nv[idx].qtd + 1 };
        return nv;
      }
      return [
        ...c,
        {
          produtoId: p.id,
          nome: p.nome,
          preco: p.preco,
          qtd: 1,
          fotoUrl: p.fotoUrl,
        },
      ];
    });
    setBusca("");
  };

  const addAvulso = (nome: string, preco: number) => {
    if (!nome || preco <= 0) return;
    setCart((c) => [...c, { nome, preco, qtd: 1 }]);
  };

  const updateQtd = (idx: number, delta: number) => {
    setCart((c) => {
      const nv = [...c];
      const novaQtd = nv[idx].qtd + delta;
      if (novaQtd <= 0) return nv.filter((_, i) => i !== idx);
      nv[idx] = { ...nv[idx], qtd: novaQtd };
      return nv;
    });
  };

  const removeItem = (idx: number) => {
    setCart((c) => c.filter((_, i) => i !== idx));
  };

  const limparTudo = () => {
    setCart([]);
    setDesconto(0);
    setPercentualDesc(0);
    setValorRecebido(0);
    setClienteSel(null);
    setMisto(false);
    setValorParte2(0);
  };

  // ===== Scanner pra adicionar via código de barras =====
  const handleScanResult = (code: string) => {
    setShowScanner(false);
    const p = products.find((p) => p.codigoBarras === code);
    if (p) {
      addToCart(p);
    } else {
      setBusca(code);
    }
  };

  // ===== Registrar venda =====
  function buildSale(
    forma: "pix" | "dinheiro" | "maquininha",
    valorParcial: number,
    descPrefix: string
  ): Transaction {
    let metodo: PaymentMethod = "pix";
    let origem: TransactionSource = "venda_manual";
    let status: TransactionStatus = "ok";
    let dias = 0;
    let valorRec = valorParcial;
    let taxaUsada = 0;
    let maqId: string | undefined;
    let parcelasUsadas: number | undefined;

    if (forma === "pix") {
      metodo = "pix";
      origem = "pix_manual";
    } else if (forma === "dinheiro") {
      metodo = "dinheiro";
      origem = "venda_manual";
      valorRec = valorParcial;
    } else {
      metodo = metodoMaq;
      origem = "maquininha";
      maqId = maquininha?.id;
      status = "aguardando_repasse";
      valorRec = 0;
      dias =
        metodoMaq === "debito"
          ? maquininha?.prazoDebito ?? 1
          : maquininha?.prazoCredito ?? 30;
      taxaUsada = taxa;
      parcelasUsadas = metodoMaq === "credito_parcelado" ? parcelas : undefined;
    }

    const valorEsp = calcExpected(valorParcial, taxaUsada);
    const repasse = new Date();
    repasse.setDate(repasse.getDate() + dias);

    return {
      id: "venda-" + uid(),
      data: new Date().toISOString(),
      metodo,
      descricao: descPrefix,
      valorVendido: valorParcial,
      valorEsperado: valorEsp,
      valorRecebido: forma === "maquininha" ? 0 : valorEsp,
      taxaEsperada: taxaUsada,
      taxaCobrada: taxaUsada,
      status,
      parcelas: parcelasUsadas,
      diasParaReceber: dias || undefined,
      origem,
      maquininhaId: maqId,
      dataRepassePrevisto: dias ? repasse.toISOString() : undefined,
      clienteId: clienteSel?.id,
      clienteNome: clienteSel?.nome,
    };
  }

  const handleRegistrar = () => {
    if (cart.length === 0 || total <= 0) return;

    // Descrição com itens do carrinho
    const descBase = cart
      .map((i) => `${i.qtd}× ${i.nome}`)
      .join(", ")
      .slice(0, 80);
    const descricaoFinal =
      cart.length > 1
        ? `Venda com ${cart.length} itens: ${descBase}`
        : descBase;

    if (misto && valorParte2 > 0 && valorParte2 < total) {
      const valorParte1 = total - valorParte2;
      addSale(buildSale(formaTopo, valorParte1, `${descricaoFinal} (1/2)`));
      addSale(buildSale(parte2Forma, valorParte2, `${descricaoFinal} (2/2)`));
    } else {
      addSale(buildSale(formaTopo, total, descricaoFinal));
    }

    // Atualiza vendidoNoMes / faturamentoNoMes de cada produto vinculado
    for (const item of cart) {
      if (item.produtoId) {
        const p = products.find((pp) => pp.id === item.produtoId);
        if (p) {
          updateProduct(p.id, {
            vendidoNoMes: (p.vendidoNoMes ?? 0) + item.qtd,
            faturamentoNoMes:
              (p.faturamentoNoMes ?? 0) + item.preco * item.qtd,
            ultimaVenda: new Date().toISOString(),
          });
        }
      }
    }

    // Estado pós-venda
    setVendaConfirmada({
      total,
      troco: formaTopo === "dinheiro" ? troco : 0,
      cliente: clienteSel,
    });

    // Reset
    limparTudo();
  };

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <DicaContextual
        id="dica-vendas"
        emoji="🛒"
        titulo="Vendas relâmpago"
        texto="Busca um produto, monta o carrinho, escolhe a forma e registra. No dinheiro eu calculo o troco. Bipa código de barras pra ir ainda mais rápido."
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Nova venda
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monta o carrinho, escolhe a forma e registra. Rapidinho.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowScanner(true)}
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline">Bipar código</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ============ COLUNA ESQUERDA — PRODUTOS ============ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Busca + scanner */}
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto: nome, código, categoria..."
                className="pl-9"
                autoFocus
              />
            </div>

            {/* Resultados da busca */}
            {resultadosBusca.length > 0 && (
              <div className="mt-3 border border-border rounded-lg overflow-hidden divide-y divide-border max-h-72 overflow-y-auto">
                {resultadosBusca.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/40 text-left active:bg-secondary"
                  >
                    <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
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
                        {p.categoria ?? "Sem categoria"}
                        {p.codigoBarras && ` · ${p.codigoBarras}`}
                      </div>
                    </div>
                    <div className="font-bold tabular text-sm flex-shrink-0">
                      {formatBRL(p.preco)}
                    </div>
                    <Plus className="h-4 w-4 text-primary flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Item avulso (quando não encontra) */}
            {busca.length > 2 && resultadosBusca.length === 0 && (
              <div className="mt-3 p-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                Nenhum produto encontrado.{" "}
                <button
                  type="button"
                  onClick={() => {
                    const preco = parseFloat(prompt("Preço do item:") || "0");
                    if (preco > 0) {
                      addAvulso(busca, preco);
                      setBusca("");
                    }
                  }}
                  className="text-primary underline font-medium"
                >
                  Adicionar como item avulso
                </button>
              </div>
            )}
          </Card>

          {/* Sugestões — top vendidos */}
          {topVendidos.length > 0 && !busca && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">
                ⭐ Mais vendidos — toca pra adicionar
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {topVendidos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 p-3 transition active:scale-95 text-left"
                  >
                    <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center overflow-hidden mx-auto mb-2">
                      {p.fotoUrl?.startsWith("data:") ||
                      p.fotoUrl?.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.fotoUrl}
                          alt={p.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{p.fotoUrl ?? "📦"}</span>
                      )}
                    </div>
                    <div className="text-xs font-medium truncate text-center">
                      {p.nome}
                    </div>
                    <div className="text-xs font-bold tabular text-primary text-center mt-0.5">
                      {formatBRL(p.preco)}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ============ COLUNA DIREITA — CARRINHO ============ */}
        <div className="lg:col-span-2">
          <Card className="p-4 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Carrinho
                {cart.length > 0 && (
                  <Badge variant="default" className="text-[10px]">
                    {cart.reduce((s, i) => s + i.qtd, 0)}
                  </Badge>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={limparTudo}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Itens do carrinho */}
            {cart.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Carrinho vazio.
                <br />
                <span className="text-xs">Busca produtos pra adicionar.</span>
              </div>
            ) : (
              <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {cart.map((item, idx) => (
                    <motion.div
                      key={`${item.produtoId ?? idx}-${idx}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center gap-2 bg-secondary/40 rounded-md p-2"
                    >
                      <div className="h-8 w-8 rounded bg-card flex items-center justify-center text-base flex-shrink-0">
                        {item.fotoUrl?.startsWith("data:") ||
                        item.fotoUrl?.startsWith("http") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.fotoUrl}
                            alt=""
                            className="h-full w-full object-cover rounded"
                          />
                        ) : (
                          <span>{item.fotoUrl ?? "📦"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {item.nome}
                        </div>
                        <div className="text-[10px] text-muted-foreground tabular">
                          {formatBRL(item.preco)} × {item.qtd} ={" "}
                          {formatBRL(item.preco * item.qtd)}
                        </div>
                      </div>
                      <div className="flex items-center bg-card rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQtd(idx, -1)}
                          className="h-7 w-7 flex items-center justify-center hover:bg-secondary"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <div className="w-6 text-center text-xs font-bold tabular">
                          {item.qtd}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateQtd(idx, 1)}
                          className="h-7 w-7 flex items-center justify-center hover:bg-secondary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Cliente */}
            {cart.length > 0 && (
              <div className="mb-3 pt-3 border-t border-border">
                {clienteSel ? (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/30 rounded-md p-2">
                    <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {clienteSel.nome}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Venda vinculada
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClienteSel(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : !mostrarBuscaCliente ? (
                  <button
                    type="button"
                    onClick={() => setMostrarBuscaCliente(true)}
                    className="w-full flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <User className="h-3.5 w-3.5" />
                    + Vincular a um cliente (opcional)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        value={buscaCliente}
                        onChange={(e) => setBuscaCliente(e.target.value)}
                        placeholder="Nome ou telefone do cliente..."
                        className="pl-7 text-xs h-9"
                        autoFocus
                      />
                    </div>
                    {resultadosCliente.length > 0 && (
                      <div className="border border-border rounded-md max-h-40 overflow-y-auto divide-y divide-border">
                        {resultadosCliente.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setClienteSel(c);
                              setBuscaCliente("");
                              setMostrarBuscaCliente(false);
                            }}
                            className="w-full text-left p-2 hover:bg-secondary text-xs"
                          >
                            <div className="font-medium">{c.nome}</div>
                            {c.telefone && (
                              <div className="text-[10px] text-muted-foreground">
                                {c.telefone}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarBuscaCliente(false);
                        setBuscaCliente("");
                      }}
                      className="text-[10px] text-muted-foreground hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Desconto */}
            {cart.length > 0 && (
              <div className="mb-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Desconto
                  </Label>
                  <div className="flex items-center bg-secondary rounded overflow-hidden text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTipoDesc("reais")}
                      className={cn(
                        "px-2 py-1",
                        tipoDesc === "reais"
                          ? "bg-primary text-primary-foreground"
                          : ""
                      )}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoDesc("percentual")}
                      className={cn(
                        "px-2 py-1",
                        tipoDesc === "percentual"
                          ? "bg-primary text-primary-foreground"
                          : ""
                      )}
                    >
                      %
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={tipoDesc === "reais" ? desconto : percentualDesc}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (tipoDesc === "reais") setDesconto(v);
                    else setPercentualDesc(v);
                  }}
                  placeholder="0"
                  className="mt-1 h-9"
                />
              </div>
            )}

            {/* Forma de pagamento */}
            {cart.length > 0 && (
              <div className="mb-3 pt-3 border-t border-border">
                <Label className="text-xs">Pagamento</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {[
                    { v: "pix", icon: Smartphone, label: "Pix" },
                    { v: "dinheiro", icon: Banknote, label: "Dinheiro" },
                    { v: "maquininha", icon: Receipt, label: "Cartão" },
                  ].map((o) => {
                    const Icon = o.icon;
                    const active = formaTopo === o.v;
                    return (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setFormaTopo(o.v as FormaTopo)}
                        className={cn(
                          "p-2 rounded-md border-2 flex flex-col items-center gap-0.5 transition active:scale-95",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span className="text-[10px] font-semibold">
                          {o.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {formaTopo === "maquininha" && (
                  <div className="mt-2 space-y-2">
                    <Select
                      value={maquininhaId}
                      onChange={(e) => setMaquininhaId(e.target.value)}
                      className="h-9 text-xs"
                    >
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.apelido}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={metodoMaq}
                      onChange={(e) =>
                        setMetodoMaq(e.target.value as PaymentMethod)
                      }
                      className="h-9 text-xs"
                    >
                      <option value="debito">Débito</option>
                      <option value="credito_avista">Crédito à vista</option>
                      <option value="credito_parcelado">
                        Crédito parcelado
                      </option>
                    </Select>
                    {metodoMaq === "credito_parcelado" && (
                      <Input
                        type="number"
                        min={2}
                        max={12}
                        value={parcelas}
                        onChange={(e) =>
                          setParcelas(parseInt(e.target.value) || 2)
                        }
                        className="h-9"
                        placeholder="Parcelas"
                      />
                    )}
                  </div>
                )}

                {formaTopo === "dinheiro" && (
                  <div className="mt-2">
                    <Label className="text-xs">Quanto a cliente deu?</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorRecebido || ""}
                      onChange={(e) =>
                        setValorRecebido(parseFloat(e.target.value) || 0)
                      }
                      placeholder={`Mín: ${formatBRL(total)}`}
                      className="mt-1 h-9 text-base font-semibold"
                    />
                    {valorRecebido > 0 && valorRecebido >= total && (
                      <div className="mt-1.5 bg-success/10 text-success rounded-md p-2 text-xs">
                        💰 Troco:{" "}
                        <strong className="text-base">
                          {formatBRL(troco)}
                        </strong>
                      </div>
                    )}
                    {valorRecebido > 0 && valorRecebido < total && (
                      <div className="mt-1.5 bg-warning/10 text-warning rounded-md p-2 text-xs">
                        Faltam {formatBRL(total - valorRecebido)}
                      </div>
                    )}
                  </div>
                )}

                {/* Pagamento misto */}
                <button
                  type="button"
                  onClick={() => setMisto((v) => !v)}
                  className="text-[10px] text-primary hover:underline mt-2"
                >
                  {misto ? "− Tirar misto" : "+ Pagou em duas formas"}
                </button>
                {misto && (
                  <div className="mt-2 space-y-2 bg-primary/5 rounded-md p-2">
                    <div className="text-[10px] text-muted-foreground">
                      Primeira parte: {formaTopo} ({formatBRL(total - valorParte2)})
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Select
                        value={parte2Forma}
                        onChange={(e) =>
                          setParte2Forma(
                            e.target.value as "pix" | "dinheiro" | "maquininha"
                          )
                        }
                        className="h-8 text-xs"
                      >
                        <option value="pix">Pix</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="maquininha">Cartão</option>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={valorParte2}
                        onChange={(e) =>
                          setValorParte2(parseFloat(e.target.value) || 0)
                        }
                        placeholder="Valor 2ª parte"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Totais */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-border space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular">{formatBRL(subtotal)}</span>
                </div>
                {descontoLimitado > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="tabular text-warning">
                      − {formatBRL(descontoLimitado)}
                    </span>
                  </div>
                )}
                {taxa > 0 && (
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Taxa maquininha {taxa.toFixed(2)}%</span>
                    <span className="tabular">
                      Você recebe {formatBRL(valorLiquido)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="tabular text-primary text-xl">
                    {formatBRL(total)}
                  </span>
                </div>
              </div>
            )}

            {/* Botão */}
            <Button
              onClick={handleRegistrar}
              disabled={cart.length === 0 || total <= 0}
              size="lg"
              variant="success"
              className="w-full mt-4 text-base"
            >
              <ShoppingBag className="h-5 w-5" />
              Registrar venda · {formatBRL(total)}
            </Button>
          </Card>
        </div>
      </div>

      {/* Scanner */}
      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
        />
      )}

      {/* Modal pós-venda — sucesso + cupom WhatsApp */}
      <AnimatePresence>
        {vendaConfirmada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setVendaConfirmada(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl max-w-sm w-full p-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="h-16 w-16 rounded-full bg-success/10 text-success mx-auto mb-3 flex items-center justify-center"
                >
                  <CheckCircle2 className="h-10 w-10" />
                </motion.div>
                <div className="text-xl font-bold mb-1">Venda registrada!</div>
                <div className="text-3xl font-bold text-primary tabular mb-1">
                  {formatBRL(vendaConfirmada.total)}
                </div>
                {vendaConfirmada.troco > 0 && (
                  <div className="bg-success/10 text-success rounded-lg p-3 mt-3">
                    <div className="text-xs">Troco pra dar:</div>
                    <div className="text-2xl font-bold tabular">
                      {formatBRL(vendaConfirmada.troco)}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de ação */}
              <div className="mt-5 space-y-2">
                {vendaConfirmada.cliente && (
                  <Button
                    onClick={() => setShowWhatsApp(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Mandar agradecimento pra {vendaConfirmada.cliente.nome}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setVendaConfirmada(null)}
                  className="w-full"
                >
                  Próxima venda
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal WhatsApp */}
      {showWhatsApp && vendaConfirmada?.cliente && (
        <WhatsAppModal
          cliente={vendaConfirmada.cliente}
          onClose={() => {
            setShowWhatsApp(false);
            setVendaConfirmada(null);
          }}
        />
      )}
    </div>
  );
}
