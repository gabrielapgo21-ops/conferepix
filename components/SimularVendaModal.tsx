"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import type {
  PaymentMethod,
  SaleStatus,
  ConnectedMachine,
  Transaction,
  TransactionStatus,
} from "@/lib/types";

interface Props {
  onClose: () => void;
  preselectedMachineId?: string;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "debito", label: "Débito" },
  { value: "credito_avista", label: "Crédito à vista" },
  { value: "credito_parcelado", label: "Crédito parcelado" },
];

const STATUS_OPTIONS: { value: SaleStatus; label: string }[] = [
  { value: "aprovada", label: "Aprovada" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelada", label: "Cancelada" },
];

function calcExpected(valor: number, taxaPct: number): number {
  return Math.round(valor * (1 - taxaPct / 100) * 100) / 100;
}

export function SimularVendaModal({ onClose, preselectedMachineId }: Props) {
  const machines = useStore((s) => s.machines);
  const addSale = useStore((s) => s.addSale);

  const [maquininhaId, setMaquininhaId] = useState(
    preselectedMachineId ?? machines[0]?.id ?? ""
  );
  const [valor, setValor] = useState(99.9);
  const [metodo, setMetodo] = useState<PaymentMethod>("credito_avista");
  const [parcelas, setParcelas] = useState(2);
  const [statusVenda, setStatusVenda] = useState<SaleStatus>("aprovada");
  const [dataHora, setDataHora] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    // Formato local pra <input type="datetime-local">
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [salvo, setSalvo] = useState(false);

  const maquininha: ConnectedMachine | undefined = machines.find(
    (m) => m.id === maquininhaId
  );

  // Taxa esperada pela maquininha selecionada (com fallback defensivo)
  const taxaEsperada = useMemo(() => {
    if (!maquininha) return 0;
    if (metodo === "debito") return maquininha.taxaDebito ?? 1.99;
    if (metodo === "credito_avista") return maquininha.taxaCreditoAvista ?? 3.19;
    if (metodo === "credito_parcelado") return maquininha.taxaCreditoParcelado ?? 4.49;
    return 0;
  }, [maquininha, metodo]);

  const valorEsperado = calcExpected(valor, taxaEsperada);

  const handleSalvar = () => {
    if (!maquininha) return;
    const data = new Date(dataHora).toISOString();
    let status: TransactionStatus = "aguardando_repasse";
    let valorRecebido = 0;
    if (statusVenda === "aprovada") {
      status = "aguardando_repasse";
      valorRecebido = 0;
    } else if (statusVenda === "pendente") {
      status = "falta_receber";
    } else if (statusVenda === "cancelada") {
      status = "cancelada";
    }

    const dias = metodo === "debito" ? maquininha.prazoDebito : maquininha.prazoCredito;
    const repasse = new Date();
    repasse.setDate(repasse.getDate() + dias);

    const sale: Transaction = {
      id: "venda-" + uid(),
      data,
      metodo,
      descricao: `${maquininha.apelido} — venda simulada`,
      valorVendido: valor,
      valorEsperado,
      valorRecebido,
      taxaEsperada,
      taxaCobrada: taxaEsperada,
      status,
      parcelas: metodo === "credito_parcelado" ? parcelas : undefined,
      diasParaReceber: dias,
      origem: "maquininha",
      maquininhaId: maquininha.id,
      dataRepassePrevisto: repasse.toISOString(),
    };
    addSale(sale);
    setSalvo(true);
    setTimeout(() => onClose(), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl max-w-xl w-full max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Simular venda da maquininha</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <Label>Maquininha</Label>
            <Select
              value={maquininhaId}
              onChange={(e) => setMaquininhaId(e.target.value)}
              className="mt-1.5"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.apelido} ({m.marca})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
                className="mt-1.5"
              >
                {METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {metodo === "credito_parcelado" && (
            <div>
              <Label>Número de parcelas</Label>
              <Input
                type="number"
                min={2}
                max={12}
                value={parcelas}
                onChange={(e) => setParcelas(parseInt(e.target.value) || 2)}
                className="mt-1.5"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select
                value={statusVenda}
                onChange={(e) => setStatusVenda(e.target.value as SaleStatus)}
                className="mt-1.5"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Data e hora</Label>
              <Input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {maquininha && (
            <div className="bg-secondary/40 rounded-lg p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa que vai ser cobrada</span>
                <span className="font-semibold tabular">
                  {taxaEsperada.toFixed(2).replace(".", ",")}%
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Valor líquido esperado</span>
                <span className="font-semibold tabular text-success">
                  R$ {valorEsperado.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Cai na conta</span>
                <span className="font-semibold">
                  {maquininha.contaDestino ?? "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border bg-secondary/30">
          {salvo ? (
            <div className="flex items-center gap-2 text-success text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Venda registrada! Aparece em Conferência, Dashboard e Relatório.
            </div>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar} disabled={!maquininhaId || valor <= 0}>
                <Zap className="h-4 w-4" />
                Registrar venda
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
