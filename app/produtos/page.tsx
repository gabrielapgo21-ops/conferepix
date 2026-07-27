"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Filter,
  AlertTriangle,
  TrendingUp,
  Package,
  Sparkles,
  CheckCircle2,
  Tag,
  Camera,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProdutoModal } from "@/components/ProdutoModal";
import { ProdutoCard } from "@/components/ProdutoCard";
import { SmartScanner } from "@/components/SmartScanner";
import { ProdutoFoto } from "@/components/ProdutoFoto";
import { formatBRL, formatRelativeDate, cn } from "@/lib/utils";
import {
  ESTOQUE_LABELS,
  TIPO_LABELS,
  PRODUCT_CATEGORIES,
  CATEGORY_STYLE,
  computeStatusCadastro,
  getMissingFields,
  type Product,
  type CadastroTipo,
  type EstoqueStatus,
  type ProductCategory,
} from "@/lib/products";

type Filtro =
  | "todos"
  | "confirmado"
  | "rapido"
  | "temporario"
  | "sem_codigo"
  | "incompletos"
  | "acabando"
  | "acabou";

const FILTROS: { v: Filtro; label: string }[] = [
  { v: "todos", label: "Todos" },
  { v: "confirmado", label: "Confirmados" },
  { v: "rapido", label: "Rápidos" },
  { v: "temporario", label: "Temporários" },
  { v: "sem_codigo", label: "Sem código" },
  { v: "incompletos", label: "Incompletos" },
  { v: "acabando", label: "Está acabando" },
  { v: "acabou", label: "Acabou" },
];

