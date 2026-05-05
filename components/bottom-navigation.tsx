"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ChartNoAxesCombined,
  Home,
  Landmark,
  Package,
  ReceiptText,
  SquareMenu,
} from "lucide-react";

const items = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: Home,
  },
  {
    href: "/simulador",
    label: "Simular",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/fluxo-de-caixa",
    label: "Caixa",
    icon: Landmark,
  },
  {
    href: "/mesas",
    label: "Mesas",
    icon: SquareMenu,
  },
  {
    href: "/vendas",
    label: "Vendas",
    icon: ReceiptText,
  },
  {
    href: "/produtos",
    label: "Produtos",
    icon: Package,
  },
  {
    href: "/rotina",
    label: "Rotina",
    icon: CalendarCheck,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-norteia-line bg-norteia-bg/86 px-3 pb-3 pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-7 gap-1 rounded-3xl border border-norteia-line bg-norteia-card/92 p-1 shadow-soft sm:max-w-2xl lg:max-w-4xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition sm:px-2 sm:text-xs ${
                isActive
                  ? "bg-norteia-primary text-norteia-bg shadow-glow"
                  : "text-norteia-muted hover:bg-norteia-card-2 hover:text-norteia-text"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
