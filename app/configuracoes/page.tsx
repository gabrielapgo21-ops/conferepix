"use client";

import { useState } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Database,
  Smartphone,
  ListChecks,
  FileText,
  Plug,
  Package,
  Store,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { DEFAULT_MACHINES } from "@/lib/liveEngine";
import { DEFAULT_RATES, generateMockTransactions, MOCK_FILES } from "@/lib/mockData";

export default function ConfiguracoesPage() {
  const mounted = useHasMounted();
  const transactions = useStore((s) => s.transactions);
  const machines = useStore((s) => s.machines);
  const files = useStore((s) => s.files);
  const liveFeed = useStore((s) => s.liveFeed);

  const clearAllTransactions = useStore((s) => s.clearAllTransactions);
  const regenerateTransactions = useStore((s) => s.regenerateTransactions);
  const clearLiveFeed = useStore((s) => s.clearLiveFeed);
  const initLiveFeed = useStore((s) => s.initLiveFeed);
  const setRates = useStore((s) => s.setRates);
  const removeMachine = useStore((s) => s.removeMachine);
  const addMachine = useStore((s) => s.addMachine);
  const products = useStore((s) => s.products);
  const resetProducts = useStore((s) => s.resetProducts);
  const removeManyProducts = useStore((s) => s.removeManyProducts);
  const store = useStore((s) => s.store);
  const setStore = useStore((s) => s.setStore);

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  const showOk = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleClearTransactions = () => {
    if (
      confirm(
        `Apagar TODAS as ${transactions.length} transações da Conferência? Não dá pra desfazer.`
      )
    ) {
      clearAllTransactions();
      showOk("Conferência zerada.");
    }
  };

  const handleResetTransactions = () => {
    if (confirm("Restaurar transações pros valores de demonstração?")) {
      regenerateTransactions();
      showOk("Transações restauradas pros valores de demo.");
    }
  };

  const handleClearLiveFeed = () => {
    if (confirm("Apagar todas as transações do feed Ao Vivo?")) {
      clearLiveFeed();
      showOk("Feed Ao Vivo limpo.");
    }
  };

  const handleRestoreLiveFeed = () => {
    if (confirm("Restaurar feed Ao Vivo com transações de demonstração?")) {
      initLiveFeed();
      showOk("Feed restaurado.");
    }
  };

  const handleResetMachines = () => {
    if (
      confirm(
        `Apagar TODAS as ${machines.length} maquininhas e voltar pras 4 do exemplo (MP do caixa, Stone balcão, Ton reserva, PagBank entrega)?`
      )
    ) {
      machines.forEach((m) => removeMachine(m.id));
      DEFAULT_MACHINES.forEach((m) => addMachine(m));
      showOk("Maquininhas restauradas pro exemplo.");
    }
  };

  const handleResetRates = () => {
    if (confirm("Restaurar taxas pros valores padrão?")) {
      setRates(DEFAULT_RATES);
      showOk("Taxas restauradas.");
    }
  };

  const handleFullReset = () => {
    if (
      confirm(
        "⚠ Isso vai apagar TUDO: maquininhas, vendas, taxas, configuração do Mercado Pago, feed Ao Vivo e qualquer dado que você cadastrou. O app vai voltar pro estado inicial. Tem certeza?"
      )
    ) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("conferepix-store");
        // Também tenta limpar config do MP no servidor
        fetch("/api/mp/config", { method: "DELETE" }).catch(() => {});
        fetch("/api/live-feed", { method: "DELETE" }).catch(() => {});
        location.reload();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Apague, restaure ou zere qualquer parte do app.
        </p>
      </div>

      {feedback && (
        <Card className="p-3 bg-success/10 border-success/30">
          <div className="flex items-center gap-2 text-success text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {feedback}
          </div>
        </Card>
      )}

      {/* Dados da loja */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Dados da loja</CardTitle>
            <CardDescription>Aparece no relatório do contador e no recibo.</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Nome da loja</Label>
            <Input
              value={store.nomeLoja}
              onChange={(e) => setStore({ nomeLoja: e.target.value })}
              placeholder="Ex: Loja da Maria"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>
              CNPJ <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              value={store.cnpj ?? ""}
              onChange={(e) => setStore({ cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>
              Telefone <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              value={store.telefone ?? ""}
              onChange={(e) => setStore({ telefone: e.target.value })}
              placeholder="(11) 9 9999-9999"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Moeda</Label>
            <Input value="BRL — Real" disabled className="mt-1.5" />
          </div>
        </div>
      </Card>

      {/* Vendas / Conferência */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Vendas / Conferência</CardTitle>
            <CardDescription>
              {transactions.length} transações registradas hoje
            </CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleResetTransactions}>
            <RotateCcw className="h-4 w-4" />
            Restaurar exemplos
          </Button>
          <Button variant="destructive" onClick={handleClearTransactions}>
            <Trash2 className="h-4 w-4" />
            Apagar todas as transações
          </Button>
        </div>
      </Card>

      {/* Maquininhas */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Maquininhas</CardTitle>
            <CardDescription>{machines.length} cadastradas</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleResetMachines}>
            <RotateCcw className="h-4 w-4" />
            Restaurar 4 do exemplo
          </Button>
        </div>
      </Card>

      {/* Produtos */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Produtos cadastrados</CardTitle>
            <CardDescription>{products.length} produtos no sistema</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Restaurar os 12 produtos de demonstração?")) {
                resetProducts();
                showOk("Produtos restaurados pro exemplo.");
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar exemplos
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(`Apagar TODOS os ${products.length} produtos?`)) {
                removeManyProducts(products.map((p) => p.id));
                showOk("Todos os produtos apagados.");
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Apagar todos
          </Button>
        </div>
      </Card>

      {/* Ao Vivo */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Feed Ao Vivo</CardTitle>
            <CardDescription>{liveFeed.length} transações no feed</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleRestoreLiveFeed}>
            <RotateCcw className="h-4 w-4" />
            Restaurar feed de exemplo
          </Button>
          <Button variant="destructive" onClick={handleClearLiveFeed}>
            <Trash2 className="h-4 w-4" />
            Limpar feed
          </Button>
        </div>
      </Card>

      {/* Taxas */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-secondary text-foreground flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Taxas configuradas</CardTitle>
            <CardDescription>Taxas globais usadas na conferência</CardDescription>
          </div>
        </div>
        <Button variant="outline" onClick={handleResetRates}>
          <RotateCcw className="h-4 w-4" />
          Restaurar taxas padrão
        </Button>
      </Card>

      {/* Integração MP */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Integração Mercado Pago</CardTitle>
            <CardDescription>
              Pra desconectar, vai em <strong>Integração MP</strong> na sidebar.
            </CardDescription>
          </div>
        </div>
      </Card>

      {/* RESET TOTAL */}
      <Card className="p-5 bg-destructive/5 border-destructive/30">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base text-destructive">Resetar app inteiro</CardTitle>
            <CardDescription>
              Apaga TUDO: maquininhas, vendas, taxas, MP, feed. Volta pro estado inicial.
            </CardDescription>
          </div>
        </div>
        <Button variant="destructive" onClick={handleFullReset} size="lg" className="w-full">
          <Trash2 className="h-4 w-4" />
          Resetar app inteiro
        </Button>
      </Card>
    </div>
  );
}
