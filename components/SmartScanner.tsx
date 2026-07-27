"use client";

/**
 * Scanner inteligente: ao bipar um código, busca o produto no banco.
 * - Achou → mostra modal "Produto encontrado" com Foto + Nome + Preço + Estoque
 * - Não achou → mostra modal "Cadastrar produto?" com botão pra criar (código já preenchido)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Package,
  Plus,
  AlertCircle,
  Edit3,
} from "lucide-react";
import { ScannerModal } from "./ScannerModal";
import { ProdutoModal } from "./ProdutoModal";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useStore } from "@/lib/store";
import { formatBRL, uid } from "@/lib/utils";
import { ESTOQUE_LABELS, type Product } from "@/lib/products";

interface Props {
  onClose: () => void;
  /** Callback opcional quando achou produto. Útil pra vender direto. */
  onFound?: (p: Product) => void;
}

type Step = "scanning" | "found" | "not_found" | "editing";

export function SmartScanner({ onClose, onFound }: Props) {
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);

  const [step, setStep] = useState<Step>("scanning");
  const [codigo, setCodigo] = useState("");
  const [produto, setProduto] = useState<Product | null>(null);

  const handleScan = (code: string) => {
    setCodigo(code);
    const found = products.find((p) => p.codigoBarras === code);
    if (found) {
      setProduto(found);
      setStep("found");
      onFound?.(found);
    } else {
      setProduto(null);
      setStep("not_found");
    }
  };

  const handleCadastrarNovo = () => {
    setStep("editing");
  };

  const handleSaveNovo = (p: Product) => {
    // Garante que o código tá preenchido
    addProduct({ ...p, codigoBarras: codigo });
    setStep("scanning");
    onClose();
  };

  const handleEditarExistente = () => {
    setStep("editing");
  };

  const handleSaveExistente = (p: Product) => {
    if (produto) updateProduct(produto.id, p);
    setStep("scanning");
    onClose();
  };

  // ===== Renderização =====

  if (step === "scanning") {
    return <ScannerModal onClose={onClose} onScan={handleScan} />;
  }

  if (step === "editing") {
    return (
      <ProdutoModal
        initial={
          produto ?? {
            id: "prod-" + uid(),
            nome: "",
            codigoBarras: codigo,
            preco: 0,
            statusEstoque: "nao_informado",
            tipoCadastro: "rapido",
            criadoEm: new Date().toISOString(),
          }
        }
        onClose={onClose}
        onSave={produto ? handleSaveExistente : handleSaveNovo}
      />
    );
  }

  if (step === "found" && produto) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl max-w-md w-full overflow-hidden"
        >
          {/* Faixa verde de sucesso */}
          <div className="bg-success text-success-foreground p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <div className="font-semibold text-sm">Produto encontrado! ✨</div>
              <div className="text-xs opacity-90">Código {codigo}</div>
            </div>
          </div>

          {/* Detalhes do produto */}
          <div className="p-5">
            <div className="flex gap-4">
              {produto.fotoUrl?.startsWith("data:") ||
              produto.fotoUrl?.startsWith("http") ? (
                <img
                  src={produto.fotoUrl}
                  alt={produto.nome}
                  className="h-24 w-24 rounded-xl object-cover bg-secondary"
                />
              ) : (
                <div className="h-24 w-24 rounded-xl bg-secondary flex items-center justify-center text-5xl">
                  {produto.fotoUrl ?? "📦"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg leading-tight">
                  {produto.nome}
                </div>
                {produto.categoria && (
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {produto.categoria}
                  </Badge>
                )}
                <div className="text-2xl font-bold tabular mt-2 text-primary">
                  {formatBRL(produto.preco)}
                </div>
              </div>
            </div>

            {/* Status do estoque */}
            <div className="mt-4 p-3 rounded-lg bg-secondary/40 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Estoque</div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    "text-sm font-semibold " +
                    (produto.statusEstoque === "bastante"
                      ? "text-success"
                      : produto.statusEstoque === "acabando"
                        ? "text-warning"
                        : produto.statusEstoque === "acabou"
                          ? "text-destructive"
                          : "text-muted-foreground")
                  }
                >
                  {ESTOQUE_LABELS[produto.statusEstoque]}
                </span>
                {produto.quantidadeAprox !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    (~{produto.quantidadeAprox} un)
                  </span>
                )}
              </div>
            </div>

            {/* Margem se tiver custo */}
            {produto.custo && produto.custo > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Margem: <strong className="text-success">{(((produto.preco - produto.custo) / produto.preco) * 100).toFixed(0)}%</strong>
                {" — lucro de "}
                <strong>{formatBRL(produto.preco - produto.custo)}</strong> por unidade
              </div>
            )}

            {/* Ações */}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleEditarExistente}>
                <Edit3 className="h-4 w-4" />
                Editar
              </Button>
              <Button onClick={onClose}>
                <CheckCircle2 className="h-4 w-4" />
                OK
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "not_found") {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl max-w-md w-full overflow-hidden"
        >
          <div className="bg-warning text-warning-foreground p-4 flex items-center gap-3">
            <AlertCircle className="h-6 w-6" />
            <div>
              <div className="font-semibold text-sm">
                Não conheço esse produto ainda 🔍
              </div>
              <div className="text-xs opacity-90">Código {codigo}</div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="text-center py-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-foreground font-medium">
                Quer cadastrar agora?
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Eu já deixo o código <strong>{codigo}</strong> preenchido pra
                você. Aí da próxima vez que você bipar, eu já reconheço.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleCadastrarNovo} variant="success">
                <Plus className="h-4 w-4" />
                Cadastrar
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              💡 Bipar de novo o mesmo produto cadastrado já vai mostrar foto e
              preço!
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
