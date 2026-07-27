"use client";

/**
 * Tour de onboarding — aparece na PRIMEIRA vez que a pessoa usa.
 *
 * Modal centralizado, 8 passos, navegação com setas.
 * Tem opção de pular a qualquer momento.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TOUR_PASSOS,
  deveMostrarTour,
  marcarTourCompleto,
  pularTour,
} from "@/lib/tour";

export function TourGuide() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    // Espera o app carregar antes de mostrar (~1.5s)
    const t = setTimeout(() => {
      if (deveMostrarTour()) {
        setAberto(true);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const passoAtual = TOUR_PASSOS[passo];
  const isUltimo = passo === TOUR_PASSOS.length - 1;
  const isPrimeiro = passo === 0;

  const proximo = () => {
    if (isUltimo) {
      marcarTourCompleto();
      setAberto(false);
      return;
    }
    const prox = TOUR_PASSOS[passo + 1];
    if (prox?.rota) router.push(prox.rota);
    setPasso(passo + 1);
  };

  const anterior = () => {
    if (isPrimeiro) return;
    setPasso(passo - 1);
  };

  const pular = () => {
    pularTour();
    setAberto(false);
  };

  return (
    <AnimatePresence>
      {aberto && passoAtual && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={pular}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 22 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-primary to-blue-600 text-primary-foreground p-5 relative">
                <button
                  type="button"
                  onClick={pular}
                  className="absolute top-3 right-3 h-7 w-7 rounded-full hover:bg-white/20 flex items-center justify-center transition"
                  aria-label="Pular tour"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-xs opacity-90">
                    Tour rápido · {passo + 1} de {TOUR_PASSOS.length}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    animate={{
                      width: `${((passo + 1) / TOUR_PASSOS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6 text-center">
                <motion.div
                  key={passo}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring" }}
                  className="text-5xl mb-3"
                >
                  {passoAtual.emoji}
                </motion.div>
                <motion.div
                  key={`title-${passo}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-bold text-xl mb-2"
                >
                  {passoAtual.titulo}
                </motion.div>
                <motion.div
                  key={`text-${passo}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  {passoAtual.texto}
                </motion.div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={anterior}
                  disabled={isPrimeiro}
                  className="text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>
                <button
                  type="button"
                  onClick={pular}
                  className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                >
                  Pular tour
                </button>
                <Button onClick={proximo} size="sm" className="text-xs">
                  {isUltimo ? "Vamo lá!" : "Próximo"}
                  {!isUltimo && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
