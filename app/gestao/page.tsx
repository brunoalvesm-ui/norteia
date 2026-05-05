import Link from "next/link";
import { ClipboardList, Package, ReceiptText, Repeat } from "lucide-react";
import { PageShell } from "@/components/page-shell";

const managementItems = [
  {
    href: "/contas-a-pagar",
    title: "Contas a pagar",
    description: "Lance despesas, vencimentos e pagamentos futuros.",
    icon: ClipboardList,
  },
  {
    href: "/vendas",
    title: "Vendas",
    description: "Acompanhe faturamento, ticket medio, CMV e rankings.",
    icon: ReceiptText,
  },
  {
    href: "/produtos",
    title: "Produtos",
    description: "Cadastre precos, custos e margens dos itens vendidos.",
    icon: Package,
  },
  {
    href: "/rotina",
    title: "Rotina",
    description: "Mantenha o Norteia atualizado toda semana.",
    icon: Repeat,
  },
];

export default function GestaoPage() {
  return (
    <PageShell
      eyebrow="Gestao"
      title="Central de gestao"
      description="Acesse os modulos operacionais que alimentam os numeros do Norteia."
    >
      <div className="grid gap-3">
        {managementItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft transition hover:border-norteia-primary/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-norteia-primary/10 text-norteia-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <strong className="block font-title text-xl text-norteia-text">
                  {item.title}
                </strong>
                <span className="mt-2 block text-sm leading-6 text-norteia-muted">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
