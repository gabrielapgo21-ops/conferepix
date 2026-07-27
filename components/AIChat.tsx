"use client";

/**
 * Chat flutuante com a Pix — assistente IA do ConferePix.
 *
 * - Botão circular no canto inferior direito
 * - Abre painel deslizante com histórico de chat
 * - Injeta snapshot do negócio em cada chamada (RAG simplificado)
 * - Funciona em mobile e desktop
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  compararMeses,
  calcularLucro,
  maisVendidos,
  produtosParados,
} from "@/lib/analytics";
import { sugerirReposicoes } from "@/lib/stock";
import { aniversariantesDoDia, resumirTodos } from "@/lib/customers";

interface Mensagem {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const SUGESTOES_INICIAIS = [
  "Como tá meu mês?",
  "O que vendi mais?",
  "Quem tá sumido?",
  "O que tá parado?",
  "Dá uma dica de promoção",
];

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pega TUDO do store pra montar o contexto
  const transactions = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const nomeLoja = useStore((s) => s.store.nomeLoja);

  // Carrega histórico do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("conferepix-chat");
      if (saved) {
        const parsed = JSON.parse(saved) as Mensagem[];
        if (Array.isArray(parsed)) setMensagens(parsed.slice(-30));
      }
    } catch {
      // ignora
    }
  }, []);

  // Salva histórico (últimas 30 mensagens) quando muda
  useEffect(() => {
    try {
      localStorage.setItem(
        "conferepix-chat",
        JSON.stringify(mensagens.slice(-30))
      );
    } catch {
      // ignora — pode ser quota cheia
    }
  }, [mensagens]);

  // Auto-scroll quando chega mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, carregando]);

  // Monta contexto do negócio dinamicamente
  const contexto = useMemo(() => {
    const comp = compararMeses(transactions);
    const lucro = calcularLucro(products);
    const top = maisVendidos(products, 5);
    const parados = produtosParados(products, 30).slice(0, 3);
    const sug = sugerirReposicoes(products);
    const reposicaoUrgente = sug
      .filter((s) => s.urgencia === "critica" || s.urgencia === "alta")
      .slice(0, 3)
      .map((s) => ({
        nome: s.produto.nome,
        motivo: s.motivo,
      }));
    const hojeAniv = aniversariantesDoDia(customers);
    const resumos = resumirTodos(customers, transactions);
    const sumidos = resumos.filter((r) => r.status === "sumido").length;

    // Forma de pagamento mais usada
    const metodos: Record<string, number> = {};
    for (const t of transactions) {
      metodos[t.metodo] = (metodos[t.metodo] ?? 0) + 1;
    }
    const formaPagamentoTop = Object.entries(metodos).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    return {
      nomeLoja,
      totalProdutos: products.length,
      totalVendasMes: comp.qtdAtual,
      faturamentoMes: comp.valorAtual,
      lucroMes: lucro.temDadosSuficientes ? lucro.lucroEstimado : undefined,
      margem: lucro.temDadosSuficientes ? lucro.margemMedia : undefined,
      variacaoMes: comp.variacaoPercentual,
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
      formaPagamentoTop,
    };
  }, [transactions, products, customers, nomeLoja]);

  const enviar = async (texto: string) => {
    const msg = texto.trim();
    if (!msg || carregando) return;

    const novaUser: Mensagem = {
      role: "user",
      content: msg,
      ts: Date.now(),
    };
    const historico = [...mensagens, novaUser];
    setMensagens(historico);
    setInput("");
    setCarregando(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: historico.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          contexto,
        }),
      });
      const data = await res.json();
      const resposta =
        data?.resposta ||
        "Hmm, deu ruim aqui. Tenta de novo numa.";

      setMensagens((prev) => [
        ...prev,
        { role: "assistant", content: resposta, ts: Date.now() },
      ]);
    } catch {
      setMensagens((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sem internet aqui ó. Tenta de novo quando o sinal voltar 📶",
          ts: Date.now(),
        },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  const limpar = () => {
    if (confirm("Apagar todo o histórico de chat?")) {
      setMensagens([]);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ scale: 0 }}
        animate={{ scale: open ? 0 : 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-20 lg:bottom-6 right-4 z-30 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-xl flex items-center justify-center hover:shadow-2xl transition-shadow"
        aria-label="Conversar com a Pix"
      >
        <div className="relative">
          <Sparkles className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </motion.button>

      {/* Painel de chat */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
            />

            {/* Painel */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", damping: 24 }}
              className="fixed bottom-0 right-0 lg:bottom-6 lg:right-6 left-0 lg:left-auto z-50 lg:w-[400px] h-[85vh] lg:h-[600px] lg:rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold leading-tight">Pix</div>
                    <div className="text-xs opacity-90 leading-tight flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
                      Sua assistente
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {mensagens.length > 0 && (
                    <button
                      type="button"
                      onClick={limpar}
                      className="h-8 w-8 rounded-md hover:bg-white/10 flex items-center justify-center"
                      title="Apagar conversa"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 rounded-md hover:bg-white/10 flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Mensagens */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-secondary/20 to-card"
              >
                {mensagens.length === 0 && !carregando && (
                  <div className="text-center py-6 space-y-3">
                    <div className="inline-flex h-14 w-14 rounded-full bg-primary/10 items-center justify-center mb-2">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold mb-1">
                        Oi! Eu sou a Pix 💚
                      </div>
                      <div className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                        Sou sua assistente de negócio. Pergunta sobre vendas,
                        estoque, clientes — eu tenho todos os seus dados aqui!
                      </div>
                    </div>
                    <div className="space-y-1.5 max-w-xs mx-auto pt-2">
                      {SUGESTOES_INICIAIS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => enviar(s)}
                          className="block w-full text-left text-xs bg-card hover:bg-secondary border border-border rounded-lg px-3 py-2 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mensagens.map((m, i) => (
                  <div
                    key={`${m.ts}-${i}`}
                    className={
                      m.role === "user" ? "flex justify-end" : "flex justify-start"
                    }
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border rounded-tl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {carregando && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sugestões rápidas (se já tem chat) */}
              {mensagens.length > 0 && !carregando && (
                <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {SUGESTOES_INICIAIS.slice(0, 3).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      className="text-[10px] bg-secondary hover:bg-secondary/70 rounded-full px-2.5 py-1 whitespace-nowrap transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-border p-3 bg-card">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    enviar(input);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pergunta algo..."
                    disabled={carregando}
                    className="flex-1 h-10 rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || carregando}
                    className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition active:scale-95"
                  >
                    {carregando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
