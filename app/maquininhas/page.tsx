"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Zap,
  Trash2,
  AlertCircle,
  Info,
  Smartphone,
  Wallet,
  TrendingUp,
  Clock,
  Edit3,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CadastroMaquininhaModal } from "@/components/CadastroMaquininhaModal";
import { SimularVendaModal } from "@/components/SimularVendaModal";
import { formatBRL, formatDateBR, cn } from "@/lib/utils";
import { MACHINE_BRANDS } from "@/lib/liveEngine";
import type { ConnectedMachine } from "@/lib/types";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora há pouco";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return new Date(iso).toLocaleString("pt-BR");
}

export default function MaquininhasPage() {
  const mounted = useHasMounted();
  const machines = useStore((s) => s.machines);
  const transactions = useStore((s) => s.transactions);
  const addMachine = useStore((s) => s.addMachine);
  const updateMachine = useStore((s) => s.updateMachine);
  const removeMachine = useStore((s) => s.removeMachine);

  const [showCadastro, setShowCadastro] = useState(false);
  const [showSimular, setShowSimular] = useState(false);
  const [editing, setEditing] = useState<ConnectedMachine | null>(null);
  const [simularFor, setSimularFor] = useState<string | undefined>(undefined);

  // Calcula métricas reais por maquininha a partir das transações
  const metricsByMachine = useMemo(() => {
    const out: Record<
      string,
      {
        vendasHoje: number;
        valorBruto: number;
        taxaEstimada: number;
        valorLiquido: number;
        proximoRepasse: string | null;
        divergencias: number;
      }
    > = {};
    const today = new Date().toDateString();

    machines.forEach((m) => {
      const minhas = transactions.filter((t) => t.maquininhaId === m.id);
      const hoje = minhas.filter((t) => new Date(t.data).toDateString() === today);
      const validas = minhas.filter((t) => t.status !== "cancelada");

      const valorBruto = validas.reduce((s, t) => s + t.valorVendido, 0);
      const valorLiquido = validas.reduce((s, t) => s + t.valorEsperado, 0);
      const taxaEstimada =
        valorBruto > 0 ? ((valorBruto - valorLiquido) / valorBruto) * 100 : 0;

      const proximoRepasse = minhas
        .filter((t) => t.dataRepassePrevisto)
        .map((t) => t.dataRepassePrevisto!)
        .sort()[0];

      const divergencias = minhas.filter(
        (t) =>
          t.status === "taxa_divergente" ||
          t.status === "valor_divergente" ||
          t.status === "falta_receber"
      ).length;

      out[m.id] = {
        vendasHoje: hoje.length,
        valorBruto,
        taxaEstimada,
        valorLiquido,
        proximoRepasse: proximoRepasse ?? null,
        divergencias,
      };
    });
    return out;
  }, [machines, transactions]);

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Maquininhas</h1>
          <p className="text-muted-foreground mt-1">
            Cadastre suas maquininhas e acompanhe vendas, taxas e repasses de cada uma.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowSimular(true)} variant="outline">
            <Zap className="h-4 w-4" />
            Simular venda
          </Button>
          <Button onClick={() => setShowCadastro(true)}>
            <Plus className="h-4 w-4" />
            Cadastrar maquininha
          </Button>
        </div>
      </div>

      {/* Regra de produto */}
      <Card className="p-4 bg-primary/5 border-primary/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong>Importante:</strong> o ConferePix não é uma maquininha e não recebe
            dinheiro diretamente. Ele <strong>registra, acompanha e confere</strong> as
            vendas que entram nas suas maquininhas, mostrando se o valor líquido caiu
            certinho na sua conta.
          </div>
        </div>
      </Card>

      {/* Grid de máquinas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence>
          {machines.map((m) => {
            const brand = MACHINE_BRANDS.find((b) => b.marca === m.marca);
            const met = metricsByMachine[m.id];
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="overflow-hidden">
                  {/* Header colorido por marca */}
                  <div
                    className="px-5 py-4 flex items-start justify-between gap-3"
                    style={{
                      background: `linear-gradient(135deg, ${brand?.cor ?? "#6E7C8C"}, ${brand?.cor ?? "#6E7C8C"}DD)`,
                    }}
                  >
                    <div className="flex items-center gap-3 text-white">
                      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                        {m.marca.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-base leading-tight">
                          {m.apelido}
                        </div>
                        <div className="text-xs text-white/85 mt-0.5">
                          {m.marca}
                          {m.numeroSerie && ` · ${m.numeroSerie}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditing(m);
                          setShowCadastro(true);
                        }}
                        className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                        title="Editar"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeMachine(m.id)}
                        className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="px-5 pt-4 flex items-center gap-2 flex-wrap">
                    {m.integrationStatus === "conectada" && (
                      <Badge variant="success" className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success-foreground animate-pulse" />
                        Conectada
                      </Badge>
                    )}
                    {m.integrationStatus === "simulada" && (
                      <Badge variant="warning" className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3" />
                        Simulada
                      </Badge>
                    )}
                    {m.integrationStatus === "manual" && (
                      <Badge variant="outline" className="flex items-center gap-1.5">
                        Manual
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      Atualizada {relativeTime(m.ultimaSincronizacao)}
                    </span>
                  </div>

                  {/* Métricas */}
                  <div className="px-5 py-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Smartphone className="h-3 w-3" />
                        Vendas hoje
                      </div>
                      <div className="font-bold text-xl tabular mt-0.5">
                        {met?.vendasHoje ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        Bruto vendido
                      </div>
                      <div className="font-bold text-xl tabular mt-0.5">
                        {formatBRL(met?.valorBruto ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Taxa estimada
                      </div>
                      <div className="font-bold text-xl tabular text-warning mt-0.5">
                        {(met?.taxaEstimada ?? 0).toFixed(2).replace(".", ",")}%
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wallet className="h-3 w-3" />
                        Líquido esperado
                      </div>
                      <div className="font-bold text-xl tabular text-success mt-0.5">
                        {formatBRL(met?.valorLiquido ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Footer com próximo repasse e divergências */}
                  <div className="px-5 py-3 bg-secondary/30 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Próximo repasse:{" "}
                      <span className="font-semibold text-foreground">
                        {met?.proximoRepasse
                          ? formatDateBR(met.proximoRepasse)
                          : "—"}
                      </span>
                    </div>
                    {met && met.divergencias > 0 && (
                      <div className="flex items-center gap-1 text-destructive font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {met.divergencias} divergência
                        {met.divergencias > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  {/* Conta destino */}
                  {m.contaDestino && (
                    <div className="px-5 py-2 text-[11px] text-muted-foreground border-t border-border">
                      💳 Cai em: <span className="text-foreground">{m.contaDestino}</span>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="px-5 py-3 border-t border-border flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSimularFor(m.id);
                        setShowSimular(true);
                      }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Simular venda
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateMachine(m.id, {
                          status:
                            m.status === "conectada" ? "desconectada" : "conectada",
                          ultimaSincronizacao: new Date().toISOString(),
                        })
                      }
                    >
                      {m.status === "conectada" ? "Pausar" : "Ativar"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Card vazio */}
        <button
          onClick={() => {
            setEditing(null);
            setShowCadastro(true);
          }}
          className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground min-h-[240px]"
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Plus className="h-6 w-6" />
          </div>
          <span className="font-medium text-sm">Cadastrar mais uma maquininha</span>
          <span className="text-xs">Qualquer marca brasileira</span>
        </button>
      </div>

      {/* Modais */}
      {showCadastro && (
        <CadastroMaquininhaModal
          initial={editing ?? undefined}
          onClose={() => {
            setShowCadastro(false);
            setEditing(null);
          }}
          onSave={(m) => {
            if (editing) {
              updateMachine(editing.id, m);
            } else {
              addMachine(m);
            }
            setShowCadastro(false);
            setEditing(null);
          }}
        />
      )}
      {showSimular && (
        <SimularVendaModal
          preselectedMachineId={simularFor}
          onClose={() => {
            setShowSimular(false);
            setSimularFor(undefined);
          }}
        />
      )}
    </div>
  );
}
