"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCard } from "@/components/alert-card";
import { PageShell } from "@/components/page-shell";
import { BUSINESS_PROFILE_STORAGE_KEY } from "@/lib/storage-keys";

const questions = [
  {
    id: "businessType",
    title: "Tipo de negocio",
    options: ["Comercio", "Servico", "Industria", "Outro"],
  },
  {
    id: "monthlyRevenue",
    title: "Faturamento medio mensal",
    options: [
      "Ate R$ 20 mil",
      "R$ 20 mil a R$ 50 mil",
      "R$ 50 mil a R$ 100 mil",
      "Acima de R$ 100 mil",
    ],
  },
  {
    id: "employees",
    title: "Quantidade de funcionarios",
    options: ["So eu", "1 a 3", "4 a 10", "Mais de 10"],
  },
  {
    id: "knowsProfit",
    title: "Voce sabe seu lucro hoje?",
    options: ["Sim, sei com precisao", "Tenho uma ideia", "Nao sei"],
  },
  {
    id: "knowsMainCost",
    title: "Voce sabe seu custo principal?",
    options: ["Sim", "Mais ou menos", "Nao sei"],
  },
] as const;

type QuestionId = (typeof questions)[number]["id"];
type Answers = Partial<Record<QuestionId, string>>;

function createDiagnosis(answers: Answers) {
  const weakProfitClarity =
    answers.knowsProfit === "Tenho uma ideia" || answers.knowsProfit === "Nao sei";
  const weakCostClarity =
    answers.knowsMainCost === "Mais ou menos" || answers.knowsMainCost === "Nao sei";
  const largerOperation =
    answers.employees === "4 a 10" || answers.employees === "Mais de 10";

  if (weakProfitClarity && weakCostClarity) {
    return {
      level: "priority",
      title: "Clareza financeira como prioridade",
      summary:
        "O primeiro passo da Norteia sera organizar lucro, custos e rotina de acompanhamento.",
    };
  }

  if (largerOperation || weakProfitClarity) {
    return {
      level: "attention",
      title: "Boa base, com pontos para aprofundar",
      summary:
        "O negocio ja tem estrutura para acompanhar indicadores e transformar dados em decisoes.",
    };
  }

  return {
    level: "stable",
    title: "Base inicial bem orientada",
    summary:
      "A Norteia pode ajudar a manter previsibilidade e criar uma rotina financeira mais consistente.",
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const currentQuestion = questions[currentStep];
  const progress = Math.round(((currentStep + 1) / questions.length) * 100);
  const selectedAnswer = answers[currentQuestion.id];
  const isLastStep = currentStep === questions.length - 1;

  const diagnosis = useMemo(() => createDiagnosis(answers), [answers]);

  function selectAnswer(questionId: QuestionId, answer: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer,
    }));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function goNext() {
    if (!selectedAnswer) {
      return;
    }

    if (!isLastStep) {
      setCurrentStep((step) => step + 1);
      return;
    }

    const completedProfile = {
      businessType: answers.businessType,
      monthlyRevenue: answers.monthlyRevenue,
      employees: answers.employees,
      knowsProfit: answers.knowsProfit,
      knowsMainCost: answers.knowsMainCost,
      diagnosis,
      completedAt: new Date().toISOString(),
    };

    localStorage.setItem(BUSINESS_PROFILE_STORAGE_KEY, JSON.stringify(completedProfile));
    router.push("/dashboard");
  }

  return (
    <PageShell
      eyebrow="Onboarding"
      title="Primeiros passos"
      description="Responda cinco perguntas para criar o perfil inicial do negocio."
    >
      <div className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
            <span>
              Etapa {currentStep + 1} de {questions.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-norteia-card-2">
            <div
              className="h-full rounded-full bg-norteia-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <fieldset className="space-y-4">
          <legend className="font-title text-2xl font-bold leading-tight text-norteia-text">
            {currentQuestion.title}
          </legend>

          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectAnswer(currentQuestion.id, option)}
                  className={`min-h-14 rounded-2xl border px-4 text-left text-sm font-bold transition ${
                    isSelected
                      ? "border-norteia-primary bg-norteia-primary text-norteia-bg shadow-glow"
                      : "border-norteia-line bg-norteia-card-2 text-norteia-text hover:border-norteia-primary/50"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 grid grid-cols-[0.8fr_1.2fr] gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!selectedAnswer}
            className="h-12 rounded-2xl bg-norteia-primary px-4 text-sm font-bold text-norteia-bg shadow-glow transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isLastStep ? "Finalizar" : "Continuar"}
          </button>
        </div>
      </div>

      <AlertCard
        title={diagnosis.title}
        description={diagnosis.summary}
        tone={diagnosis.level === "priority" ? "alert" : "primary"}
      />
    </PageShell>
  );
}
