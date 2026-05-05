"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { AlertCard } from "@/components/alert-card";
import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import {
  BusinessProfile,
  calculateDre,
  normalizeText,
} from "@/lib/financial-calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { BUSINESS_PROFILE_STORAGE_KEY } from "@/lib/storage-keys";

type AlertTone = "support" | "alert" | "risk" | "primary";

function knowsNothing(value?: string) {
  return normalizeText(value) === "nao sei";
}

function buildDashboard(profile: BusinessProfile) {
  const dre = calculateDre(profile);
  const hasHighCost = dre.directCostPercent > dre.rules.idealDirectCost;
  const hasLowMargin = dre.netMargin < 0.1;

  const alerts: Array<{
    title: string;
    description: string;
    tone: AlertTone;
  }> = [];

  if (hasLowMargin) {
    alerts.push({
      title: "Lucro baixo",
      description:
        "Sua margem liquida estimada esta abaixo de 10%. Vale revisar precos, custos e despesas fixas.",
      tone: "risk",
    });
  }

  if (hasHighCost) {
    alerts.push({
      title: "Custo direto acima do ideal",
      description: `O custo direto estimado esta em ${formatPercent(
        dre.directCostPercent,
      )}%, acima da referencia de ${formatPercent(dre.rules.idealDirectCost)}%.`,
      tone:
        dre.directCostPercent - dre.rules.idealDirectCost > 0.08
          ? "risk"
          : "alert",
    });
  }

  if (knowsNothing(profile.knowsProfit)) {
    alerts.push({
      title: "Clareza de lucro",
      description:
        "Voce ainda nao tem clareza do lucro real. O proximo passo e separar receita, custos, despesas e impostos.",
      tone: "support",
    });
  }

  if (knowsNothing(profile.knowsMainCost)) {
    alerts.push({
      title: "Custo principal",
      description:
        "Seu custo principal precisa ser mapeado para revelar onde existe perda de margem.",
      tone: "support",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Base saudavel",
      description:
        "Seu diagnostico inicial indica boa organizacao. Agora o foco e criar previsibilidade.",
      tone: "primary",
    });
  }

  const nextAction = hasHighCost
    ? "Mapeie seus principais custos e negocie fornecedores."
    : hasLowMargin
      ? "Revise precos e despesas fixas."
      : "Agora o foco e previsibilidade de caixa.";

  return {
    ...dre,
    alerts,
    nextAction,
  };
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
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

    setHasLoadedProfile(true);
  }, []);

  const dashboard = useMemo(
    () => (profile ? buildDashboard(profile) : null),
    [profile],
  );

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
    ["Receita estimada", dashboard.revenue],
    ["Custo direto", -dashboard.directCost],
    ["Despesas fixas", -dashboard.fixedExpenses],
    ["Impostos", -dashboard.taxes],
    ["Lucro estimado", dashboard.profit],
  ];

  return (
    <PageShell
      eyebrow="Dashboard"
      title={`Visao inicial: ${dashboard.businessType}`}
      description="Estimativas geradas a partir do perfil salvo no onboarding."
    >
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Receita"
          value={formatCurrency(dashboard.revenue)}
          hint="Faturamento medio estimado"
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

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            DRE simplificada
          </p>
          <h2 className="mt-2 font-title text-xl font-bold text-norteia-text">
            Resultado estimado mensal
          </h2>
        </div>

        <div className="space-y-3">
          {dreRows.map(([label, value]) => {
            const numericValue = Number(value);
            const isProfit = label === "Lucro estimado";

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
          Voce pode estar deixando {formatCurrency(dashboard.missedMoney)}
          /mes na mesa por custo acima do ideal.
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
