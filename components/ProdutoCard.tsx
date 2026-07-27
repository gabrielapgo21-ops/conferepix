"use client";

/**
 * Card visual de produto — estilo Shopify POS / Square.
 * Foto grande, nome, preço destacado, badge de estoque colorida.
 */

import { motion } from "framer-motion";
import { AlertTriangle, XCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { formatBRL, cn } from "@/lib/utils";
import { CATEGORY_STYLE, type Product } from "@/lib/products";

interface Props {
  product: Product;
  onClick?: () => void;
  selected?: boolean;
}

export function ProdutoCard({ product, onClick, selected }: Props) {
  const isRealPhoto =
    product.fotoUrl?.startsWith("data:") || product.fotoUrl?.startsWith("http");
  const style = product.categoria ? CATEGORY_STYLE[product.categoria] : null;

  const estoqueLabel = {
    bastante: { label: "Tem", color: "bg-success text-success-foreground", Icon: CheckCircle2 },
    acabando: { label: "Acabando", color: "bg-warning text-warning-foreground", Icon: AlertTriangle },
    acabou:   { label: "Acabou", color: "bg-destructive text-destructive-foreground", Icon: XCircle },
    nao_informado: { label: "?", color: "bg-muted text-muted-foreground", Icon: HelpCircle },
  }[product.statusEstoque];

  return (
    <motion.button
      layout
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group text-left rounded-2xl overflow-hidden border bg-card hover:shadow-lg transition-all",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
    >
      {/* Foto / cabeçalho colorido */}
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ background: style?.bg ?? "#F3F4F6" }}
      >
        {isRealPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.fotoUrl}
            alt={product.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {product.fotoUrl || style?.icone || "📦"}
          </div>
        )}

        {/* Badge de estoque flutuante */}
        <div
          className={cn(
            "absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm",
            estoqueLabel.color
          )}
        >
          <estoqueLabel.Icon className="h-2.5 w-2.5" />
          {estoqueLabel.label}
        </div>

        {/* Badge de tipo (rápido/temporário/sem código) */}
        {product.tipoCadastro !== "confirmado" && (
          <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-card/90 text-foreground shadow-sm">
            {product.tipoCadastro === "rapido"
              ? "rápido"
              : product.tipoCadastro === "temporario"
                ? "temp"
                : "sem cód"}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        {product.categoria && style && (
          <div
            className="text-[9px] font-bold uppercase tracking-wide truncate"
            style={{ color: style.cor }}
          >
            {product.categoria}
          </div>
        )}
        <div className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.nome}
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <div className="font-bold tabular text-base">
            {formatBRL(product.preco)}
          </div>
          {product.vendidoNoMes && product.vendidoNoMes > 0 && (
            <div className="text-[10px] text-muted-foreground">
              {product.vendidoNoMes} vendidos
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
