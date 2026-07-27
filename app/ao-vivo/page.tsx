"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Smartphone,
  CreditCard,
  Banknote,
  Calendar,
  Radio,
  Play,
  Pause,
  Trash2,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveTxCard } from "@/components/LiveTxCard";
import { formatBRL, cn } from "@/lib/utils";
import { METHOD_LABELS, type PaymentMethod, type LiveTransaction } from "@/lib/types";

const AREA_DEFS: {
  metodo: PaymentMethod;
  label: string;
  Icon: typeof Smartphone;
  accent: string;
  bg: string;
  text: string;
  description: string;
}[] = [
  {
    metodo: "pix",
    label: "Pix",
    Icon: Smartphone,
    accent: "border-success",
    bg: "bg-success/5",
    text: "text-success",
    description: "Recebimentos instantâneos por chave Pix",
  },
  {
    metodo: "debito",
    label: "Débito",
    Icon: Banknote,
    accent: "border-primary",
    bg: "bg-primary/5",
    text: "text-primary",
    description: "Cartões de débito • cai em 1 dia útil",
  },
  {
    metodo: "credito_avista",
    label: "Crédito à vista",
    Icon: CreditCard,
    accent: "border-warning",
    bg: "bg-warning/5",
    text: "text-warning",
    description: "Cartões de crédito • cai em ~30 dias",
  },
  {
    metodo: "credito_parcelado",
    label: "Crédito parcelado",
    Icon: Calendar,
    accent: "border-destructive",
    bg: "bg-destructive/5",
    text: "text-destructive",
    description: "Parcelado em 2x ou mais • cai parcela a parcela",
  },
];

export default function AoVivoPage() {
  const mounted = useHasMounted();
  const liveFeed = useStore((s) => s.liveFeed);
  const machines = useStore((s) => s.machines);
  const pushLive = useStore((s) => s.pushLive);
  const clearLiveFeed = useStore((s) => s.clearLiveFeed);
  const mergeServerFeed = useStore((s) => s.mergeServerFeed);

  const [autoOn, setAutoOn] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [serverConnected, setServerConnected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling do servidor — busca transações reais que chegaram via webhook
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    let lastIds = new Set<string>();
    const poll = async () => {
      try {
        const res = await fetch("/api/live-feed", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { transactions: LiveTransaction[] };
        if (cancelled) return;
        // Detecta novas
        const novas = data.transactions.filter((t) => !lastIds.has(t.id));
        if (novas.length > 0) {
          mergeServerFeed(data.transactions);
          setServerConnected(true);
          // Destaca a mais recente
          setHighlightId(novas[0].id);
          setTimeout(() => setHighlightId(null), 2000);
        } else if (data.transactions.length > 0) {
          setServerConnected(true);
        }
        lastIds = new Set(data.transactions.map((t) => t.id));
      } catch {
        // silencioso — sem servidor é normal em SSR ou erro de rede momentâneo
      }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mounted, mergeServerFeed]);

  // Auto-simulação: gera transação a cada ~6-12 segundos
  useEffect(() => {
    if (!autoOn) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const tick = () => {
      const tx = pushLive();
      if (tx) {
        setHighlightId(tx.id);
        setTimeout(() => setHighlightId(null), 2000);
      }
    };
    // primeira transação rápida pra mostrar
    const firstDelay = setTimeout(tick, 1500);
    intervalRef.current = setInterval(tick, 6000 + Math.random() * 6000);
    return () => {
      clearTimeout(firstDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoOn, pushLive]);

  const handleManualPush = () => {
    const tx = pushLive();
    if (tx) {
      setHighlightId(tx.id);
      setTimeout(() => setHighlightId(null), 2000);
    }
  };

  // Agrupa feed por método
  const grouped = useMemo(() => {
    const g: Record<PaymentMethod, LiveTransaction[]> = {
      pix: [],
      debito: [],
      credito_avista: [],
      credito_parcelado: [],
      dinheiro: [],
    };
    liveFeed.forEach((t) => g[t.metodo].push(t));
    return g;
  }, [liveFeed]);

  const totalHoje = useMemo(
    () => liveFeed.reduce((s, t) => s + t.valor, 0),
    [liveFeed]
  );
  const liquidoHoje = useMemo(
    () => liveFeed.reduce((s, t) => s + t.valorLiquido, 0),
    [liveFeed]
  );
  const conectadas = machines.filter((m) => m.status === "conectada").length;

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Recebimentos ao Vivo
            </h1>
            {autoOn && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                AO VIVO
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Tudo que entra na maquininha cai aqui na hora — separado por tipo de pagamento.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleManualPush} variant="outline">
            <Zap className="h-4 w-4" />
            Nova transação
          </Button>
          <Button
            onClick={() => setAutoOn((v) => !v)}
            variant={autoOn ? "destructive" : "success"}
          >
            {autoOn ? (
              <>
                <Pause className="h-4 w-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Ligar simulação
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
        {serverConnected && (
          <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Recebendo do servidor real (Mercado Pago)
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="h-3 w-3" />
              Maquininhas conectadas
            </div>
            <div className="text-2xl font-bold mt-1 flex items-baseline gap-1.5">
              {conectadas}
              <span className="text-xs text-muted-foreground font-normal">
                / {machines.length} cadastradas
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Transações hoje</div>
            <div className="text-2xl font-bold mt-1 tabular">{liveFeed.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total bruto</div>
            <div className="text-2xl font-bold mt-1 tabular">{formatBRL(totalHoje)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Já líquido das taxas</div>
            <div className="text-2xl font-bold mt-1 tabular text-success">
              {formatBRL(liquidoHoje)}
            </div>
          </div>
        </div>
      </Card>

      {/* 4 ÁREAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {AREA_DEFS.map((area) => {
          const list = grouped[area.metodo];
          const total = list.reduce((s, t) => s + t.valor, 0);
          return (
            <Card
              key={area.metodo}
              className={cn("overflow-hidden border-t-4", area.accent, area.bg)}
            >
              <div className="flex items-center justify-between p-4 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      area.bg,
                      area.text
                    )}
                  >
                    <area.Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{area.label}</div>
                    <div className="text-xs text-muted-foreground">{area.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("font-bold tabular", area.text)}>
                    {formatBRL(total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {list.length} {list.length === 1 ? "venda" : "vendas"}
                  </div>
                </div>
              </div>

              <div className="bg-card p-3 space-y-2 max-h-[360px] overflow-y-auto">
                {list.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nada por aqui ainda. Aguardando recebimentos…
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {list.slice(0, 8).map((tx) => (
                      <LiveTxCard
                        key={tx.id}
                        tx={tx}
                        highlight={tx.id === highlightId}
                        compact
                      />
                    ))}
                  </AnimatePresence>
                )}
                {list.length > 8 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    + {list.length - 8} anteriores
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Ações no rodapé */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Histórico fica salvo neste navegador. Pra zerar e começar do zero, use o botão →
        </span>
        <button
          onClick={clearLiveFeed}
          className="flex items-center gap-1.5 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Limpar feed
        </button>
      </div>
    </div>
  );
}
