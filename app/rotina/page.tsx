"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { AlertCard } from "@/components/alert-card";
import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import {
  BusinessProfile,
  FinancialAdjustments,
  calculateDre,
  calculatePayrollEstimate,
} from "@/lib/financial-calculations";
import { formatCurrency } from "@/lib/formatters";
import {
  BUSINESS_PROFILE_STORAGE_KEY,
  FINANCIAL_ADJUSTMENTS_STORAGE_KEY,
  WEEKLY_ROUTINE_STORAGE_KEY,
} from "@/lib/storage-keys";

type RoutineItem = {
  id: string;
  label: string;
  completed: boolean;
};

const routineTemplate: RoutineItem[] = [
  {
    id: "weeklyRevenue",
    label: "Atualizar faturamento da semana",
    completed: false,
  },
  {
    id: "mainCosts",
    label: "Atualizar custos principais",
    completed: false,
  },
  {
    id: "cashBalance",
    label: "Conferir saldo de caixa",
    completed: false,
  },
  {
    id: "fixedExpenses",
    label: "Revisar despesas fixas",
    completed: false,
  },
  {
    id: "strategicAlerts",
    label: "Ver alertas estrategicos",
    completed: false,
  },
  {
    id: "scenarioSimulation",
    label: "Rodar simulacao de cenario",
    completed: false,
  },
];

