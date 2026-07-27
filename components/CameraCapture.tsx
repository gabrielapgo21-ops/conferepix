"use client";

/**
 * Câmera nativa usando getUserMedia.
 *
 * Por que existe: no iOS PWA standalone, <input type="file" capture> NÃO abre
 * a câmera — sempre cai na galeria. A única forma confiável é usar a API de mídia.
 *
 * Funciona em: iOS Safari + PWA, Android Chrome + PWA, desktop com webcam.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RefreshCw, Check } from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [starting, setStarting] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user") => {
      stopStream();
      setError(null);
      setStarting(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Seu navegador não suporta acesso à câmera. Tenta abrir pelo Safari ou Chrome."
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS exige playsInline; já tá no atributo. Mas também damos um play() explícito.
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        const err = e as Error;
        let msg = err.message || "Erro ao abrir câmera.";
        if (err.name === "NotAllowedError") {
          msg = "Permissão da câmera negada. Vai em Ajustes → Safari → Câmera → Permitir.";
        } else if (err.name === "NotFoundError") {
          msg = "Câmera não encontrada nesse dispositivo.";
        } else if (err.name === "NotReadableError") {
          msg = "Câmera tá sendo usada por outro app. Fecha e tenta de novo.";
        }
        setError(msg);
      } finally {
        setStarting(false);
      }
    },
    [stopStream]
  );

  // Inicia a câmera quando abre
  useEffect(() => {
    if (open) {
      setPreview(null);
      startCamera(facing);
    } else {
      stopStream();
    }
    return () => stopStream();
    // facing só re-dispara via switchCamera, não aqui
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setError("A câmera ainda tá carregando. Espera 1 segundo e tenta de novo.");
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setPreview(dataUrl);
    stopStream();
  };

  const handleRetake = () => {
    setPreview(null);
    startCamera(facing);
  };

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
      onClose();
    }
  };

  const handleSwitch = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    startCamera(next);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 text-white">
        <button
          type="button"
          onClick={() => {
            stopStream();
            setPreview(null);
            onClose();
          }}
          className="rounded-full p-2 bg-white/10 hover:bg-white/20 active:scale-95 transition"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-sm font-medium">
          {preview ? "Confirmar foto" : "Tira a foto do produto"}
        </div>
        {!preview && !error ? (
          <button
            type="button"
            onClick={handleSwitch}
            className="rounded-full p-2 bg-white/10 hover:bg-white/20 active:scale-95 transition"
            aria-label="Virar câmera"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Conteúdo central */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
            <Camera className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm leading-relaxed mb-4">{error}</p>
            <Button onClick={() => startCamera(facing)} variant="secondary">
              Tentar de novo
            </Button>
          </div>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Foto capturada"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        {starting && !error && !preview && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-white text-sm flex flex-col items-center gap-2">
              <Camera className="h-6 w-6 animate-pulse" />
              Abrindo câmera...
            </div>
          </div>
        )}
      </div>

      {/* Footer com botão de captura */}
      <div className="p-6 pb-10 flex items-center justify-center gap-6">
        {preview ? (
          <>
            <Button
              onClick={handleRetake}
              variant="outline"
              size="lg"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Tirar de novo
            </Button>
            <Button
              onClick={handleConfirm}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="h-4 w-4" />
              Usar essa
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            disabled={!!error || starting}
            className="h-20 w-20 rounded-full bg-white border-4 border-white/30 active:scale-90 transition disabled:opacity-30 shadow-2xl flex items-center justify-center"
            aria-label="Tirar foto"
          >
            <div className="h-16 w-16 rounded-full bg-white border-2 border-black/20" />
          </button>
        )}
      </div>
    </div>
  );
}
