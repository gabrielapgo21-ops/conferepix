"use client";

/**
 * Sincroniza o Zustand store com o Supabase user_data.
 *
 * Fluxo:
 * 1. Ao logar: PUXA do Supabase e hidrata o store local
 * 2. A cada mudança no store: DEBOUNCE 1.5s + ENVIA pro Supabase
 * 3. Mostra indicador "Salvando..." / "Salvo na nuvem ✓"
 *
 * Estratégia: last-write-wins. Pra MVP, simples e suficiente.
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";

type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error" | "offline";

interface CloudData {
  products?: ReturnType<typeof useStore.getState>["products"];
  machines?: ReturnType<typeof useStore.getState>["machines"];
  rates?: ReturnType<typeof useStore.getState>["rates"];
  transactions?: ReturnType<typeof useStore.getState>["transactions"];
  files?: ReturnType<typeof useStore.getState>["files"];
  store?: ReturnType<typeof useStore.getState>["store"];
  stockEntries?: ReturnType<typeof useStore.getState>["stockEntries"];
  customers?: ReturnType<typeof useStore.getState>["customers"];
}

export function CloudSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [hidratado, setHidratado] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const supabaseRef = useRef(createClient());

  // ===== 1. PUXAR DO SUPABASE quando user loga =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        const supabase = supabaseRef.current;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setStatus("idle");
          return;
        }
        userIdRef.current = user.id;

        const { data, error } = await supabase
          .from("user_data")
          .select("data, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn("[CloudSync] erro ao ler:", error.message);
          setStatus("error");
          setHidratado(true); // libera os saves mesmo assim
          return;
        }

        if (data?.data && Object.keys(data.data).length > 0) {
          // Hidrata o Zustand com os dados da nuvem
          const cloud = data.data as CloudData;
          const local = useStore.getState();

          // Estratégia de merge — pra MVP: a nuvem sobrescreve TUDO
          useStore.setState({
            products: cloud.products ?? local.products,
            machines: cloud.machines ?? local.machines,
            rates: cloud.rates ?? local.rates,
            transactions: cloud.transactions ?? local.transactions,
            files: cloud.files ?? local.files,
            store: cloud.store ?? local.store,
            stockEntries: cloud.stockEntries ?? local.stockEntries,
            customers: cloud.customers ?? local.customers,
          });
          setStatus("saved");
        } else {
          // Primeira vez ou nuvem vazia: deixa o local como está
          // (vai ser enviado no próximo subscribe)
          setStatus("idle");
        }

        // Marca como hidratado pra liberar os saves automáticos
        setHidratado(true);
      } catch (e) {
        if (!cancelled) {
          console.warn("[CloudSync] erro:", e);
          setStatus("error");
          setHidratado(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===== 2. ENVIAR PRA NUVEM em cada mudança (debounce) =====
  useEffect(() => {
    if (!hidratado) return;
    if (!userIdRef.current) return;

    const supabase = supabaseRef.current;

    const unsubscribe = useStore.subscribe((state) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setStatus("saving");

      debounceRef.current = setTimeout(async () => {
        try {
          const userId = userIdRef.current;
          if (!userId) {
            setStatus("offline");
            return;
          }

          const payload: CloudData = {
            products: state.products,
            machines: state.machines,
            rates: state.rates,
            transactions: state.transactions,
            files: state.files,
            store: state.store,
            stockEntries: state.stockEntries,
            customers: state.customers,
          };

          const { error } = await supabase
            .from("user_data")
            .upsert(
              { user_id: userId, data: payload },
              { onConflict: "user_id" }
            );

          if (error) {
            console.warn("[CloudSync] save falhou:", error.message);
            setStatus("error");
            return;
          }
          setStatus("saved");
        } catch (e) {
          console.warn("[CloudSync] save falhou:", e);
          setStatus("error");
        }
      }, 1500);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [hidratado]);

  // ===== Indicador visual no canto superior direito =====
  return (
    <div className="fixed top-2 right-2 z-30 pointer-events-none lg:top-3 lg:right-3">
      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 shadow-sm"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Carregando seus dados…
          </motion.div>
        )}
        {status === "saving" && (
          <motion.div
            key="saving"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-full px-2.5 py-1 text-[10px] font-medium text-primary flex items-center gap-1.5 shadow-sm"
          >
            <Cloud className="h-3 w-3 animate-pulse" />
            Salvando…
          </motion.div>
        )}
        {status === "saved" && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { delay: 1.5 } }}
            className="bg-success/10 border border-success/30 rounded-full px-2.5 py-1 text-[10px] font-medium text-success flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-3 w-3" />
            Salvo na nuvem
          </motion.div>
        )}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-destructive/10 border border-destructive/30 rounded-full px-2.5 py-1 text-[10px] font-medium text-destructive flex items-center gap-1.5 shadow-sm"
          >
            <CloudOff className="h-3 w-3" />
            Sem internet
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