function loadStoredRoutine() {
  const storedRoutine = localStorage.getItem(WEEKLY_ROUTINE_STORAGE_KEY);

  if (!storedRoutine) {
    return routineTemplate;
  }

  try {
    const parsedRoutine = JSON.parse(storedRoutine) as RoutineItem[];

    return routineTemplate.map((templateItem) => {
      const storedItem = parsedRoutine.find((item) => item.id === templateItem.id);

      return {
        ...templateItem,
        completed: storedItem?.completed ?? false,
      };
    });
  } catch {
    return routineTemplate;
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

function buildWeeklyObligations(
  profile: BusinessProfile,
  adjustments?: FinancialAdjustments | null,
) {
  const dre = calculateDre(profile, adjustments);
  const weeklyRevenue = dre.revenue / 4;
  const obligations = [
    {
      label: "Impostos",
      value: weeklyRevenue * dre.rules.taxes,
    },
    {
      label: "Fornecedores",
      value: weeklyRevenue * dre.rules.directCost,
    },
    {
      label: "Despesas fixas",
      value: weeklyRevenue * dre.rules.fixedExpenses,
    },
  ];

  const payroll = calculatePayrollEstimate(dre.revenue, profile.employees);

  if (payroll > 0) {
    obligations.splice(1, 0, {
      label: "Folha",
      value: payroll / 4,
    });
  }

  return {
    businessType: dre.businessType,
    dataSourceLabel: adjustments
      ? "Numeros ajustados por voce"
      : "Estimativa inicial",
    weeklyRevenue,
    obligations,
  };
}

function getWeeklyInsight(progressPercent: number, weeklyRevenue: number) {
  if (progressPercent <= 30) {
    return `Voce ainda esta sem rotina de gestao. Comece pelo faturamento: acompanhe os ${formatCurrency(
      weeklyRevenue,
    )} estimados da semana.`;
  }

  if (progressPercent <= 70) {
    return "Boa evolucao. Agora complete os pontos que mexem direto no caixa: custos, saldo e despesas fixas.";
  }

  return "Excelente. Voce esta criando uma rotina de empresario que protege lucro e decide com dados.";
}

export default function RotinaPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [adjustments, setAdjustments] = useState<FinancialAdjustments | null>(null);
  const [routine, setRoutine] = useState<RoutineItem[]>(routineTemplate);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useEffect(() => {
    const storedProfile = localStorage.getItem(BUSINESS_PROFILE_STORAGE_KEY);

    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile) as BusinessProfile);
      } catch {
        setProfile(null);
      }
    }

    setRoutine(loadStoredRoutine());
    setAdjustments(readFinancialAdjustments());
    setHasLoadedData(true);
  }, []);

  const completedCount = routine.filter((item) => item.completed).length;
  const progressPercent = Math.round((completedCount / routine.length) * 100);
  const nextPendingItem = routine.find((item) => !item.completed);
  const nextBestAction = nextPendingItem
    ? `Proxima melhor acao: ${nextPendingItem.label}.`
    : "Proxima melhor acao: rode uma simulacao ou revise o dashboard.";
  const weeklyPlan = useMemo(
    () => (profile ? buildWeeklyObligations(profile, adjustments) : null),
    [profile, adjustments],
  );
  const weeklyInsight = getWeeklyInsight(
    progressPercent,
    weeklyPlan?.weeklyRevenue ?? 0,
  );

  function toggleRoutineItem(itemId: string) {
    setRoutine((currentRoutine) => {
      const nextRoutine = currentRoutine.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: !item.completed,
            }
          : item,
      );

      localStorage.setItem(WEEKLY_ROUTINE_STORAGE_KEY, JSON.stringify(nextRoutine));
      return nextRoutine;
    });
  }

  if (!hasLoadedData) {
    return (
      <PageShell
        eyebrow="Rotina"
        title="Carregando"
        description="Preparando sua rotina semanal."
      >
        <div className="rounded-2xl border border-norteia-line bg-norteia-card p-5 text-sm text-norteia-muted shadow-soft">
          Buscando dados do onboarding...
        </div>
      </PageShell>
    );
  }

  if (!profile || !weeklyPlan) {
    return (
      <PageShell
        eyebrow="Rotina"
        title="Complete seu perfil"
        description="A rotina semanal usa as respostas iniciais do onboarding."
      >
        <AlertCard
          title="Perfil nao encontrado"
          description="Responda o onboarding para criar sua rotina semanal no Norteia."
          tone="alert"
        />
        <ActionButton href="/onboarding">Ir para onboarding</ActionButton>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Rotina"
      title="Ritmo semanal"
      description={`Rotina para proteger o dinheiro de um negocio de ${weeklyPlan.businessType}.`}
    >
      <AlertCard
        title={weeklyPlan.dataSourceLabel}
        description={
          adjustments
            ? "A rotina usa os numeros ajustados por voce para estimar as obrigacoes da semana."
            : "Esses numeros sao estimativas iniciais. Ajuste no dashboard para refletir sua realidade."
        }
        tone="support"
      />

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Concluido"
          value={`${completedCount}/${routine.length}`}
          hint="Itens da semana"
        />
        <MetricCard
          label="Progresso"
          value={`${progressPercent}%`}
          hint="Rotina atual"
          tone={progressPercent > 70 ? "support" : "alert"}
        />
      </div>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
            <span>Checklist semanal</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-norteia-card-2">
            <div
              className="h-full rounded-full bg-norteia-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {routine.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleRoutineItem(item.id)}
              className={`grid w-full grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border p-4 text-left transition ${
                item.completed
                  ? "border-norteia-primary/45 bg-norteia-primary/10"
                  : "border-norteia-line bg-norteia-card-2"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
                  item.completed
                    ? "border-norteia-primary bg-norteia-primary text-norteia-bg"
                    : "border-norteia-line text-transparent"
                }`}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <span
                className={`text-sm font-bold ${
                  item.completed ? "text-norteia-primary" : "text-norteia-text"
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
          Obrigacoes da semana
        </p>

        <div className="mt-4 space-y-3">
          {weeklyPlan.obligations.map((obligation) => (
            <div
              key={obligation.label}
              className="flex items-center justify-between gap-4 border-b border-norteia-line pb-3 last:border-b-0 last:pb-0"
            >
              <span className="text-sm text-norteia-muted">
                {obligation.label}
              </span>
              <strong className="text-right text-sm font-bold text-norteia-text">
                {formatCurrency(obligation.value)}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <AlertCard
        title="Insight semanal"
        description={weeklyInsight}
        tone={progressPercent > 70 ? "primary" : progressPercent > 30 ? "support" : "alert"}
      />

      <section className="rounded-2xl border border-norteia-primary/35 bg-norteia-primary/10 p-5 shadow-glow">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
          Proxima melhor acao
        </p>
        <p className="mt-3 text-base font-bold leading-7 text-norteia-text">
          {nextBestAction}
        </p>
      </section>
    </PageShell>
  );
}
