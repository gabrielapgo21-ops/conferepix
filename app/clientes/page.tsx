"use client";

/**
 * Tela de clientes — lista, busca, cadastro, envio de mensagens, histórico.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  Cake,
  TrendingUp,
  ArrowLeft,
  Sparkles,
  Phone,
  Calendar,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClienteModal } from "@/components/ClienteModal";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import { DicaContextual } from "@/components/DicaContextual";
import { formatBRL, cn, formatDateBR } from "@/lib/utils";
import {
  resumirTodos,
  aniversariantesDoMes,
  aniversariantesDoDia,
  formatarTelefone,
  type Customer,
  type ClienteResumo,
} from "@/lib/customers";

export default function ClientesPage() {
  const mounted = useHasMounted();
  const customers = useStore((s) => s.customers);
  const transactions = useStore((s) => s.transactions);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const removeCustomer = useStore((s) => s.removeCustomer);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [whatsAppFor, setWhatsAppFor] = useState<Customer | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "sumido" | "novo" | "aniversariantes">(
    "todos"
  );

  const resumos = useMemo(
    () => resumirTodos(customers, transactions),
    [customers, transactions]
  );

  const aniversariantesMes = useMemo(
    () => aniversariantesDoMes(customers),
    [customers]
  );

  const hojeAniv = useMemo(() => aniversariantesDoDia(customers), [customers]);

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  const totais = {
    todos: resumos.length,
    ativo: resumos.filter((r) => r.status === "ativo").length,
    sumido: resumos.filter((r) => r.status === "sumido").length,
    novo: resumos.filter((r) => r.status === "novo").length,
    aniversariantes: aniversariantesMes.length,
  };

  const filtrados = resumos.filter((r) => {
    if (filtro === "aniversariantes") {
      return aniversariantesMes.some((a) => a.cliente.id === r.cliente.id);
    }
    if (filtro !== "todos" && r.status !== filtro) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        r.cliente.nome.toLowerCase().includes(q) ||
        (r.cliente.telefone ?? "").includes(busca) ||
        (r.cliente.email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <DicaContextual
        id="dica-clientes"
        emoji="💚"
        titulo="Fideliza com mensagem certa"
        texto="Pra cada cliente eu sugiro a mensagem ideal: boas-vindas pra novo, cupom pra sumida, parabéns pra aniversariante. Clica no botão verde 'WhatsApp'!"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            <Link href="/" className="hover:text-foreground">
              <ArrowLeft className="inline h-3 w-3 mr-1" />
              Voltar
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Lembrar de cada cliente. Manter perto. Fazer crescer.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Cadastrar cliente
        </Button>
      </div>

      {/* Aniversariante de HOJE — destaque */}
      {hojeAniv.length > 0 && (
        <Card className="border-pink-300 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-2xl">
                🎂
              </div>
              <div>
                <div className="font-bold text-pink-900 dark:text-pink-200">
                  {hojeAniv.length === 1
                    ? `${hojeAniv[0].nome} faz aniversário HOJE!`
                    : `${hojeAniv.length} aniversariantes hoje!`}
                </div>
                <div className="text-xs text-muted-foreground">
                  Manda parabéns 🎉
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hojeAniv.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={() => setWhatsAppFor(c)}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                  {c.nome}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Aniversariantes do mês */}
      {aniversariantesMes.length > 0 && hojeAniv.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-500" />
              Aniversariantes deste mês ({aniversariantesMes.length})
            </CardTitle>
            <CardDescription>
              Que tal mandar um mimo? 🎁
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 -mt-2 flex flex-wrap gap-2">
            {aniversariantesMes.map((a) => (
              <button
                key={a.cliente.id}
                type="button"
                onClick={() => setWhatsAppFor(a.cliente)}
                className="flex items-center gap-2 bg-secondary hover:bg-secondary/70 rounded-full px-3 py-1.5 text-sm transition"
              >
                <span className="font-medium">{a.cliente.nome}</span>
                <span className="text-xs text-muted-foreground tabular">
                  dia {String(a.dia).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Busca + filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou email…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["todos", "Todos", totais.todos],
              ["ativo", "Ativos", totais.ativo],
              ["sumido", "Sumidos", totais.sumido],
              ["novo", "Novos", totais.novo],
              ["aniversariantes", "Aniversariantes", totais.aniversariantes],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltro(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition",
                filtro === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/70"
              )}
            >
              {label}
              <span className="ml-1.5 opacity-70 tabular">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <div className="font-semibold mb-1">
            {customers.length === 0
              ? "Ainda não tem clientes cadastrados"
              : "Nenhum cliente nesse filtro"}
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            {customers.length === 0
              ? "Cadastra os clientes pra ter histórico, aniversários e cupons."
              : "Tenta outro filtro ou cadastra um novo cliente."}
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Cadastrar primeiro cliente
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map((r) => (
            <ClienteCard
              key={r.cliente.id}
              resumo={r}
              onEdit={() => {
                setEditing(r.cliente);
                setShowModal(true);
              }}
              onWhatsApp={() => setWhatsAppFor(r.cliente)}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {showModal && (
        <ClienteModal
          initial={editing ?? undefined}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={(c) => {
            if (editing) {
              updateCustomer(editing.id, c);
            } else {
              addCustomer(c);
            }
            setShowModal(false);
            setEditing(null);
          }}
          onDelete={
            editing
              ? () => {
                  removeCustomer(editing.id);
                  setShowModal(false);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
      {whatsAppFor && (
        <WhatsAppModal
          cliente={whatsAppFor}
          onClose={() => setWhatsAppFor(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Card individual de cliente
// ============================================================================

function ClienteCard({
  resumo,
  onEdit,
  onWhatsApp,
}: {
  resumo: ClienteResumo;
  onEdit: () => void;
  onWhatsApp: () => void;
}) {
  const { cliente } = resumo;
  const STATUS_COLOR: Record<ClienteResumo["status"], string> = {
    ativo: "bg-success/15 text-success border-success/30",
    sumido: "bg-warning/15 text-warning border-warning/30",
    novo: "bg-primary/15 text-primary border-primary/30",
    sem_compras: "bg-secondary text-muted-foreground border-border",
  };
  const STATUS_LABEL: Record<ClienteResumo["status"], string> = {
    ativo: "Ativo",
    sumido: "Sumido",
    novo: "Novo",
    sem_compras: "Sem compras",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
          {cliente.nome.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="font-semibold truncate text-left hover:text-primary transition"
            >
              {cliente.nome}
            </button>
            <span
              className={cn(
                "text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border flex-shrink-0",
                STATUS_COLOR[resumo.status]
              )}
            >
              {STATUS_LABEL[resumo.status]}
            </span>
          </div>

          {cliente.telefone && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatarTelefone(cliente.telefone)}
            </div>
          )}

          {cliente.aniversario && (
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Cake className="h-3 w-3" />
              {(() => {
                const partes = cliente.aniversario.split("-");
                if (partes.length === 3)
                  return `${partes[2]}/${partes[1]}`;
                return cliente.aniversario;
              })()}
            </div>
          )}

          {/* Stats */}
          {resumo.qtdCompras > 0 && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold tabular">
                  {formatBRL(resumo.totalCompras)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Compras: </span>
                <span className="font-bold tabular">{resumo.qtdCompras}</span>
              </div>
            </div>
          )}
          {resumo.ultimaCompra && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Última: {formatDateBR(resumo.ultimaCompra)}
              {resumo.diasDesdeUltima !== null &&
                resumo.diasDesdeUltima > 0 &&
                ` (há ${resumo.diasDesdeUltima} dias)`}
            </div>
          )}

          {/* Ações */}
          <div className="mt-3 flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={onWhatsApp}
              className="text-xs flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="text-xs"
            >
              Editar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
