"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Package,
  AlertTriangle,
  Sparkles,
  Plus,
  ShoppingCart,
  ArrowRight,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { ScannerModal } from "@/components/ScannerModal";
import { ProdutoFoto } from "@/components/ProdutoFoto";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBRL, uid, cn } from "@/lib/utils";
import {
  ESTOQUE_LABELS,
  TIPO_LABELS,
  type Product,
} from "@/lib/products";

export default function EstoqueRapidoPage() {
  const mounted = useHasMounted();
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);

  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState(0);
  const [feedback, setFeedback] = useState<{ msg: string; tone: "ok" | "warn" } | null>(
    null
  );

  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 12);
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.codigoBarras ?? "").includes(q) ||
        (p.categoria ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const acabando = products.filter((p) => p.statusEstoque === "acabando");
  const acabou = products.filter((p) => p.statusEstoque === "acabou");

  const handleQuickAdd = (tipo: "rapido" | "temporario") => {
    if (!quickName || quickPrice <= 0) return;
    const p: Product = {
      id: "prod-" + uid(),
      nome: quickName,
      preco: quickPrice,
      statusEstoque: "nao_informado",
      tipoCadastro: tipo,
      criadoEm: new Date().toISOString(),
    };
    addProduct(p);
    setFeedback({
      msg: `Produto "${quickName}" criado como ${tipo === "rapido" ? "rápido" : "temporário"}. Complete depois em Produtos Cadastrados.`,
      tone: "warn",
    });
    setQuickName("");
    setQuickPrice(0);
    setTimeout(() => setFeedback(null), 4000);
  };

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Estoque Rápido</h1>
        <p className="text-muted-foreground mt-1">
          Procura produto pra venda ou cadastra um novo em segundos.
        </p>
      </div>

      {/* Alertas de estoque */}
      {(acabando.length > 0 || acabou.length > 0) && (
        <Card className="p-4 bg-warning/5 border-warning/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {acabando.length > 0 &&
                  `${acabando.length} produto${acabando.length > 1 ? "s" : ""} está acabando`}
                {acabando.length > 0 && acabou.length > 0 && " · "}
                {acabou.length > 0 &&
                  `${acabou.length} já acabou${acabou.length > 1 ? "ram" : ""}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {[...acabando, ...acabou].slice(0, 5).map((p) => p.nome).join(", ")}
                {acabando.length + acabou.length > 5 && "..."}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Busca */}
      <Card className="p-5">
        <Label className="text-sm font-semibold">Buscar produto</Label>
        <div className="flex gap-2 mt-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite nome, código ou categoria…"
              className="pl-9 text-lg h-12"
              autoFocus
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowScanner(true)}
            className="h-12 px-4"
            title="Bipar código de barras"
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {filtered.length === 0
            ? "Nenhum produto encontrado. Cadastra rapidão embaixo."
            : `${filtered.length} produtos encontrados`}
        </p>
      </Card>

      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onScan={(code) => {
            setSearch(code);
            setShowScanner(false);
          }}
        />
      )}

      {/* Grade de produtos */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={cn(
                  "p-4 hover:border-primary/40 cursor-pointer transition-all",
                  p.statusEstoque === "acabou" && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <ProdutoFoto
                    fotoUrl={p.fotoUrl}
                    nome={p.nome}
                    className="h-14 w-14"
                    emojiSize="text-3xl"
                  />
                  {p.statusEstoque === "acabando" && (
                    <Badge variant="warning" className="text-[9px]">
                      Acabando
                    </Badge>
                  )}
                  {p.statusEstoque === "acabou" && (
                    <Badge variant="destructive" className="text-[9px]">
                      Acabou
                    </Badge>
                  )}
                  {p.tipoCadastro === "temporario" && (
                    <Badge variant="outline" className="text-[9px]">
                      Temp
                    </Badge>
                  )}
                </div>
                <div className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                  {p.nome}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {p.categoria ?? "Sem categoria"}
                </div>
                <div className="flex items-end justify-between mt-3">
                  <div className="font-bold tabular text-lg">{formatBRL(p.preco)}</div>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                    <ShoppingCart className="h-3 w-3" />
                    Vender
                  </Button>
                </div>
                {p.codigoBarras && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-2 truncate">
                    {p.codigoBarras}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Cadastro rápido */}
      <Card className="p-5 bg-primary/5 border-primary/30">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Não achou? Cadastra na hora</CardTitle>
        </div>
        <CardDescription className="mb-4">
          Coloca só o essencial agora. Depois você completa em{" "}
          <strong>Produtos Cadastrados</strong>.
        </CardDescription>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <Label>Nome ou descrição</Label>
            <Input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Ex: Blusa preta, Item avulso, etc."
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Preço (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={quickPrice}
              onChange={(e) => setQuickPrice(parseFloat(e.target.value) || 0)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleQuickAdd("rapido")}
            disabled={!quickName || quickPrice <= 0}
          >
            <Plus className="h-4 w-4" />
            Criar produto rápido
          </Button>
          <Button
            variant="outline"
            onClick={() => handleQuickAdd("temporario")}
            disabled={!quickName || quickPrice <= 0}
          >
            <Sparkles className="h-4 w-4" />
            Criar temporário
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          💡 <strong>Rápido</strong> tem nome e preço, falta foto/código/categoria.{" "}
          <strong>Temporário</strong> é pra item avulso ou promoção pontual.
        </p>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-3 p-3 rounded-lg text-sm flex items-center gap-2",
              feedback.tone === "ok"
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            )}
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {feedback.msg}
          </motion.div>
        )}
      </Card>
    </div>
  );
}
