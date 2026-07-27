"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Download, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBRL, formatDateBR, cn } from "@/lib/utils";
import {
  METHOD_LABELS,
  STATUS_LABELS,
  SOURCE_LABELS,
  type TransactionStatus,
  type PaymentMethod,
  type TransactionSource,
} from "@/lib/types";

export default function ConferenciaPage() {
  const mounted = useHasMounted();
  const transactions = useStore((s) => s.transactions);
  const machines = useStore((s) => s.machines);
  const removeTransaction = useStore((s) => s.removeTransaction);
  const removeManyTransactions = useStore((s) => s.removeManyTransactions);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<TransactionSource | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Apagar essa transação? Não dá pra desfazer.")) {
      removeTransaction(id);
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    if (confirm(`Apagar ${selected.size} transações selecionadas?`)) {
      removeManyTransactions(Array.from(selected));
      setSelected(new Set());
    }
  };

  function describeOrigem(t: { origem: TransactionSource; maquininhaId?: string }): string {
    if (t.origem === "maquininha" && t.maquininhaId) {
      const m = machines.find((x) => x.id === t.maquininhaId);
      return m ? `Maquininha ${m.marca}` : "Maquininha";
    }
    return SOURCE_LABELS[t.origem];
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (methodFilter !== "all" && t.metodo !== methodFilter) return false;
      if (sourceFilter !== "all" && t.origem !== sourceFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !t.descricao.toLowerCase().includes(s) &&
          !t.valorVendido.toFixed(2).includes(s) &&
          !formatDateBR(t.data).includes(s)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, statusFilter, methodFilter, sourceFilter, search]);

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Conferência</h1>
          <p className="text-muted-foreground mt-1">
            Todas as transações comparadas com o que deveria ter sido recebido.
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" />
              Apagar {selected.size}
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | "all")}
          >
            <option value="all">Todos os status</option>
            {(Object.keys(STATUS_LABELS) as TransactionStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | "all")}
          >
            <option value="all">Todas as formas</option>
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
          <Select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as TransactionSource | "all")
            }
          >
            <option value="all">Todas as origens</option>
            {(Object.keys(SOURCE_LABELS) as TransactionSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          {filtered.length} de {transactions.length} transações
          {(statusFilter !== "all" ||
            methodFilter !== "all" ||
            sourceFilter !== "all" ||
            search) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setMethodFilter("all");
                setSourceFilter("all");
                setSearch("");
              }}
              className="ml-auto text-primary hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((t) => selected.has(t.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(filtered.map((t) => t.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left font-medium px-4 py-3">Data</th>
                <th className="text-left font-medium px-4 py-3">Descrição</th>
                <th className="text-left font-medium px-4 py-3">Origem</th>
                <th className="text-left font-medium px-4 py-3">Forma</th>
                <th className="text-right font-medium px-4 py-3">Vendido</th>
                <th className="text-right font-medium px-4 py-3">Esperado</th>
                <th className="text-right font-medium px-4 py-3">Recebido</th>
                <th className="text-right font-medium px-4 py-3">Taxa esp.</th>
                <th className="text-right font-medium px-4 py-3">Taxa cob.</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-muted-foreground">
                    Nenhuma transação encontrada com esses filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isProblema = t.status !== "ok";
                  const taxaErrada = Math.abs(t.taxaCobrada - t.taxaEsperada) > 0.01;
                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "hover:bg-secondary/40 transition-colors group",
                        isProblema && "bg-destructive/5",
                        selected.has(t.id) && "bg-primary/5"
                      )}
                    >
                      <td className="px-3 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleSelected(t.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-foreground tabular">
                        {formatDateBR(t.data)}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {t.descricao}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                          {describeOrigem(t)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                          {METHOD_LABELS[t.metodo]}
                          {t.parcelas ? ` ${t.parcelas}x` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular font-medium">
                        {formatBRL(t.valorVendido)}
                      </td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">
                        {formatBRL(t.valorEsperado)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular font-medium",
                          t.valorRecebido === 0
                            ? "text-warning"
                            : t.valorRecebido !== t.valorEsperado
                              ? "text-destructive"
                              : "text-success"
                        )}
                      >
                        {t.valorRecebido === 0 ? "—" : formatBRL(t.valorRecebido)}
                      </td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">
                        {t.taxaEsperada.toFixed(2).replace(".", ",")}%
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular",
                          taxaErrada ? "text-destructive font-semibold" : "text-muted-foreground"
                        )}
                      >
                        {t.taxaCobrada.toFixed(2).replace(".", ",")}%
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-3 w-12">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="opacity-40 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all h-7 w-7 rounded-md flex items-center justify-center"
                          title="Apagar transação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
