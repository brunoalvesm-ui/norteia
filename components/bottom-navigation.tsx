"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ChartNoAxesCombined,
  Home,
  Landmark,
  Route,
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
    href: "/rotina",
    label: "Rotina",
    icon: CalendarCheck,
  },
  {
    href: "/onboarding",
    label: "Guia",
    icon: Route,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-norteia-line bg-norteia-bg/86 px-3 pb-3 pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-3xl border border-norteia-line bg-norteia-card/92 p-1 shadow-soft sm:max-w-2xl lg:max-w-4xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium transition ${
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
