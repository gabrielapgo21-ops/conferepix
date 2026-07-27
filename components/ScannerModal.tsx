"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Camera, Keyboard, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onClose: () => void;
  onScan: (code: string) => void;
}

const READER_ID = "barcode-scanner-reader";

export function ScannerModal({ onClose, onScan }: Props) {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (mode !== "camera") return;
    if (typeof window === "undefined") return;
    let cancelled = false;

    // Wrapper assíncrono — qualquer erro cai num catch global e mostra "Digitar"
    (async () => {
      try {
        // Espera o DOM existir
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled) return;

        const el = document.getElementById(READER_ID);
        if (!el) {
          throw new Error("Elemento do scanner não encontrado");
        }

        // Import dinâmico com timeout (pra não travar se a rede tiver lenta)
        const importPromise = import("html5-qrcode");
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Carregando câmera demorou demais")), 12000)
        );
        const mod = await Promise.race([importPromise, timeoutPromise]);
        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Html5Qrcode = (mod as any).Html5Qrcode;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fmts = (mod as any).Html5QrcodeSupportedFormats;
        if (!Html5Qrcode) {
          throw new Error("Biblioteca de leitura indisponível");
        }

        const html5Qrcode = new Html5Qrcode(READER_ID, {
          verbose: false,
          formatsToSupport: fmts
            ? [
                fmts.EAN_13,
                fmts.EAN_8,
                fmts.UPC_A,
                fmts.UPC_E,
                fmts.CODE_128,
                fmts.CODE_39,
                fmts.ITF,
                fmts.QR_CODE,
              ]
            : undefined,
        });

        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (vw: number, vh: number) => {
              const min = Math.min(vw, vh);
              const size = Math.floor(min * 0.7);
              return { width: size, height: Math.floor(size * 0.55) };
            },
            aspectRatio: 1.333,
          },
          (decodedText: string) => {
            if (cancelled) return;
            onScan(decodedText.trim());
            html5Qrcode.stop().then(() => html5Qrcode.clear()).catch(() => {});
          },
          () => {
            // Erro por frame — normal, ignorar
          }
        );
        if (!cancelled) setScannerReady(true);
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error)?.message || "Erro desconhecido";
        const low = msg.toLowerCase();
        if (low.includes("permission") || low.includes("denied")) {
          setError(
            "Permissão da câmera negada. Vai em Ajustes do iPhone → Safari → Câmera → Permitir."
          );
        } else if (low.includes("notfound") || low.includes("device") || low.includes("notallowederror")) {
          setError("Câmera não disponível neste dispositivo.");
        } else if (low.includes("demorou") || low.includes("timeout") || low.includes("network")) {
          setError("Internet lenta — não consegui carregar a câmera. Tenta no Wi-Fi ou usa o modo Digitar.");
        } else {
          setError("Não consegui ligar a câmera. Usa o modo Digitar.");
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        try {
          s.stop().then(() => s.clear()).catch(() => {});
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }
    };
  }, [mode, onScan]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) onScan(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full sm:max-w-md sm:rounded-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Bipar código de barras</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setMode("camera")}
            className={
              "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 " +
              (mode === "camera"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground")
            }
          >
            <Camera className="h-4 w-4" />
            Câmera
          </button>
          <button
            onClick={() => setMode("manual")}
            className={
              "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 " +
              (mode === "manual"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground")
            }
          >
            <Keyboard className="h-4 w-4" />
            Digitar
          </button>
        </div>

        {mode === "camera" ? (
          <div className="flex-1 flex flex-col">
            <div className="relative aspect-[3/4] sm:aspect-square bg-black overflow-hidden">
              <div
                id={READER_ID}
                className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />

              {!scannerReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
                  Ligando câmera…
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center text-center p-4 bg-black/80">
                  <div className="bg-card rounded-lg p-4 text-sm max-w-xs">
                    <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
                    <div className="text-foreground">{error}</div>
                    <button
                      onClick={() => {
                        setError(null);
                        setMode("manual");
                      }}
                      className="mt-3 text-xs text-primary hover:underline font-semibold"
                    >
                      Usar modo Digitar
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-secondary/40 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Aponta a câmera pro código de barras do produto.
                <br />
                Funciona com <strong>EAN-13, UPC, Code 128 e QR Code</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Digita o código de barras na mão:
            </p>
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="789012345..."
              className="font-mono text-lg h-12"
              autoFocus
              inputMode="numeric"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar código
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Útil se a câmera estiver travada ou o código estiver apagado.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
