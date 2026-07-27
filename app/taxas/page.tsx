"use client";

import { useState, useEffect } from "react";
import { Save, CreditCard, CheckCircle2, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { Maquininha, RateConfig } from "@/lib/types";

const MAQUININHAS: Maquininha[] = [
  "Ton",
  "Stone",
  "Mercado Pago",
  "Cielo",
  "Rede",
  "PagSeguro",
  "Outro",
];

export default function TaxasPage() {
  const mounted = useHasMounted();
  const rates = useStore((s) => s.rates);
  const setRates = useStore((s) => s.setRates);
  const [form, setForm] = useState<RateConfig>(rates);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mounted) setForm(rates);
  }, [mounted, rates]);

  const update = (patch: Partial<RateConfig>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = () => {
    setRates(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Taxas contratadas
        </h1>
        <p className="text-muted-foreground mt-1">
          Informe as taxas que você negociou. A gente compara com o que foi cobrado de verdade.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Sua maquininha
              </CardTitle>
              <CardDescription>
                Selecione qual maquininha você usa pra receber por cartão
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <Select
                value={form.maquininha}
                onChange={(e) =>
                  update({ maquininha: e.target.value as Maquininha })
                }
              >
                {MAQUININHAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxas por forma de pagamento (%)</CardTitle>
              <CardDescription>
                Informe a taxa exata negociada com a maquininha
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Pix</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.taxaPix}
                  onChange={(e) => update({ taxaPix: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Débito</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.taxaDebito}
                  onChange={(e) => update({ taxaDebito: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Crédito à vista</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.taxaCreditoAvista}
                  onChange={(e) =>
                    update({ taxaCreditoAvista: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Crédito parcelado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.taxaCreditoParcelado}
                  onChange={(e) =>
                    update({ taxaCreditoParcelado: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prazo de recebimento (dias)</CardTitle>
              <CardDescription>
                Quantos dias úteis até o dinheiro cair na conta
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Débito</Label>
                <Input
                  type="number"
                  value={form.prazoDebito}
                  onChange={(e) => update({ prazoDebito: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Típico: 1 dia útil
                </p>
              </div>
              <div>
                <Label>Crédito</Label>
                <Input
                  type="number"
                  value={form.prazoCredito}
                  onChange={(e) => update({ prazoCredito: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Típico: 30 dias
                </p>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} size="lg">
              <Save className="h-4 w-4" />
              Salvar configuração
            </Button>
            {saved && (
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Salvo! Conferência foi recalculada.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar dicas */}
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/30">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Por que isso importa?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quando você informa as taxas certas, o ConferePix compara com o que
                foi cobrado em cada transação. Se a maquininha cobrou mais que o
                combinado, a gente avisa.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="font-semibold text-sm mb-3">Taxas médias do mercado</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pix</span>
                  <span className="tabular">0,99% a 1,49%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Débito</span>
                  <span className="tabular">1,29% a 1,99%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito à vista</span>
                  <span className="tabular">2,49% a 3,49%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito parcelado</span>
                  <span className="tabular">3,99% a 5,49%</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
                * Referências de mercado em 2026. Sua taxa pode variar de acordo
                com seu volume e negociação.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
