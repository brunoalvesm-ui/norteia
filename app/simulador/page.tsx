"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { AlertCard } from "@/components/alert-card";
import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import {
  BusinessProfile,
  FinancialAdjustments,
  Sale,
  calculateDre,
  calculateMargin,
} from "@/lib/financial-calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import {
  BUSINESS_PROFILE_STORAGE_KEY,
  FINANCIAL_ADJUSTMENTS_STORAGE_KEY,
  SALES_STORAGE_KEY,
} from "@/lib/storage-keys";

type SimulationMode = "price" | "cost" | "revenue";
type AlertTone = "support" | "alert" | "risk" | "primary";

const simulationModes: Array<{
  id: SimulationMode;
  label: string;
  max: number;
  description: string;
}> = [
  {
    id: "price",
    label: "Aumentar preco",
    max: 30,
    description: "Simule o impacto de reajustar seus precos mantendo a base atual.",
  },
  {
    id: "cost",
    label: "Reduzir custo",
    max: 20,
    description: "Veja quanto lucro pode ser liberado ao reduzir custos diretos.",
  },
  {
    id: "revenue",
    label: "Aumentar faturamento",
    max: 50,
    description: "Projete crescimento com custos e impostos proporcionais.",
  },
];

function buildCurrentScenario(
  profile: BusinessProfile,
  adjustments?: FinancialAdjustments | null,
  sales: Sale[] = [],
) {
  const dre = calculateDre(profile, adjustments, sales);

  return {
    businessType: dre.businessType,
    revenue: dre.revenue,
    directCost: dre.directCost,
    fixedExpenses: dre.fixedExpenses,
    taxes: dre.taxes,
    profit: dre.profit,
    margin: dre.netMargin,
    rules: dre.rules,
    dataSourceLabel: adjustments
      ? "Numeros ajustados por voce"
      : "Estimativa inicial",
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

function buildSimulatedScenario(
  current: ReturnType<typeof buildCurrentScenario>,
  mode: SimulationMode,
  percentage: number,
) {
  const rate = percentage / 100;

  if (mode === "price") {
    const revenue = current.revenue * (1 + rate);
    const profit = revenue - current.directCost - current.fixedExpenses - current.taxes;

    return {
      revenue,
      directCost: current.directCost,
      fixedExpenses: current.fixedExpenses,
      taxes: current.taxes,
      profit,
      margin: calculateMargin(profit, revenue),
      insight: `Com aumento de ${percentage}% no preco, seu lucro pode subir ${formatCurrency(
        profit - current.profit,
      )}/mes e chegar a ${formatCurrency(profit)}/mes.`,
    };
  }

  if (mode === "cost") {
    const directCost = current.directCost * (1 - rate);
    const profit = current.revenue - directCost - current.fixedExpenses - current.taxes;

    return {
      revenue: current.revenue,
      directCost,
      fixedExpenses: current.fixedExpenses,
      taxes: current.taxes,
      profit,
      margin: calculateMargin(profit, current.revenue),
      insight: `Reduzir custos em ${percentage}% pode liberar ${formatCurrency(
        current.directCost - directCost,
      )}/mes de lucro. Seu custo direto cairia para ${formatCurrency(directCost)}/mes.`,
    };
  }

  const revenue = current.revenue * (1 + rate);
  const directCost = revenue * current.rules.directCost;
  const taxes = revenue * current.rules.taxes;
  const profit = revenue - directCost - current.fixedExpenses - taxes;

  return {
    revenue,
    directCost,
    fixedExpenses: current.fixedExpenses,
    taxes,
    profit,
    margin: calculateMargin(profit, revenue),
    insight: `Se seu faturamento crescer ${percentage}%, seu lucro estimado pode chegar a ${formatCurrency(
      profit,
    )}/mes, contra ${formatCurrency(current.profit)}/mes hoje.`,
  };
}

function buildStrategicAlert(
  mode: SimulationMode,
  percentage: number,
  currentMargin: number,
) {
  if (mode === "cost" && percentage > 10) {
    return {
      title: "Reducao exige plano",
      description:
        "Atencao: reduzir custos acima de 10% mexe no dinheiro do mes, mas precisa de plano para nao afetar entrega e qualidade.",
      tone: "alert" as AlertTone,
    };
  }

  if (mode === "revenue" && currentMargin < 0.1) {
    return {
      title: "Crescer sem margem cobra caro",
      description:
        "Risco financeiro: vender mais com margem baixa pode aumentar trabalho sem sobrar dinheiro. Antes, revise preco e custo.",
      tone: "risk" as AlertTone,
    };
  }

  if (percentage <= 5) {
    return {
      title: "Cenario conservador",
      description: "Oportunidade segura: pequeno ajuste para testar ganho de lucro sem grande atrito.",
      tone: "support" as AlertTone,
    };
  }

  if (percentage <= 12) {
    return {
      title: "Cenario viavel",
      description: "Oportunidade viavel: ganho relevante, ainda plausivel para executar este mes.",
      tone: "primary" as AlertTone,
    };
  }

  return {
    title: "Cenario arrojado",
    description: "Atencao: impacto alto. Use como meta financeira, mas divida em etapas menores.",
    tone: "alert" as AlertTone,
  };
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

export default function SimuladorPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [adjustments, setAdjustments] = useState<FinancialAdjustments | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [mode, setMode] = useState<SimulationMode>("price");
  const [percentage, setPercentage] = useState(10);

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
    setHasLoadedProfile(true);
  }, []);

  const activeMode = simulationModes.find((item) => item.id === mode) ?? simulationModes[0];
  const current = useMemo(
    () => (profile ? buildCurrentScenario(profile, adjustments, sales) : null),
    [profile, adjustments, sales],
  );
  const simulated = useMemo(
    () => (current ? buildSimulatedScenario(current, mode, percentage) : null),
    [current, mode, percentage],
  );
  const strategicAlert = useMemo(
    () =>
      current
        ? buildStrategicAlert(mode, percentage, current.margin)
        : null,
    [current, mode, percentage],
  );

  function selectMode(nextMode: SimulationMode) {
    setMode(nextMode);
    setPercentage(nextMode === "revenue" ? 20 : 10);
  }

  if (!hasLoadedProfile) {
    return (
      <PageShell
        eyebrow="Simulador"
        title="Carregando"
        description="Preparando a base do simulador."
      >
        <div className="rounded-2xl border border-norteia-line bg-norteia-card p-5 text-sm text-norteia-muted shadow-soft">
          Buscando dados do onboarding...
        </div>
      </PageShell>
    );
  }

  if (!profile || !current || !simulated || !strategicAlert) {
    return (
      <PageShell
        eyebrow="Simulador"
        title="Complete seu perfil"
        description="O simulador usa as respostas do onboarding para montar cenarios."
      >
        <AlertCard
          title="Perfil nao encontrado"
          description="Responda o onboarding para liberar simulacoes personalizadas."
          tone="alert"
        />
        <ActionButton href="/onboarding">Ir para onboarding</ActionButton>
      </PageShell>
    );
  }

  const profitDifference = simulated.profit - current.profit;
  const marginDifference = simulated.margin - current.margin;

  return (
    <PageShell
      eyebrow="Simulador"
      title="Teste decisoes antes de agir"
      description={`Cenarios em dinheiro para um negocio de ${current.businessType}.`}
    >
      <AlertCard
        title={current.dataSourceLabel}
        description={
          adjustments
            ? "As simulacoes usam os numeros ajustados por voce no dashboard."
            : "Esses numeros sao estimativas iniciais. Ajuste no dashboard para refletir sua realidade."
        }
        tone="support"
      />

      <div className="grid gap-2 rounded-2xl border border-norteia-line bg-norteia-card p-2 shadow-soft">
        {simulationModes.map((item) => {
          const isActive = item.id === mode;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectMode(item.id)}
              className={`rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                isActive
                  ? "bg-norteia-primary text-norteia-bg shadow-glow"
                  : "bg-norteia-card-2 text-norteia-muted hover:text-norteia-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
              {activeMode.label}
            </p>
            <h2 className="mt-2 font-title text-xl font-bold text-norteia-text">
              {percentage}%
            </h2>
          </div>
          <p className="max-w-40 text-right text-xs leading-5 text-norteia-muted">
            {activeMode.description}
          </p>
        </div>

        <input
          type="range"
          min={0}
          max={activeMode.max}
          value={percentage}
          onChange={(event) => setPercentage(Number(event.target.value))}
          className="mt-6 h-2 w-full accent-norteia-primary"
        />

        <div className="mt-3 flex items-center justify-between text-xs font-bold text-norteia-muted">
          <span>0%</span>
          <span>{activeMode.max}%</span>
        </div>
      </section>

      <AlertCard
        title="Insight"
        description={simulated.insight}
        tone="primary"
      />

      <AlertCard
        title={strategicAlert.title}
        description={strategicAlert.description}
        tone={strategicAlert.tone}
      />

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Lucro atual"
          value={formatCurrency(current.profit)}
          hint={`${formatPercent(current.margin)}% de margem`}
        />
        <MetricCard
          label="Lucro simulado"
          value={formatCurrency(simulated.profit)}
          hint={`${formatPercent(simulated.margin)}% de margem`}
          tone={simulated.profit >= current.profit ? "support" : "risk"}
        />
        <MetricCard
          label="Diferenca"
          value={formatCurrency(profitDifference)}
          hint="Impacto mensal estimado"
          tone={profitDifference >= 0 ? "primary" : "risk"}
        />
        <MetricCard
          label="Margem"
          value={`${formatPercent(marginDifference)} p.p.`}
          hint="Variacao estimada"
          tone={marginDifference >= 0 ? "support" : "risk"}
        />
      </div>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
          Cenario atual vs simulado
        </p>

        <div className="mt-4 space-y-3">
          {[
            ["Receita", current.revenue, simulated.revenue],
            ["Custo direto", current.directCost, simulated.directCost],
            ["Despesas fixas", current.fixedExpenses, simulated.fixedExpenses],
            ["Impostos", current.taxes, simulated.taxes],
            ["Lucro", current.profit, simulated.profit],
          ].map(([label, currentValue, simulatedValue]) => (
            <div
              key={String(label)}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-norteia-line pb-3 text-sm last:border-b-0 last:pb-0"
            >
              <span className="text-norteia-muted">{label}</span>
              <strong className="text-right text-norteia-text">
                {formatCurrency(Number(currentValue))}
              </strong>
              <strong className="text-right text-norteia-primary">
                {formatCurrency(Number(simulatedValue))}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
