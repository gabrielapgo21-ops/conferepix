"use client";

/**
 * Balão de dica contextual — aparece quando a pessoa visita uma tela específica
 * pela primeira vez. Lembra que viu (não aparece de novo).
 *
 * Uso:
 *   <DicaContextual id="dica-vendas" emoji="🛒" texto="..." />
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { dicaJaVista, marcarDicaVista } from "@/lib/tour";

interface Props {
  id: string;
  emoji?: string;
  titulo?: string;
  texto: string;
  /** Delay em ms antes de aparecer (default 800) */
  delay?: number;
}

export function DicaContextual({
  id,
  emoji = "💡",
  titulo,
  texto,
  delay = 800,
}: Props) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (dicaJaVista(id)) return;
    const t = setTimeout(() => setVisivel(true), delay);
    return () => clearTimeout(t);
  }, [id, delay]);

  const fechar = () => {
    marcarDicaVista(id);
    setVisivel(false);
  };

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", damping: 22 }}
          className="fixed bottom-24 lg:bottom-24 right-4 left-4 lg:left-auto lg:right-24 z-40 max-w-sm mx-auto lg:mx-0"
        >
          <div className="bg-card border border-primary/30 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 px-4 py-2 flex items-center gap-2 border-b border-border">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Dica rápida
              </span>
              <button
                type="button"
                onClick={fechar}
                className="ml-auto h-6 w-6 rounded-md hover:bg-white/40 dark:hover:bg-black/20 flex items-center justify-center"
                aria-label="Fechar dica"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              <div className="flex-1">
                {titulo && (
                  <div className="font-semibold text-sm mb-1">{titulo}</div>
                )}
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {texto}
                </div>
              </div>
            </div>
            <div className="px-4 pb-3">
              <button
                type="button"
                onClick={fechar}
                className="w-full bg-primary text-primary-foreground text-xs font-semibold rounded-md py-2 hover:bg-primary/90 transition"
              >
                Entendi!
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
