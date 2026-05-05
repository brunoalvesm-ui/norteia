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
  normalizeText,
} from "@/lib/financial-calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import {
  BUSINESS_PROFILE_STORAGE_KEY,
  FINANCIAL_ADJUSTMENTS_STORAGE_KEY,
  SALES_STORAGE_KEY,
} from "@/lib/storage-keys";

type AlertTone = "support" | "alert" | "risk" | "primary";
type OpportunityTone = "primary" | "alert" | "risk";

function knowsNothing(value?: string) {
  return normalizeText(value) === "nao sei";
}

function buildDashboard(
  profile: BusinessProfile,
  adjustments?: FinancialAdjustments | null,
  sales: Sale[] = [],
) {
  const dre = calculateDre(profile, adjustments, sales);
  const hasHighCost = dre.directCostPercent > dre.rules.idealDirectCost;
  const hasLowMargin = dre.netMargin < 0.1;
  const targetMargin = 0.15;
  const costGain = dre.missedMoney;
  const marginGain = Math.max(dre.revenue * targetMargin - dre.profit, 0);
  const priceGain = dre.netMargin < targetMargin ? dre.revenue * 0.05 : 0;
  const bestOpportunity = Math.max(costGain, marginGain, priceGain);
  const opportunityTone: OpportunityTone = hasLowMargin
    ? "risk"
    : hasHighCost
      ? "alert"
      : "primary";
  const opportunityAction = hasHighCost
    ? "Comece revisando seus 3 maiores custos."
    : hasLowMargin
      ? "Revise preco, custo e despesas fixas."
      : "Agora o foco e manter rotina e previsibilidade de caixa.";
  const dataSourceLabel = adjustments
    ? "Numeros ajustados por voce"
    : "Estimativa inicial";

  const alerts: Array<{
    title: string;
    description: string;
    tone: AlertTone;
  }> = [];

  if (hasLowMargin) {
    alerts.push({
      title: "Risco financeiro: lucro baixo",
      description: `Seu lucro mensal e de ${formatCurrency(
        dre.profit,
      )}/mes, uma margem de ${formatPercent(
        dre.netMargin,
      )}. Esse numero precisa subir para o negocio respirar melhor.`,
      tone: "risk",
    });
  }

  if (hasHighCost) {
    alerts.push({
      title: "Atencao: custo consumindo caixa",
      description: `Seu custo direto esta consumindo ${formatCurrency(
        dre.directCost,
      )}/mes, ou ${formatPercent(
        dre.directCostPercent,
      )} da receita. Se reduzir para o nivel ideal, pode liberar ${formatCurrency(
        dre.missedMoney,
      )}/mes de lucro.`,
      tone:
        dre.directCostPercent - dre.rules.idealDirectCost > 0.08
          ? "risk"
          : "alert",
    });
  }

  if (knowsNothing(profile.knowsProfit)) {
    alerts.push({
      title: "Educacao: lucro real ainda incerto",
      description: `Hoje o Norteia calcula ${formatCurrency(
        dre.profit,
      )}/mes de lucro. Ajuste seus numeros para confirmar se esse dinheiro realmente sobra no caixa.`,
      tone: "support",
    });
  }

  if (knowsNothing(profile.knowsMainCost)) {
    alerts.push({
      title: "Educacao: custo principal precisa aparecer",
      description: `O custo direto atual e ${formatCurrency(
        dre.directCost,
      )}/mes. Mapear esse valor mostra onde voce pode parar de perder margem.`,
      tone: "support",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Cenario saudavel",
      description: `Seu lucro mensal e ${formatCurrency(
        dre.profit,
      )}/mes, com margem de ${formatPercent(
        dre.netMargin,
      )}. Agora o foco e proteger esse resultado com previsibilidade de caixa.`,
      tone: "primary",
    });
  }

  const nextAction = hasHighCost
    ? `Mapeie seus principais custos. Ha ${formatCurrency(
        dre.missedMoney,
      )}/mes em possivel lucro para recuperar.`
    : hasLowMargin
      ? `Revise precos e despesas fixas. Seu lucro mensal esta em ${formatCurrency(
          dre.profit,
        )}.`
      : `Agora o foco e previsibilidade de caixa para proteger ${formatCurrency(
          dre.profit,
        )}/mes de lucro.`;

  return {
    ...dre,
    alerts,
    dataSourceLabel,
    nextAction,
    opportunity: {
      bestOpportunity,
      costGain,
      marginGain,
      priceGain,
      targetMargin,
      tone: opportunityTone,
      action: opportunityAction,
    },
  };
}

