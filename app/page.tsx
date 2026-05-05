import { ActionButton } from "@/components/action-button";
import { AlertCard } from "@/components/alert-card";
import { MetricCard } from "@/components/metric-card";

export default function HomePage() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col justify-between gap-8">
      <div className="space-y-8 pt-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-norteia-primary">
            Norteia
          </p>
          <h1 className="font-title text-5xl font-bold leading-[1.02] text-norteia-text">
            Clareza para guiar a rotina financeira.
          </h1>
          <p className="text-base leading-7 text-norteia-muted">
            Base mobile-first para o SaaS, com paginas principais preparadas
            para receber os proximos fluxos.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Saude" value="82%" hint="Indice visual" />
          <MetricCard
            label="Risco"
            value="Baixo"
            hint="Prioridade atual"
            tone="support"
          />
        </div>

        <AlertCard
          title="Estrutura visual"
          description="Identidade premium aplicada sem regras de negocio ou calculos."
          tone="primary"
        />
      </div>

      <div className="mb-4 grid gap-3">
        <ActionButton href="/onboarding">Comecar</ActionButton>
        <ActionButton href="/dashboard" variant="secondary">
          Ver dashboard
        </ActionButton>
      </div>
    </section>
  );
}
