"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, ShoppingCart, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { sugerirReposicoes } from "@/lib/stock";

const TABS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/vendas", label: "Vender", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/repor", label: "Repor", icon: ShoppingCart },
  { href: "/conferencia", label: "Conferir", icon: ListChecks },
];

export function BottomNav() {
  const pathname = usePathname();
  const products = useStore((s) => s.products);
  const urgentes = sugerirReposicoes(products).filter(
    (s) => s.urgencia === "critica" || s.urgencia === "alta"
  ).length;

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname?.startsWith(tab.href);
          const showBadge = tab.href === "/repor" && urgentes > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <tab.icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-110"
                  )}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {urgentes > 9 ? "9+" : urgentes}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none">
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 h-0.5 w-10 bg-primary rounded-b" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
