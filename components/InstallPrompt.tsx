"use client";

import { useState, useEffect } from "react";
import { Download, X, Share2 } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "conferepix-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Já instalado?
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true
    ) {
      return;
    }

    if (localStorage.getItem(DISMISS_KEY)) return;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);

    // Em iOS Safari não tem beforeinstallprompt — mostra hint manual
    if (isIOS) {
      setTimeout(() => setIosHint(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setShow(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
    setIosHint(false);
  };

  if (show && deferred) {
    return (
      <div className="fixed bottom-20 lg:bottom-6 inset-x-4 lg:left-auto lg:right-6 lg:w-96 z-50">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Instalar ConferePix</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pra usar como app, sem barra do navegador, com ícone na tela.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                >
                  Instalar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary"
                >
                  Depois
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (iosHint) {
    return (
      <div className="fixed bottom-20 inset-x-4 z-50 lg:hidden">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Instalar no iPhone</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toque no botão <strong>Compartilhar</strong> ⬆ e escolha{" "}
                <strong>"Adicionar à Tela de Início"</strong> pra abrir igual app.
              </p>
              <button
                onClick={handleDismiss}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Entendi
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