export default function ProdutosPage() {
  const mounted = useHasMounted();
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const updateManyProducts = useStore((s) => s.updateManyProducts);
  const removeProduct = useStore((s) => s.removeProduct);
  const removeManyProducts = useStore((s) => s.removeManyProducts);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filtro>("todos");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | null>(null);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ===== Resumo =====
  const stats = useMemo(() => {
    const completos = products.filter((p) => computeStatusCadastro(p) === "completo").length;
    const incompletos = products.length - completos;
    const temporarios = products.filter((p) => p.tipoCadastro === "temporario").length;
    const semCodigo = products.filter((p) => p.tipoCadastro === "sem_codigo").length;
    const acabando = products.filter((p) => p.statusEstoque === "acabando").length;
    return {
      total: products.length,
      completos,
      incompletos,
      temporarios,
      semCodigo,
      acabando,
    };
  }, [products]);

  // ===== Filtro =====
  const filtered = useMemo(() => {
    return products.filter((p) => {
      // filtro de categoria
      if (categoryFilter && p.categoria !== categoryFilter) return false;
      // filtro de tipo/status
      if (filter === "confirmado" && p.tipoCadastro !== "confirmado") return false;
      if (filter === "rapido" && p.tipoCadastro !== "rapido") return false;
      if (filter === "temporario" && p.tipoCadastro !== "temporario") return false;
      if (filter === "sem_codigo" && p.tipoCadastro !== "sem_codigo") return false;
      if (filter === "incompletos" && computeStatusCadastro(p) !== "incompleto") return false;
      if (filter === "acabando" && p.statusEstoque !== "acabando") return false;
      if (filter === "acabou" && p.statusEstoque !== "acabou") return false;
      // busca
      if (search) {
        const q = search.toLowerCase();
        const match =
          p.nome.toLowerCase().includes(q) ||
          (p.codigoBarras ?? "").includes(q) ||
          (p.categoria ?? "").toLowerCase().includes(q) ||
          p.preco.toFixed(2).includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [products, filter, categoryFilter, search]);

  // Contagem por categoria pra mostrar nos chips
  const countByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    products.forEach((p) => {
      if (p.categoria) m[p.categoria] = (m[p.categoria] ?? 0) + 1;
    });
    return m;
  }, [products]);

  // ===== Para revisar =====
  const paraRevisar = useMemo(
    () =>
      products
        .filter((p) => computeStatusCadastro(p) === "incompleto")
        .slice(0, 6),
    [products]
  );

  // ===== Mais vendidos =====
  const maisVendidos = useMemo(
    () =>
      [...products]
        .filter((p) => p.vendidoNoMes && p.vendidoNoMes > 0)
        .sort((a, b) => (b.vendidoNoMes ?? 0) - (a.vendidoNoMes ?? 0))
        .slice(0, 5),
    [products]
  );

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  // ===== Helpers =====
  const toggleSelected = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSavePatch = (id: string, patch: Partial<Product>) =>
    updateProduct(id, patch);

  const handleDelete = (id: string) => {
    if (confirm("Apagar esse produto?")) removeProduct(id);
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (confirm(`Apagar ${selected.size} produtos selecionados?`)) {
      removeManyProducts(Array.from(selected));
      setSelected(new Set());
    }
  };

  const handleBulkUpdate = (patch: Partial<Product>) => {
    updateManyProducts(Array.from(selected), patch);
    setSelected(new Set());
  };

  const handleSave = (p: Product) => {
    if (editing) updateProduct(editing.id, p);
    else addProduct(p);
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Produtos cadastrados
          </h1>
          <p className="text-muted-foreground mt-1">
            Revise, complete e organize todos os produtos que já entraram no sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowScanner(true)} variant="success">
            <Camera className="h-4 w-4" />
            Bipar produto
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Cadastrar
          </Button>
        </div>
      </div>

      {/* Categorias coloridas como pílulas (filtro visual) */}
      {Object.keys(countByCategory).length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          <button
            onClick={() => setCategoryFilter(null)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border whitespace-nowrap flex-shrink-0 transition-all",
              !categoryFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/40"
            )}
          >
            Todas
            <span className="text-[10px] opacity-75">({products.length})</span>
          </button>
          {PRODUCT_CATEGORIES.map((c) => {
            const style = CATEGORY_STYLE[c];
            const count = countByCategory[c] ?? 0;
            if (count === 0) return null;
            const active = categoryFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(active ? null : c)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border whitespace-nowrap flex-shrink-0 transition-all",
                  active && "ring-2 ring-offset-2 ring-offset-background"
                )}
                style={{
                  background: active ? style.cor : style.bg,
                  color: active ? "white" : style.cor,
                  borderColor: style.cor,
                }}
              >
                <span className="text-base leading-none">{style.icone}</span>
                {c}
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatTile label="Total" value={stats.total} icon={Package} tone="default" />
        <StatTile
          label="Completos"
          value={stats.completos}
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="Incompletos"
          value={stats.incompletos}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatTile
          label="Temporários"
          value={stats.temporarios}
          icon={Sparkles}
          tone="default"
        />
        <StatTile
          label="Sem código"
          value={stats.semCodigo}
          icon={Tag}
          tone="default"
        />
        <StatTile
          label="Está acabando"
          value={stats.acabando}
          icon={AlertTriangle}
          tone="destructive"
        />
      </div>

      {/* Para revisar */}
      {paraRevisar.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Produtos para revisar ({paraRevisar.length})
            </CardTitle>
            <CardDescription>
              Cadastros rápidos que ainda precisam ser completados.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 -mt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paraRevisar.map((p) => {
              const missing = getMissingFields(p);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setEditing(p);
                    setShowModal(true);
                  }}
                  className="text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 p-3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ProdutoFoto fotoUrl={p.fotoUrl} nome={p.nome} className="h-8 w-8" emojiSize="text-xl" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatBRL(p.preco)}
                      </div>
                    </div>
                  </div>
                  {missing.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {missing.map((m) => (
                        <Badge key={m} variant="warning" className="text-[9px]">
                          falta {m}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Mais vendidos */}
      {maisVendidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Mais vendidos do mês
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 -mt-1 divide-y divide-border">
            {maisVendidos.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <ProdutoFoto fotoUrl={p.fotoUrl} nome={p.nome} className="h-8 w-8" emojiSize="text-xl" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.vendidoNoMes} vendidos · {formatBRL(p.faturamentoNoMes ?? 0)}
                  </div>
                </div>
                {(p.statusEstoque === "acabando" ||
                  p.statusEstoque === "nao_informado") && (
                  <Badge variant="warning" className="text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {p.statusEstoque === "acabando" ? "Acabando" : "Sem info"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Busca + filtros */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código, categoria ou preço..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
                filter === f.v
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          {filtered.length} de {products.length} produtos
          {(filter !== "todos" || search || categoryFilter) && (
            <button
              onClick={() => {
                setFilter("todos");
                setSearch("");
                setCategoryFilter(null);
              }}
              className="text-primary hover:underline"
            >
              Limpar
            </button>
          )}
          {/* Toggle Grade / Tabela */}
          <div className="ml-auto flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "rounded p-1 transition-colors",
                view === "grid" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"
              )}
              title="Grade visual"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "rounded p-1 transition-colors",
                view === "table" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"
              )}
              title="Lista detalhada"
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Grade visual de produtos */}
      {view === "grid" && (
        <div>
          {filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <div className="font-medium">Nenhum produto encontrado</div>
              <div className="text-xs text-muted-foreground mt-1">
                Limpa os filtros ou cadastra um novo.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((p) => (
                <ProdutoCard
                  key={p.id}
                  product={p}
                  onClick={() => {
                    setEditing(p);
                    setShowModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ações em massa */}
      {selected.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {selected.size} selecionados:
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate({ tipoCadastro: "confirmado" })}
            >
              Marcar confirmados
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate({ tipoCadastro: "temporario" })}
            >
              Marcar temporários
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate({ statusEstoque: "acabando" })}
            >
              Está acabando
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate({ statusEstoque: "acabou" })}
            >
              Acabou
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Apagar
            </Button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-primary hover:underline ml-auto"
            >
              Limpar seleção
            </button>
          </div>
        </Card>
      )}

      {/* Tabela */}
      {view === "table" && (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelected(new Set(filtered.map((p) => p.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="text-left font-medium px-3 py-3 w-12"></th>
                <th className="text-left font-medium px-3 py-3">Produto</th>
                <th className="text-left font-medium px-3 py-3">Categoria</th>
                <th className="text-right font-medium px-3 py-3">Preço</th>
                <th className="text-left font-medium px-3 py-3">Estoque</th>
                <th className="text-left font-medium px-3 py-3">Tipo</th>
                <th className="text-right font-medium px-3 py-3">Vendidos/mês</th>
                <th className="text-left font-medium px-3 py-3">Última venda</th>
                <th className="text-left font-medium px-3 py-3">Cadastro</th>
                <th className="px-3 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-muted-foreground">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const statusCad = computeStatusCadastro(p);
                    const isSel = selected.has(p.id);
                    return (
                      <motion.tr
                        key={p.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "hover:bg-secondary/30 transition-colors group",
                          isSel && "bg-primary/5"
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleSelected(p.id)}
                          />
                        </td>
                        <td className="px-3 py-2"><ProdutoFoto fotoUrl={p.fotoUrl} nome={p.nome} className="h-8 w-8" emojiSize="text-xl" /></td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{p.nome}</div>
                          {p.codigoBarras ? (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {p.codigoBarras}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted-foreground italic">
                              sem código
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {p.categoria ? (
                            <select
                              value={p.categoria}
                              onChange={(e) =>
                                handleSavePatch(p.id, {
                                  categoria: e.target.value as ProductCategory,
                                })
                              }
                              className="text-xs bg-transparent border border-transparent hover:border-border rounded px-2 py-1 cursor-pointer"
                            >
                              {PRODUCT_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              sem categoria
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={p.preco}
                            onChange={(e) =>
                              handleSavePatch(p.id, {
                                preco: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right tabular font-semibold bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={p.statusEstoque}
                            onChange={(e) =>
                              handleSavePatch(p.id, {
                                statusEstoque: e.target.value as EstoqueStatus,
                              })
                            }
                            className={cn(
                              "text-xs rounded px-2 py-1 bg-transparent border border-transparent hover:border-border cursor-pointer font-semibold",
                              p.statusEstoque === "bastante" && "text-success",
                              p.statusEstoque === "acabando" && "text-warning",
                              p.statusEstoque === "acabou" && "text-destructive",
                              p.statusEstoque === "nao_informado" && "text-muted-foreground"
                            )}
                          >
                            {(Object.keys(ESTOQUE_LABELS) as EstoqueStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {ESTOQUE_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={p.tipoCadastro}
                            onChange={(e) =>
                              handleSavePatch(p.id, {
                                tipoCadastro: e.target.value as CadastroTipo,
                              })
                            }
                            className="text-xs bg-transparent border border-transparent hover:border-border rounded px-2 py-1 cursor-pointer"
                          >
                            {(Object.keys(TIPO_LABELS) as CadastroTipo[]).map((t) => (
                              <option key={t} value={t}>
                                {TIPO_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right tabular">
                          {p.vendidoNoMes ?? 0}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {p.ultimaVenda ? formatRelativeDate(p.ultimaVenda) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {statusCad === "completo" ? (
                            <Badge variant="success" className="text-[10px]">
                              Completo
                            </Badge>
                          ) : (
                            <button
                              onClick={() => {
                                setEditing(p);
                                setShowModal(true);
                              }}
                              className="text-[10px] font-semibold text-warning hover:underline"
                            >
                              Completar cadastro
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditing(p);
                                setShowModal(true);
                              }}
                              className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary flex items-center justify-center"
                              title="Editar"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
                              title="Apagar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {showModal && (
        <ProdutoModal
          initial={editing ?? undefined}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {showScanner && (
        <SmartScanner
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Package;
  tone: "default" | "success" | "warning" | "destructive";
}) {
  const colors =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning"
        : tone === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary";
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", colors)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-bold tabular">{value}</div>
          <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        </div>
      </div>
    </Card>
  );
}