function createAdjustmentValues(
  profile: BusinessProfile,
  adjustments?: FinancialAdjustments | null,
) {
  const dre = calculateDre(profile, adjustments);

  return {
    revenue: Math.round(dre.revenue),
    directCost: Math.round(dre.directCost),
    fixedExpenses: Math.round(dre.fixedExpenses),
    taxes: Math.round(dre.taxes),
    cashBalance: Math.round(adjustments?.cashBalance ?? dre.revenue * 0.28),
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

export default function DashboardPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [adjustments, setAdjustments] = useState<FinancialAdjustments | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [formValues, setFormValues] = useState<Omit<FinancialAdjustments, "updatedAt"> | null>(
    null,
  );
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [isAdjustPanelOpen, setIsAdjustPanelOpen] = useState(false);

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

  const dashboard = useMemo(
    () => (profile ? buildDashboard(profile, adjustments, sales) : null),
    [profile, adjustments, sales],
  );

  function openAdjustPanel() {
    if (!profile) {
      return;
    }

    setFormValues(createAdjustmentValues(profile, adjustments));
    setIsAdjustPanelOpen(true);
  }

  function updateFormValue(field: keyof Omit<FinancialAdjustments, "updatedAt">, value: string) {
    setFormValues((currentValues) => {
      if (!currentValues) {
        return currentValues;
      }

      return {
        ...currentValues,
        [field]: Number(value),
      };
    });
  }

  function saveAdjustments() {
    if (!formValues) {
      return;
    }

    const nextAdjustments = {
      ...formValues,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      FINANCIAL_ADJUSTMENTS_STORAGE_KEY,
      JSON.stringify(nextAdjustments),
    );
    setAdjustments(nextAdjustments);
    setIsAdjustPanelOpen(false);
  }

  if (!hasLoadedProfile) {
    return (
      <PageShell
        eyebrow="Dashboard"
        title="Carregando"
        description="Preparando seu diagnostico inicial."
      >
        <div className="rounded-2xl border border-norteia-line bg-norteia-card p-5 text-sm text-norteia-muted shadow-soft">
          Buscando dados do onboarding...
        </div>
      </PageShell>
    );
  }

  if (!profile || !dashboard) {
    return (
      <PageShell
        eyebrow="Dashboard"
        title="Complete seu perfil"
        description="O dashboard dinamico depende das respostas iniciais do onboarding."
      >
        <AlertCard
          title="Perfil nao encontrado"
          description="Responda o onboarding para gerar seu primeiro diagnostico financeiro."
          tone="alert"
        />
        <ActionButton href="/onboarding">Ir para onboarding</ActionButton>
      </PageShell>
    );
  }

  const dreRows: Array<[string, number]> = [
    ["Receita mensal", dashboard.revenue],
    ["Custo direto", -dashboard.directCost],
    ["Despesas fixas", -dashboard.fixedExpenses],
    ["Impostos", -dashboard.taxes],
    ["Lucro mensal", dashboard.profit],
  ];
  const opportunityStyles: Record<OpportunityTone, string> = {
    primary:
      "border-norteia-primary/35 bg-norteia-primary/10 text-norteia-primary",
    alert: "border-norteia-alert/35 bg-norteia-alert/10 text-norteia-alert",
    risk: "border-norteia-risk/35 bg-norteia-risk/10 text-norteia-risk",
  };

  return (
    <PageShell
      eyebrow="Dashboard"
      title={`Visao inicial: ${dashboard.businessType}`}
      description="Estimativas geradas a partir do perfil salvo no onboarding."
    >
      <button
        type="button"
        onClick={openAdjustPanel}
        className="inline-flex h-12 items-center justify-center rounded-2xl bg-norteia-primary px-5 text-sm font-bold text-norteia-bg shadow-glow transition"
      >
        Ajustar meus numeros
      </button>

      {isAdjustPanelOpen && formValues ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-norteia-bg/78 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:justify-center">
          <section className="w-full max-w-md rounded-3xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
                Ajustes financeiros
              </p>
              <h2 className="mt-2 font-title text-2xl font-bold text-norteia-text">
                Ajustar meus numeros
              </h2>
              <p className="mt-2 text-sm leading-6 text-norteia-muted">
                Informe os valores mensais que representam melhor o momento atual.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                ["revenue", "Faturamento mensal"],
                ["directCost", "Custo direto / custo principal"],
                ["fixedExpenses", "Despesas fixas"],
                ["taxes", "Impostos"],
                ["cashBalance", "Saldo de caixa atual"],
              ].map(([field, label]) => (
                <label key={field} className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-norteia-muted">
                    {label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={formValues[field as keyof typeof formValues]}
                    onChange={(event) =>
                      updateFormValue(
                        field as keyof Omit<FinancialAdjustments, "updatedAt">,
                        event.target.value,
                      )
                    }
                    className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none transition focus:border-norteia-primary"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-[0.8fr_1.2fr] gap-3">
              <button
                type="button"
                onClick={() => setIsAdjustPanelOpen(false)}
                className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveAdjustments}
                className="h-12 rounded-2xl bg-norteia-primary px-4 text-sm font-bold text-norteia-bg shadow-glow transition"
              >
                Salvar ajustes
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Receita"
          value={formatCurrency(dashboard.revenue)}
          hint={dashboard.dataSourceLabel}
        />
        <MetricCard
          label="Lucro"
          value={formatCurrency(dashboard.profit)}
          hint={`${formatPercent(dashboard.netMargin)}% de margem liquida`}
          tone={dashboard.netMargin < 0.1 ? "risk" : "support"}
        />
        <MetricCard
          label="Custo direto"
          value={`${formatPercent(dashboard.directCostPercent)}%`}
          hint={formatCurrency(dashboard.directCost)}
          tone="alert"
        />
        <MetricCard
          label="Equipe"
          value={profile.employees ?? "-"}
          hint="Informado no onboarding"
          tone="support"
        />
      </div>

      <div className="space-y-3">
        {dashboard.alerts.map((alert) => (
          <AlertCard
            key={alert.title}
            title={alert.title}
            description={alert.description}
            tone={alert.tone}
          />
        ))}
      </div>

      <section
        className={`rounded-2xl border p-5 shadow-soft ${
          opportunityStyles[dashboard.opportunity.tone]
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em]">
          Oportunidade de ganho
        </p>
        <h2 className="mt-3 font-title text-3xl font-bold text-norteia-text">
          {formatCurrency(dashboard.opportunity.bestOpportunity)}/mes
        </h2>
        <p className="mt-2 text-sm leading-6 text-norteia-text/78">
          Voce pode aumentar seu lucro em ate{" "}
          {formatCurrency(dashboard.opportunity.bestOpportunity)}/mes atacando
          a maior oportunidade financeira abaixo.
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-norteia-line bg-norteia-bg/24 p-4">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-bold text-norteia-text">
                Reduzir custo direto
              </span>
              <strong className="text-right text-sm font-bold text-norteia-primary">
                {formatCurrency(dashboard.opportunity.costGain)}/mes
              </strong>
            </div>
            <p className="mt-2 text-xs leading-5 text-norteia-muted">
              Se reduzir seu custo principal para o nivel ideal, pode liberar{" "}
              {formatCurrency(dashboard.opportunity.costGain)}/mes de lucro.
            </p>
          </div>

          <div className="rounded-2xl border border-norteia-line bg-norteia-bg/24 p-4">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-bold text-norteia-text">
                Melhorar margem
              </span>
              <strong className="text-right text-sm font-bold text-norteia-primary">
                {formatCurrency(dashboard.opportunity.marginGain)}/mes
              </strong>
            </div>
            <p className="mt-2 text-xs leading-5 text-norteia-muted">
              Chegar a {formatPercent(dashboard.opportunity.targetMargin)} de
              margem pode elevar seu lucro mensal para{" "}
              {formatCurrency(dashboard.revenue * dashboard.opportunity.targetMargin)}.
            </p>
          </div>

          <div className="rounded-2xl border border-norteia-line bg-norteia-bg/24 p-4">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-bold text-norteia-text">
                Ajustar preco
              </span>
              <strong className="text-right text-sm font-bold text-norteia-primary">
                {formatCurrency(dashboard.opportunity.priceGain)}/mes
              </strong>
            </div>
            <p className="mt-2 text-xs leading-5 text-norteia-muted">
              Quando a margem esta apertada, um ajuste de preco de 5% pode
              adicionar ate {formatCurrency(dashboard.opportunity.priceGain)}
              /mes ao lucro.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-norteia-line bg-norteia-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em]">
            Proxima acao pratica
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-norteia-text">
            {dashboard.opportunity.action}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            DRE simplificada
          </p>
          <h2 className="mt-2 font-title text-xl font-bold text-norteia-text">
            Resultado mensal
          </h2>
          <p className="mt-2 text-sm leading-6 text-norteia-muted">
            {dashboard.dataSourceLabel}. Esses numeros sao uma base de decisao;
            ajuste para refletir sua realidade.
          </p>
        </div>

        <div className="space-y-3">
          {dreRows.map(([label, value]) => {
            const numericValue = Number(value);
            const isProfit = label === "Lucro mensal";

            return (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-norteia-line pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-sm text-norteia-muted">{label}</span>
                <strong
                  className={`text-right text-sm font-bold ${
                    isProfit
                      ? numericValue < 0
                        ? "text-norteia-risk"
                        : "text-norteia-primary"
                      : numericValue < 0
                        ? "text-norteia-text"
                        : "text-norteia-primary"
                  }`}
                >
                  {numericValue < 0
                    ? `- ${formatCurrency(Math.abs(numericValue))}`
                    : formatCurrency(numericValue)}
                </strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-norteia-alert/35 bg-norteia-alert/10 p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-alert">
          Dinheiro deixado na mesa
        </p>
        <h2 className="mt-3 font-title text-2xl font-bold text-norteia-text">
          {formatCurrency(dashboard.missedMoney)}
        </h2>
        <p className="mt-2 text-sm leading-6 text-norteia-text/78">
          Se reduzir seu custo direto para o nivel ideal, pode liberar{" "}
          {formatCurrency(dashboard.missedMoney)}/mes de lucro.
        </p>
      </section>

      <section className="rounded-2xl border border-norteia-primary/35 bg-norteia-primary/10 p-5 shadow-glow">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
          Proxima acao sugerida
        </p>
        <p className="mt-3 text-base font-bold leading-7 text-norteia-text">
          {dashboard.nextAction}
        </p>
      </section>

      {profile.diagnosis?.summary ? (
        <AlertCard
          title={profile.diagnosis.title ?? "Diagnostico inicial"}
          description={profile.diagnosis.summary}
          tone="primary"
        />
      ) : null}
    </PageShell>
  );
}
