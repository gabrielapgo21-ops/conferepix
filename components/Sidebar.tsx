"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Upload,
  ListChecks,
  Percent,
  FileBarChart,
  Wallet,
  Menu,
  X,
  Radio,
  Smartphone,
  Plug,
  ShoppingBag,
  Settings,
  Package,
  Boxes,
  LogOut,
  Crown,
  ShoppingCart,
  Users,
  Wand2,
  HelpCircle,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/vendas", label: "Vendas", icon: ShoppingBag, badge: null },
  { href: "/estoque", label: "Estoque Rápido", icon: Boxes, badge: "NOVO" },
  { href: "/produtos", label: "Produtos Cadastrados", icon: Package, badge: "NOVO" },
  { href: "/repor", label: "Repor Estoque", icon: ShoppingCart, badge: "NOVO" },
  { href: "/clientes", label: "Clientes", icon: Users, badge: "NOVO" },
  { href: "/marketing-ia", label: "Marketing IA", icon: Wand2, badge: "IA" },
  { href: "/catalogo-site", label: "Catálogo Site", icon: Globe, badge: "NOVO" },
  { href: "/maquininhas", label: "Maquininhas", icon: Smartphone, badge: null },
  { href: "/uploads", label: "Uploads", icon: Upload, badge: null },
  { href: "/conferencia", label: "Conferência", icon: ListChecks, badge: null },
  { href: "/taxas", label: "Taxas", icon: Percent, badge: null },
  { href: "/relatorio", label: "Relatório", icon: FileBarChart, badge: null },
  // Avançado
  { href: "/ao-vivo", label: "Ao Vivo", icon: Radio, badge: null },
  { href: "/integracao", label: "Integração MP", icon: Plug, badge: "MP" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, badge: null },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle, badge: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [nomeLoja, setNomeLoja] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Fecha drawer ao mudar de rota
  useEffect(() => setMobileOpen(false), [pathname]);

  // Pega info do usuário logado + se é dona
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserEmail(data.user.email ?? null);
      const meta = data.user.user_metadata as { nome_loja?: string };
      setNomeLoja(meta?.nome_loja ?? null);

      // Verifica se é dona
      const { data: row } = await supabase
        .from("user_data")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (row?.role === "owner" || row?.role === "admin") {
        setIsOwner(true);
      }
    });
  }, []);

  const handleLogout = async () => {
    if (!confirm("Sair da conta?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    // Limpa cache local pra evitar dados antigos
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("conferepix-store");
      } catch {
        // ignore
      }
    }
    // Hard navigation — força reload completo pra limpar router cache
    window.location.href = "/login";
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold leading-none">ConferePix</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Conferência de repasses
            </div>
          </div>
        </Link>
        <button
          className="lg:hidden h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {isOwner && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-2",
              pathname === "/admin"
                ? "bg-warning text-warning-foreground"
                : "bg-warning/10 text-warning hover:bg-warning/20"
            )}
          >
            <Crown className="h-4 w-4" />
            <span className="flex-1">Painel da Dona</span>
            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-warning-foreground/20">
              👑
            </span>
          </Link>
        )}
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-success/15 text-success"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 space-y-2">
        {userEmail && (
          <div className="text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground truncate flex-1">
                {nomeLoja ?? "Minha loja"}
              </span>
              {isOwner && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  <Crown className="h-2.5 w-2.5" />
                  DONA
                </span>
              )}
            </div>
            <div className="text-muted-foreground truncate text-[10px]">
              {userEmail}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md px-2 py-1.5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Header mobile */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold">ConferePix</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 rounded-md border border-border flex items-center justify-center"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card">
        {content}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-xl">
            {content}
          </aside>
        </>
      )}
    </>
  );
}
