"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";

/**
 * Detecta quando há uma versão nova do app disponível e oferece
 * um botão "Atualizar agora" sem precisar fechar/reinstalar.
 */
export function UpdatePrompt() {
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) return;
        setRegistration(reg);

        // Detecta quando uma nova versão entra em espera
        const handleNewWorker = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Tem versão nova esperando
              setUpdateReady(true);
            }
          });
        };

        if (reg.waiting) {
          setUpdateReady(true);
        }
        if (reg.installing) handleNewWorker(reg.installing);
        reg.addEventListener("updatefound", () => {
          handleNewWorker(reg.installing);
        });

        // Verifica atualizações a cada 60 segundos
        interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 60_000);
      })
      .catch(() => {});

    // Quando uma versão nova tomar controle, recarrega a página
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    return () => {
      if (interval) clearInterval(interval);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  const handleUpdate = () => {
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }
    // Pede pro SW ativar a nova versão imediatamente
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    // O reload acontece automaticamente quando controllerchange dispara
  };

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-24 lg:bottom-6 inset-x-4 lg:left-auto lg:right-6 lg:w-96 z-50"
        >
          <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">Nova versão disponível! ✨</div>
                <p className="text-xs opacity-90 mt-0.5">
                  A gente subiu coisas novas. Atualiza pra aproveitar.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleUpdate}
                    className="flex-1 h-9 rounded-lg bg-primary-foreground text-primary text-sm font-semibold hover:opacity-90"
                  >
                    Atualizar agora
                  </button>
                  <button
                    onClick={() => setUpdateReady(false)}
                    className="px-3 h-9 rounded-lg border border-primary-foreground/30 text-sm hover:bg-primary-foreground/10"
                  >
                    Depois
                  </button>
                </div>
              </div>
              <button
                onClick={() => setUpdateReady(false)}
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
