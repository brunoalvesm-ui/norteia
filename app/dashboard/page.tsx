"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { AlertCard } from "@/components/alert-card";
import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import {
  BusinessProfile,
  Sale,
  calculateDre,
  generateRestaurantInsights,
  normalizeText,
} from "@/lib/financial-calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import {
  BUSINESS_PROFILE_STORAGE_KEY,
  SALES_STORAGE_KEY,
} from "@/lib/storage-keys";

function knowsNothing(value?: string) {
  return normalizeText(value) === "nao sei";
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

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
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

    setSales(readSales());
    setHasLoadedProfile(true);
  }, []);

  const dashboard = useMemo(
    () => (profile ? calculateDre(profile, null, sales) : null),
    [profile, sales],
  );
  const restaurantInsights = useMemo(
    () => generateRestaurantInsights(sales, getTodayValue()).slice(0, 3),
    [sales],
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

  const hasHighCost = dashboard.directCostPercent > dashboard.rules.idealDirectCost;
  const hasLowMargin = dashboard.netMargin < 0.1;
  const dreRows: Array<[string, number]> = [
    ["Receita mensal", dashboard.revenue],
    ["Custo direto", -dashboard.directCost],
    ["Despesas fixas", -dashboard.fixedExpenses],
    [dashboard.taxInfo.label, -dashboard.taxes],
    ["Lucro mensal", dashboard.profit],
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
          hint="Estimativa inicial"
        />
        <MetricCard
          label="Lucro"
          value={formatCurrency(dashboard.profit)}
          hint={`${formatPercent(dashboard.netMargin)}% de margem liquida`}
          tone={hasLowMargin ? "risk" : "support"}
        />
        <MetricCard
          label="Custo direto"
          value={`${formatPercent(dashboard.directCostPercent)}%`}
          hint={formatCurrency(dashboard.directCost)}
          tone={hasHighCost ? "alert" : "primary"}
        />
        <MetricCard
          label="Imposto"
          value={formatCurrency(dashboard.taxes)}
          hint={dashboard.taxInfo.label}
          tone={dashboard.taxInfo.regime === "MEI" ? "support" : "primary"}
        />
      </div>

      <div className="space-y-3">
        {hasLowMargin ? (
          <AlertCard
            title="Risco financeiro: lucro baixo"
            description={`Seu lucro estimado e de ${formatCurrency(
              dashboard.profit,
            )}/mes, uma margem de ${formatPercent(
              dashboard.netMargin,
            )}. Revise preco, custo e despesas fixas.`}
            tone="risk"
          />
        ) : null}

        {hasHighCost ? (
          <AlertCard
            title="Atencao: custo consumindo caixa"
            description={`Seu custo direto esta consumindo ${formatCurrency(
              dashboard.directCost,
            )}/mes. Se reduzir para o nivel ideal, pode liberar ${formatCurrency(
              dashboard.missedMoney,
            )}/mes de lucro.`}
            tone="alert"
          />
        ) : null}

        {dashboard.taxInfo.regime === "MEI" ? (
          <AlertCard
            title="Imposto previsivel no MEI"
            description={`Seu imposto foi tratado como ${dashboard.taxInfo.label}: cerca de ${formatCurrency(
              dashboard.taxes,
            )}/mes. No MEI, ele costuma ser fixo e nao percentual sobre faturamento.`}
            tone="support"
          />
        ) : (
          <AlertCard
            title={dashboard.taxInfo.label}
            description={`${formatCurrency(
              dashboard.taxes,
            )}/mes foi usado como imposto estimado. ${dashboard.taxInfo.description}`}
            tone={dashboard.taxInfo.regime === "Nao sei" ? "support" : "primary"}
          />
        )}

        {knowsNothing(profile.knowsProfit) ? (
          <AlertCard
            title="Lucro real ainda incerto"
            description={`Hoje o Norteia estima ${formatCurrency(
              dashboard.profit,
            )}/mes de lucro. Ajuste seus numeros para confirmar se esse dinheiro realmente sobra.`}
            tone="support"
          />
        ) : null}
      </div>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            DRE simplificada
          </p>
          <h2 className="mt-2 font-title text-xl font-bold text-norteia-text">
            Resultado mensal
          </h2>
        </div>

        <div className="space-y-3">
          {dreRows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 border-b border-norteia-line pb-3 last:border-b-0 last:pb-0"
            >
              <span className="text-sm text-norteia-muted">{label}</span>
              <strong
                className={`text-right text-sm font-bold ${
                  label === "Lucro mensal"
                    ? value < 0
                      ? "text-norteia-risk"
                      : "text-norteia-primary"
                    : "text-norteia-text"
                }`}
              >
                {value < 0
                  ? `- ${formatCurrency(Math.abs(value))}`
                  : formatCurrency(value)}
              </strong>
            </div>
          ))}
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

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            Restaurante hoje
          </p>
          <h2 className="mt-2 font-title text-xl font-bold text-norteia-text">
            Gatilhos inteligentes
          </h2>
        </div>
        {restaurantInsights.map((insight) => (
          <AlertCard
            key={`${insight.title}-${insight.description}`}
            title={insight.title}
            description={insight.description}
            tone={insight.tone}
          />
        ))}
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
