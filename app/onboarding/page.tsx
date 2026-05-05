"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useOnboarding,
  TipoNegocio,
  FaixaFaturamento,
  QtdFuncionarios,
  ConheceLucro,
  RegimeTributario,
  calcularDiagnostico,
} from "@/context/OnboardingContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Etapa {step} de {total}</span>
        <span>{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  icon,
  label,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-500/10 text-white"
          : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500"
      }`}
    >
      <span className="text-2xl mr-3">{icon}</span>
      <span className="font-medium">{label}</span>
      {sub && <p className="text-xs text-gray-400 mt-1 ml-9">{sub}</p>}
    </button>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { data, setField, concluir } = useOnboarding();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const TOTAL = 5;

  function next() { setStep(s => Math.min(s + 1, TOTAL + 1)); }
  function back() { setStep(s => Math.max(s - 1, 1)); }

  function finalizar() {
    concluir();
    router.push("/dashboard");
  }

  // ── Etapa 1 — Tipo de negócio ──────────────────────────────────────────────
  if (step === 1) return (
    <Screen>
      <ProgressBar step={1} total={TOTAL} />
      <h1 className="text-2xl font-bold text-white mb-1">Qual é o seu negócio?</h1>
      <p className="text-sm text-gray-400 mb-6">Isso personaliza seus diagnósticos.</p>
      <div className="space-y-3">
        {([
          ["comercio",  "🛒", "Comércio",   "Loja, mercado, distribuidora"],
          ["servico",   "🔧", "Serviço",    "Oficina, clínica, consultoria"],
          ["industria", "🏭", "Indústria",  "Fabricação, produção"],
          ["outro",     "💼", "Outro",      "Alimentação, tech, outros"],
        ] as [TipoNegocio, string, string, string][]).map(([val, icon, label, sub]) => (
          <OptionCard
            key={val}
            selected={data.tipo === val}
            onClick={() => setField("tipo", val)}
            icon={icon}
            label={label}
            sub={sub}
          />
        ))}
      </div>
      <NavButtons onNext={next} nextDisabled={!data.tipo} showBack={false} />
    </Screen>
  );

  // ── Etapa 2 — Faturamento ──────────────────────────────────────────────────
  if (step === 2) return (
    <Screen>
      <ProgressBar step={2} total={TOTAL} />
      <h1 className="text-2xl font-bold text-white mb-1">Qual é seu faturamento mensal?</h1>
      <p className="text-sm text-gray-400 mb-6">Estimativa está ótimo.</p>
      <div className="space-y-3">
        {([
          ["ate20",   "≤ R$ 20 mil",         "Negócio em crescimento inicial"],
          ["20a50",   "R$ 20 mil a R$ 50 mil", "Porte pequeno consolidado"],
          ["50a100",  "R$ 50 mil a R$ 100 mil","Porte médio-pequeno"],
          ["100mais", "Acima de R$ 100 mil",   "Porte médio"],
        ] as [FaixaFaturamento, string, string][]).map(([val, label, sub]) => (
          <OptionCard
            key={val}
            selected={data.faturamento === val}
            onClick={() => setField("faturamento", val)}
            icon={val === "ate20" ? "💰" : val === "20a50" ? "💵" : val === "50a100" ? "📈" : "🏦"}
            label={label}
            sub={sub}
          />
        ))}
      </div>
      <NavButtons onNext={next} onBack={back} nextDisabled={!data.faturamento} />
    </Screen>
  );

  // ── Etapa 3 — Funcionários ─────────────────────────────────────────────────
  if (step === 3) return (
    <Screen>
      <ProgressBar step={3} total={TOTAL} />
      <h1 className="text-2xl font-bold text-white mb-1">Você tem funcionários?</h1>
      <p className="text-sm text-gray-400 mb-6">Impacta no cálculo do seu custo real.</p>
      <div className="space-y-3">
        {([
          ["nenhum", "👤", "Só eu",        "Sem CLT ou terceiros fixos"],
          ["1a3",    "👥", "1 a 3",         "Equipe pequena"],
          ["4a10",   "👨‍👩‍👧‍👦", "4 a 10",        "Equipe em crescimento"],
          ["mais10", "🏢", "Mais de 10",   "Empresa estruturada"],
        ] as [QtdFuncionarios, string, string, string][]).map(([val, icon, label, sub]) => (
          <OptionCard
            key={val}
            selected={data.funcionarios === val}
            onClick={() => setField("funcionarios", val)}
            icon={icon}
            label={label}
            sub={sub}
          />
        ))}
      </div>
      <NavButtons onNext={next} onBack={back} nextDisabled={!data.funcionarios} />
    </Screen>
  );

  // ── Etapa 4 — Conhece o lucro ──────────────────────────────────────────────
  if (step === 4) return (
    <Screen>
      <ProgressBar step={4} total={TOTAL} />
      <h1 className="text-2xl font-bold text-white mb-1">Você sabe seu lucro hoje?</h1>
      <p className="text-sm text-gray-400 mb-6">Seja honesto — isso é para te ajudar.</p>
      <div className="space-y-3">
        {([
          ["sim",            "✅", "Sim, sei com precisão",            "Tenho controle financeiro claro"],
          ["mais_ou_menos",  "🤔", "Tenho uma ideia, mais ou menos",   "Sinto que estou lucrando, mas não sei exato"],
          ["nao",            "😅", "Honestamente, não sei",            "Misturo pessoal e empresa, não controlo bem"],
        ] as [ConheceLucro, string, string, string][]).map(([val, icon, label, sub]) => (
          <OptionCard
            key={val}
            selected={data.conheceLucro === val}
            onClick={() => setField("conheceLucro", val)}
            icon={icon}
            label={label}
            sub={sub}
          />
        ))}
      </div>
      <NavButtons onNext={next} onBack={back} nextDisabled={!data.conheceLucro} />
    </Screen>
  );

  // ── Etapa 5 — Regime tributário ────────────────────────────────────────────
  if (step === 5) return (
    <Screen>
      <ProgressBar step={5} total={TOTAL} />
      <h1 className="text-2xl font-bold text-white mb-1">Qual seu regime tributário?</h1>
      <p className="text-sm text-gray-400 mb-6">Se não souber, selecione "Não sei" — estimaremos.</p>
      <div className="space-y-3">
        {([
          ["mei",             "🪪", "MEI",                "Fatura até R$ 81 mil/ano"],
          ["simples",         "📋", "Simples Nacional",   "Mais comum para pequenas empresas"],
          ["lucro_presumido", "🏛️", "Lucro Presumido",    "Empresas maiores ou profissões regulamentadas"],
          ["nao_sei",         "❓", "Não sei",             "Vamos estimar pelo Simples Nacional"],
        ] as [RegimeTributario, string, string, string][]).map(([val, icon, label, sub]) => (
          <OptionCard
            key={val}
            selected={data.regime === val}
            onClick={() => setField("regime", val)}
            icon={icon}
            label={label}
            sub={sub}
          />
        ))}
      </div>
      <NavButtons onNext={next} onBack={back} nextDisabled={!data.regime} nextLabel="Ver diagnóstico 🔍" />
    </Screen>
  );

  // ── Etapa 6 — Diagnóstico final ────────────────────────────────────────────
  const diag = calcularDiagnostico(data);

  return (
    <Screen>
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔍</div>
        <h1 className="text-2xl font-bold text-white">Seu diagnóstico inicial</h1>
        <p className="text-sm text-gray-400 mt-1">
          Baseado no perfil:{" "}
          <span className="text-emerald-400 font-medium capitalize">{data.tipo}</span>
          {" · "}
          <span className="text-emerald-400 font-medium">{data.regime?.replace("_", " ")}</span>
        </p>
      </div>

      {diag && (
        <div className="space-y-4">
          {/* Estimativas principais */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-3">
              ⚡ Estimativa do seu cenário
            </p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-gray-900/60 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Impostos estimados</p>
                <p className="text-xl font-bold text-white">{fmt(diag.impostosEstimados)}</p>
                <p className="text-xs text-gray-500">por mês ({diag.regimeLabel})</p>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Sua margem provável</p>
                <p className="text-xl font-bold text-white">{diag.margemMin}% – {diag.margemMax}%</p>
                <p className="text-xs text-gray-500">do faturamento</p>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Lucro estimado</p>
                <p className="text-xl font-bold text-emerald-400">{fmt(diag.lucroMin)} – {fmt(diag.lucroMax)}</p>
                <p className="text-xs text-gray-500">por mês</p>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">CMV ideal p/ você</p>
                <p className="text-xl font-bold text-white">≤ {diag.cmvIdeal}%</p>
                <p className="text-xs text-gray-500">da receita</p>
              </div>
            </div>
          </div>

          {/* Alerta principal */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Atenção</p>
              <p className="text-sm text-gray-300 leading-relaxed">{diag.alertaPrincipal}</p>
            </div>
          </div>

          {/* Dica principal */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-sm font-semibold text-blue-300 mb-1">Onde agir primeiro</p>
              <p className="text-sm text-gray-300 leading-relaxed">{diag.dicaPrincipal}</p>
            </div>
          </div>

          {/* Nota */}
          <p className="text-xs text-gray-500 text-center">
            Valores estimados com base no seu perfil. Refine no painel com seus dados reais.
          </p>
        </div>
      )}

      <button
        onClick={finalizar}
        className="w-full mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold rounded-xl transition-colors"
      >
        Abrir meu painel →
      </button>
    </Screen>
  );
}

// ── Wrappers reutilizáveis ────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex justify-center px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function NavButtons({
  onNext,
  onBack,
  nextDisabled,
  showBack = true,
  nextLabel = "Continuar →",
}: {
  onNext: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  showBack?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3 mt-8">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-500 transition-colors"
        >
          Voltar
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 py-3 bg-emerald-500 text-gray-900 font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {nextLabel}
      </button>
    </div>
  );
}
