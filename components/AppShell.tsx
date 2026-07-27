"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CloudSync } from "@/components/CloudSync";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { AIChat } from "@/components/AIChat";
import { TourGuide } from "@/components/TourGuide";

const PUBLIC_ROUTES = ["/login", "/cadastro", "/auth"];

/**
 * Envelopa o conteúdo do app. Em páginas públicas (login, cadastro),
 * NÃO renderiza sidebar, bottom nav nem prompt de instalação.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.some((p) => pathname?.startsWith(p));

  if (isPublic) {
    // Rotas públicas: layout limpo, sem chrome do app
    // (mas mantém o prompt de atualização — fica útil mesmo deslogado)
    return (
      <>
        {children}
        <UpdatePrompt />
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="mx-auto max-w-7xl p-4 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
      <BottomNav />
      <InstallPrompt />
      <CloudSync />
      <UpdatePrompt />
      <AIChat />
      <TourGuide />
    </>
  );
}
