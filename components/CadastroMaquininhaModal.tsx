"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plug, Info, Lock, KeyRound, Link2, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { uid, cn } from "@/lib/utils";
import { MACHINE_BRANDS } from "@/lib/liveEngine";
import type {
  ConnectedMachine,
  Maquininha,
  IntegrationStatus,
} from "@/lib/types";

interface Props {
  onClose: () => void;
  onSave: (m: ConnectedMachine) => void;
  initial?: ConnectedMachine;
}

const INTEGRATION_LABEL: Record<IntegrationStatus, string> = {
  manual: "Manual — você lança as vendas",
  simulada: "Simulada — dados de demonstração",
  conectada: "Conectada — recebe automaticamente",
};

export function CadastroMaquininhaModal({ onClose, onSave, initial }: Props) {
  const [apelido, setApelido] = useState(initial?.apelido ?? "");
  const [marca, setMarca] = useState<Maquininha>(initial?.marca ?? "Mercado Pago");
  const [serie, setSerie] = useState(initial?.numeroSerie ?? "");
  const [contaDestino, setContaDestino] = useState(initial?.contaDestino ?? "");
  const [taxaDebito, setTaxaDebito] = useState(initial?.taxaDebito ?? 1.99);
  const [taxaCreditoAvista, setTaxaCreditoAvista] = useState(
    initial?.taxaCreditoAvista ?? 3.19
  );
  const [taxaCreditoParcelado, setTaxaCreditoParcelado] = useState(
    initial?.taxaCreditoParcelado ?? 4.49
  );
  const [prazoDebito, setPrazoDebito] = useState(initial?.prazoDebito ?? 1);
  const [prazoCredito, setPrazoCredito] = useState(initial?.prazoCredito ?? 30);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>(
    initial?.integrationStatus ?? "simulada"
  );

  // Campos de integração futura
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [webhookUrl, setWebhookUrl] = useState(initial?.webhookUrl ?? "");
  const [apiToken, setApiToken] = useState(initial?.apiToken ?? "");
  const [testando, setTestando] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "err" | null>(null);

  const handleSalvar = () => {
    if (!apelido) return;
    const m: ConnectedMachine = {
      id: initial?.id ?? "mac-" + uid(),
      apelido,
      marca,
      numeroSerie: serie || undefined,
      contaDestino: contaDestino || undefined,
      taxaPix: 0.99,
      taxaDebito,
      taxaCreditoAvista,
      taxaCreditoParcelado,
      prazoDebito,
      prazoCredito,
      status: integrationStatus === "conectada" ? "conectada" : "desconectada",
      integrationStatus,
      apiKey: apiKey || undefined,
      webhookUrl: webhookUrl || undefined,
      apiToken: apiToken || undefined,
      ultimaSincronizacao: initial?.ultimaSincronizacao ?? new Date().toISOString(),
      totalHoje: initial?.totalHoje ?? 0,
      transacoesHoje: initial?.transacoesHoje ?? 0,
    };
    onSave(m);
  };

  const handleTestar = () => {
    setTestando(true);
    setTestResult(null);
    setTimeout(() => {
      setTestResult(apiKey && apiToken ? "ok" : "err");
      setTestando(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border flex items-center justify-between p-5">
          <div>
            <h2 className="text-lg font-semibold">
              {initial ? "Editar maquininha" : "Cadastrar nova maquininha"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              O app não recebe o dinheiro — ele registra, acompanha e confere o que cair na sua conta.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Dados básicos */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Dados da maquininha
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Apelido</Label>
                <Input
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Ex: Mercado Pago do caixa"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select
                  value={marca}
                  onChange={(e) => setMarca(e.target.value as Maquininha)}
                  className="mt-1.5"
                >
                  {MACHINE_BRANDS.map((b) => (
                    <option key={b.marca} value={b.marca}>
                      {b.marca}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>
                  Número de série{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="MP-44218-AB"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Conta onde o dinheiro cai</Label>
                <Input
                  value={contaDestino}
                  onChange={(e) => setContaDestino(e.target.value)}
                  placeholder="Ex: Itaú Ag 1234 CC 56789-0"
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* Taxas */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Taxas contratadas (%)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Débito</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxaDebito}
                  onChange={(e) => setTaxaDebito(parseFloat(e.target.value) || 0)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Crédito à vista</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxaCreditoAvista}
                  onChange={(e) => setTaxaCreditoAvista(parseFloat(e.target.value) || 0)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Crédito parcelado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxaCreditoParcelado}
                  onChange={(e) =>
                    setTaxaCreditoParcelado(parseFloat(e.target.value) || 0)
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* Prazos */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Prazo de recebimento (dias úteis)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Débito</Label>
                <Input
                  type="number"
                  value={prazoDebito}
                  onChange={(e) => setPrazoDebito(parseInt(e.target.value) || 0)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Crédito</Label>
                <Input
                  type="number"
                  value={prazoCredito}
                  onChange={(e) => setPrazoCredito(parseInt(e.target.value) || 0)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Status da integração
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(["manual", "simulada", "conectada"] as IntegrationStatus[]).map(
                (s) => {
                  const active = integrationStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setIntegrationStatus(s)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
                        {s}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {INTEGRATION_LABEL[s]}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* Integração futura por API */}
          <section className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Plug className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Integração futura por API</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Quando a integração estiver ativa, as vendas aprovadas na maquininha
              aparecerão automaticamente aqui para conferência. Por enquanto, esses campos
              ficam guardados pra quando a parceria com a adquirente fechar.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3" />
                  Chave de API
                </Label>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole aqui quando tiver"
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Link2 className="h-3 w-3" />
                  Webhook URL
                </Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://app.exemplo.com.br/api/webhooks/..."
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  Token de acesso
                </Label>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Token secreto da maquininha"
                  className="mt-1.5 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestar}
                  disabled={testando}
                >
                  <Zap className="h-3.5 w-3.5" />
                  {testando ? "Testando..." : "Testar conexão"}
                </Button>
                {testResult === "ok" && (
                  <Badge variant="success" className="text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Resposta simulada OK
                  </Badge>
                )}
                {testResult === "err" && (
                  <Badge variant="destructive" className="text-[10px]">
                    Preencha chave e token pra testar
                  </Badge>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 p-5 border-t border-border bg-secondary/30">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={!apelido}>
            {initial ? "Salvar alterações" : "Cadastrar maquininha"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
