"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { AlertCard } from "@/components/alert-card";
import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import {
  BusinessProfile,
  FinancialAdjustments,
  Payable,
  Sale,
  calculateDre,
  calculatePayrollEstimate,
} from "@/lib/financial-calculations";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import {
  BUSINESS_PROFILE_STORAGE_KEY,
  FINANCIAL_ADJUSTMENTS_STORAGE_KEY,
  PAYABLES_STORAGE_KEY,
  SALES_STORAGE_KEY,
} from "@/lib/storage-keys";

type AlertTone = "support" | "alert" | "risk" | "primary";

type CashMovement = {
  day: number;
  date: Date;
  title: string;
  category: string;
  type: "entrada" | "saida";
  amount: number;
  status?: string;
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getDayDifference(from: Date, dateValue: string) {
  const start = new Date(from.toISOString().slice(0, 10));
  const target = new Date(`${dateValue}T00:00:00`);

  return Math.ceil((target.getTime() - start.getTime()) / 86400000);
}

function buildMovements(
  profile: BusinessProfile,
  today: Date,
  adjustments?: FinancialAdjustments | null,
  sales: Sale[] = [],
  payables: Payable[] = [],
) {
  const dre = calculateDre(profile, adjustments, sales, payables);
  const { businessType, directCost, fixedExpenses, revenue, taxes } = dre;
  const payroll = calculatePayrollEstimate(revenue, profile.employees);
  const initialBalance = adjustments?.cashBalance ?? revenue * 0.28;

  const movements: CashMovement[] = [
    {
      day: 2,
      date: addDays(today, 2),
      title: "Recebimentos previstos",
      category: "Entradas previstas",
      type: "entrada",
      amount: revenue * 0.28,
    },
    {
      day: 5,
      date: addDays(today, 5),
      title: "Fornecedores",
      category: "Fornecedores",
      type: "saida",
      amount: directCost * 0.38,
    },
    {
      day: 8,
      date: addDays(today, 8),
      title: "Recebimentos recorrentes",
      category: "Entradas previstas",
      type: "entrada",
      amount: revenue * 0.22,
    },
    {
      day: 10,
      date: addDays(today, 10),
      title: "Despesas fixas",
      category: "Despesas fixas",
      type: "saida",
      amount: fixedExpenses * 0.55,
    },
    {
      day: 14,
      date: addDays(today, 14),
      title: "Impostos",
      category: "Impostos",
      type: "saida",
      amount: taxes,
    },
    {
      day: 18,
      date: addDays(today, 18),
      title: "Vendas a receber",
      category: "Entradas previstas",
      type: "entrada",
      amount: revenue * 0.3,
    },
    {
      day: 21,
      date: addDays(today, 21),
      title: "Fornecedores finais",
      category: "Fornecedores",
      type: "saida",
      amount: directCost * 0.42,
    },
    {
      day: 24,
      date: addDays(today, 24),
      title: "Despesas operacionais",
      category: "Despesas fixas",
      type: "saida",
      amount: fixedExpenses * 0.45,
    },
    {
      day: 28,
      date: addDays(today, 28),
      title: "Entradas finais",
      category: "Entradas previstas",
      type: "entrada",
      amount: revenue * 0.2,
    },
  ];

  if (payroll > 0) {
    movements.splice(5, 0, {
      day: 16,
      date: addDays(today, 16),
      title: "Folha de pagamento",
      category: "Folha",
      type: "saida",
      amount: payroll,
    });
  }

  payables
    .filter((payable) => payable.status !== "cancelado")
    .forEach((payable) => {
      const isPaid = payable.status === "pago";
      const dateValue = isPaid ? payable.paymentDate ?? payable.dueDate : payable.dueDate;
      const day = getDayDifference(today, dateValue);

      if (isPaid && day < -7) {
        return;
      }

      if (!isPaid && (day < 0 || day > 30)) {
        return;
      }

      movements.push({
        day: isPaid ? Math.max(day, 0) : Math.max(day, 1),
        date: new Date(`${dateValue}T00:00:00`),
        title: payable.description,
        category: `${payable.dreCategory}${isPaid ? " | pago" : ""}`,
        type: "saida",
        amount: payable.amount,
        status: payable.status,
      });
    });

  return {
    businessType,
    revenue,
    initialBalance,
    dataSourceLabel: adjustments
      ? "Numeros ajustados por voce"
      : "Estimativa inicial",
    movements: movements.sort((a, b) => a.day - b.day),
  };
}

function buildCashProjection(
  profile: BusinessProfile,
  adjustments?: FinancialAdjustments | null,
  sales: Sale[] = [],
  payables: Payable[] = [],
) {
  const today = new Date();
  const base = buildMovements(profile, today, adjustments, sales, payables);
  let balance = base.initialBalance;
  let minimumBalance = balance;
  let negativeDate: Date | null = null;
  const balancesByDay = new Map<number, number>();

  for (let day = 1; day <= 30; day += 1) {
    const dayMovements = base.movements.filter((movement) => movement.day === day);

    dayMovements.forEach((movement) => {
      balance += movement.type === "entrada" ? movement.amount : -movement.amount;
    });

    balancesByDay.set(day, balance);

    if (balance < minimumBalance) {
      minimumBalance = balance;
    }

    if (balance < 0 && !negativeDate) {
      negativeDate = addDays(today, day);
    }
  }

  const projected7 = balancesByDay.get(7) ?? balance;
  const projected15 = balancesByDay.get(15) ?? balance;
  const projected30 = balancesByDay.get(30) ?? balance;
  const lowCashLimit = base.revenue * 0.1;

  let alert = {
    title: "Caixa saudavel",
    description: `Seu caixa esta saudavel: saldo projetado de ${formatCurrency(
      projected30,
    )} em 30 dias.`,
    tone: "primary" as AlertTone,
  };
  const overduePayables = payables.filter(
    (payable) => payable.status !== "cancelado" &&
      payable.status !== "pago" &&
      payable.dueDate < today.toISOString().slice(0, 10),
  );
  const overdueTotal = overduePayables.reduce(
    (total, payable) => total + payable.amount,
    0,
  );

  if (overdueTotal > 0) {
    alert = {
      title: "Contas atrasadas",
      description: `Ha ${formatCurrency(
        overdueTotal,
      )} em contas vencidas. Regularize ou renegocie antes de assumir novas saidas.`,
      tone: "risk",
    };
  } else if (projected30 < 0 || negativeDate) {
    alert = {
      title: "Risco financeiro: caixa negativo",
      description: negativeDate
        ? `Voce pode ficar sem caixa no dia ${formatShortDate(
            negativeDate,
          )}. O menor saldo previsto e ${formatCurrency(minimumBalance)}.`
        : `Seu saldo projetado fica negativo e pode chegar a ${formatCurrency(
            minimumBalance,
          )} nos proximos 30 dias.`,
      tone: "risk",
    };
  } else if (projected30 < lowCashLimit || minimumBalance < lowCashLimit) {
    alert = {
      title: "Atencao: caixa apertado",
      description: `Seu menor saldo previsto e ${formatCurrency(
        minimumBalance,
      )}, abaixo de 10% da receita mensal. Evite novas saidas antes de confirmar entradas.`,
      tone: "alert",
    };
  }

  return {
    ...base,
    projected7,
    projected15,
    projected30,
    minimumBalance,
    negativeDate,
    lowCashLimit,
    alert,
    overduePayables,
  };
}

function readSales() {
  const storedSales = localStorage.getItem(SALES_STORAGE_KEY);

  if (!storedSales) {
    return [];
  }

  try {
    return JSON.parse(storedSales) as Sale[];
  } catch {
    return [];
  }
}

function readFinancialAdjustments() {
  const storedAdjustments = localStorage.getItem(FINANCIAL_ADJUSTMENTS_STORAGE_KEY);

  if (!storedAdjustments) {
    return null;
  }

  try {
    return JSON.parse(storedAdjustments) as FinancialAdjustments;
  } catch {
    return null;
  }
}

function readPayables() {
  const storedPayables = localStorage.getItem(PAYABLES_STORAGE_KEY);

  if (!storedPayables) {
    return [];
  }

  try {
    return JSON.parse(storedPayables) as Payable[];
  } catch {
    return [];
  }
}

export default function FluxoDeCaixaPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [adjustments, setAdjustments] = useState<FinancialAdjustments | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

  useEffect(() => {
    const storedProfile = localStorage.getItem(BUSINESS_PROFILE_STORAGE_KEY);

    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile) as BusinessProfile);
      } catch {
        setProfile(null);
      }
    }

    setAdjustments(readFinancialAdjustments());
    setSales(readSales());
    setPayables(readPayables());
    setHasLoadedProfile(true);
  }, []);

  const projection = useMemo(
    () => (profile ? buildCashProjection(profile, adjustments, sales, payables) : null),
    [profile, adjustments, sales, payables],
  );

  if (!hasLoadedProfile) {
    return (
      <PageShell
        eyebrow="Fluxo de caixa"
        title="Carregando"
        description="Preparando sua previsao de caixa."
      >
        <div className="rounded-2xl border border-norteia-line bg-norteia-card p-5 text-sm text-norteia-muted shadow-soft">
          Buscando dados do onboarding...
        </div>
      </PageShell>
    );
  }

  if (!profile || !projection) {
    return (
      <PageShell
        eyebrow="Fluxo de caixa"
        title="Complete seu perfil"
        description="A previsao de caixa usa as respostas iniciais do onboarding."
      >
        <AlertCard
          title="Perfil nao encontrado"
          description="Responda o onboarding para gerar uma previsao simples de caixa."
          tone="alert"
        />
        <ActionButton href="/onboarding">Ir para onboarding</ActionButton>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Fluxo de caixa"
      title="Previsao de 30 dias"
      description={`Entrada, saida e saldo para um negocio de ${projection.businessType}.`}
    >
      <AlertCard
        title={projection.dataSourceLabel}
        description={
          adjustments
            ? "A previsao usa o saldo de caixa e os numeros ajustados por voce."
            : "Esses numeros sao estimativas iniciais. Ajuste no dashboard para refletir sua realidade."
        }
        tone="support"
      />

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Saldo hoje"
          value={formatCurrency(projection.initialBalance)}
          hint={projection.dataSourceLabel}
        />
        <MetricCard
          label="Saldo em 30 dias"
          value={formatCurrency(projection.projected30)}
          hint="Saldo projetado"
          tone={
            projection.projected30 < 0
              ? "risk"
              : projection.projected30 < projection.lowCashLimit
                ? "alert"
                : "support"
          }
        />
        <MetricCard
          label="Menor saldo"
          value={formatCurrency(projection.minimumBalance)}
          hint="Ponto mais apertado"
          tone={projection.minimumBalance < 0 ? "risk" : "alert"}
        />
        <MetricCard
          label="Receita base"
          value={formatCurrency(projection.revenue)}
          hint={projection.dataSourceLabel}
          tone="support"
        />
      </div>

      <AlertCard
        title={projection.alert.title}
        description={projection.alert.description}
        tone={projection.alert.tone}
      />

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
          Visao por periodo
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            ["7 dias", projection.projected7],
            ["15 dias", projection.projected15],
            ["30 dias", projection.projected30],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-norteia-line bg-norteia-card-2 p-3"
            >
              <p className="text-xs font-bold text-norteia-muted">{label}</p>
              <strong className="mt-2 block text-sm font-bold text-norteia-text">
                {formatCurrency(Number(value))}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
          Proximas movimentacoes
        </p>

        <div className="mt-4 space-y-3">
          {projection.movements.map((movement) => (
            <div
              key={`${movement.day}-${movement.title}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-norteia-line pb-3 last:border-b-0 last:pb-0"
            >
              <div className="rounded-xl bg-norteia-card-2 px-3 py-2 text-center">
                <p className="text-xs font-bold text-norteia-muted">
                  {formatShortDate(movement.date)}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-norteia-text">
                  {movement.title}
                </p>
                <p className="mt-1 text-xs text-norteia-muted">
                  {movement.category}
                </p>
              </div>
              <strong
                className={`text-right text-sm font-bold ${
                  movement.type === "entrada"
                    ? "text-norteia-primary"
                    : "text-norteia-risk"
                }`}
              >
                {movement.type === "entrada" ? "+" : "-"}
                {formatCurrency(movement.amount)}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
