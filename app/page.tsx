import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { NorteiaLogo } from "@/components/norteia-logo";

export default function HomePage() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col justify-between gap-8">
      <div className="space-y-8 pt-8">
        <div className="space-y-4">
          <NorteiaLogo />
          <h1 className="font-title text-5xl font-bold leading-[1.02] text-norteia-text">
            Clareza para guiar a rotina financeira.
          </h1>
          <p className="text-base leading-7 text-norteia-muted">
            Descubra em poucos minutos se o seu negocio esta lucrando e quais
            decisoes podem aumentar seu resultado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Saude"
            value="82%"
            hint="Visao geral da saude financeira"
          />
          <MetricCard
            label="Risco"
            value="Baixo"
            hint="Nivel de risco do negocio"
            tone="support"
          />
        </div>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
              O que voce encontra no Norteia
            </p>
          </div>

          <div className="grid gap-3">
            {[
              [
                "Entenda seu lucro",
                "Veja quanto seu negocio realmente gera de resultado.",
              ],
              [
                "Preveja seu caixa",
                "Saiba se vai faltar dinheiro antes que aconteca.",
              ],
              [
                "Tome decisoes melhores",
                "Descubra o que fazer para melhorar seus numeros.",
              ],
            ].map(([title, description]) => (
              <article
                key={title}
                className="rounded-2xl border border-norteia-primary/20 bg-norteia-card p-5 shadow-soft"
              >
                <h2 className="font-title text-lg font-bold text-norteia-text">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-norteia-muted">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mb-4 grid gap-3">
        <div className="grid gap-2">
          <ActionButton href="/onboarding">Comecar analise</ActionButton>
          <p className="text-center text-xs font-bold text-norteia-muted">
            Leva menos de 2 minutos
          </p>
        </div>
        <ActionButton href="/dashboard" variant="secondary">
          Ver dashboard
        </ActionButton>
      </div>
    </section>
  );
}
