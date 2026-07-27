"use client";

import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, Smartphone, ArrowRight } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { METHOD_LABELS, type LiveTransaction } from "@/lib/types";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "agora mesmo";
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return new Date(iso).toLocaleString("pt-BR");
}

const METHOD_COLORS = {
  pix: { bg: "bg-success/10", text: "text-success", accent: "border-l-success" },
  debito: { bg: "bg-primary/10", text: "text-primary", accent: "border-l-primary" },
  credito_avista: { bg: "bg-warning/10", text: "text-warning", accent: "border-l-warning" },
  credito_parcelado: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    accent: "border-l-destructive",
  },
  dinheiro: { bg: "bg-muted", text: "text-foreground", accent: "border-l-muted" },
} as const;

export function LiveTxCard({
  tx,
  highlight,
  compact,
}: {
  tx: LiveTransaction;
  highlight?: boolean;
  compact?: boolean;
}) {
  const c = METHOD_COLORS[tx.metodo];
  const Icon = tx.metodo === "pix" ? Smartphone : CreditCard;

  return (
    <motion.div
      initial={highlight ? { opacity: 0, x: -16, scale: 0.97 } : { opacity: 1 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "rounded-lg border border-border bg-card border-l-4 hover:bg-secondary/30 transition-colors",
        c.accent,
        highlight && "ring-2 ring-primary/30 animate-pulse-once"
      )}
    >
      <div className={cn("flex items-center gap-3 p-3", compact && "p-2.5")}>
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
            c.bg,
            c.text
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {tx.pagador || METHOD_LABELS[tx.metodo]}
            </span>
            {tx.bandeira && (
              <span className="text-[10px] uppercase tracking-wide bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                {tx.bandeira}
              </span>
            )}
            {tx.parcelas && (
              <span className="text-[10px] uppercase tracking-wide bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                {tx.parcelas}x
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span>{relativeTime(tx.data)}</span>
            <span>•</span>
            <span>NSU {tx.nsu}</span>
            <span>•</span>
            <span>taxa {tx.taxa.toFixed(2).replace(".", ",")}%</span>
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold text-base tabular">{formatBRL(tx.valor)}</div>
          <div className="text-xs text-muted-foreground tabular flex items-center justify-end gap-0.5">
            <ArrowRight className="h-3 w-3" />
            {formatBRL(tx.valorLiquido)}
          </div>
        </div>

        {!compact && (
          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
}
