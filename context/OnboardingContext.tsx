"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { calculateEstimatedTaxes } from "@/lib/financial-calculations";
import { BUSINESS_PROFILE_STORAGE_KEY } from "@/lib/storage-keys";

export type TipoNegocio = "comercio" | "servico" | "industria" | "outro" | "";
export type FaixaFaturamento = "ate20" | "20a50" | "50a100" | "100mais" | "";
export type QtdFuncionarios = "nenhum" | "1a3" | "4a10" | "mais10" | "";
export type ConheceLucro = "sim" | "mais_ou_menos" | "nao" | "";
export type RegimeTributario = "simples" | "lucro_presumido" | "mei" | "nao_sei" | "";

export interface OnboardingData {
  tipo: TipoNegocio;
  faturamento: FaixaFaturamento;
  funcionarios: QtdFuncionarios;
  conheceLucro: ConheceLucro;
  regime: RegimeTributario;
  concluido: boolean;
}

export interface Diagnostico {
  faturamentoMedio: number;       // R$ médio da faixa
  impostosEstimados: number;      // R$
  margemMin: number;              // %
  margemMax: number;              // %
  lucroMin: number;               // R$
  lucroMax: number;               // R$
  cmvIdeal: number;               // % ideal para o tipo
  alertaPrincipal: string;
  dicaPrincipal: string;
  regimeLabel: string;
  impostoLabel: string;
}

const STORAGE_KEY = "norteia_onboarding";

const defaultData: OnboardingData = {
  tipo: "",
  faturamento: "",
  funcionarios: "",
  conheceLucro: "",
  regime: "",
  concluido: false,
};

// ── Cálculo de diagnóstico ──────────────────────────────────────────────────

const faturamentoMap: Record<string, number> = {
  ate20:   15000,
  "20a50": 35000,
  "50a100": 75000,
  "100mais": 130000,
};

const margemMap: Record<string, [number, number]> = {
  comercio:  [8,  18],
  servico:   [20, 40],
  industria: [10, 22],
  outro:     [10, 25],
};

const cmvIdealMap: Record<string, number> = {
  comercio:  45,
  servico:   25,
  industria: 50,
  outro:     40,
};

const regimeLabelMap: Record<string, string> = {
  mei:             "MEI",
  simples:         "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  nao_sei:         "Nao sei",
};

export function calcularDiagnostico(data: OnboardingData): Diagnostico | null {
  if (!data.faturamento || !data.tipo) return null;

  const fat    = faturamentoMap[data.faturamento] ?? 35000;
  const regime = data.regime || "nao_sei";
  const taxInfo = calculateEstimatedTaxes(fat, data.tipo, regime);
  const impostos = Math.round(taxInfo.amount);

  const [mMin, mMax] = margemMap[data.tipo] ?? [10, 20];
  const lucroMin = Math.round(fat * mMin / 100);
  const lucroMax = Math.round(fat * mMax / 100);
  const cmvIdeal = cmvIdealMap[data.tipo] ?? 40;

  // Alerta principal por tipo
  const alertas: Record<string, string> = {
    comercio:  "No comércio, o CMV costuma ser o maior vilão do lucro. Se você não controla compras, perde margem sem perceber.",
    servico:   "Em serviços, o tempo é o seu principal custo. Precificar sem considerar horas trabalhadas destrói sua margem.",
    industria: "Na indústria, custos fixos elevados exigem volume mínimo. Você sabe qual é o seu ponto de equilíbrio?",
    outro:     "Sem clareza dos custos fixos vs. variáveis, é impossível saber se você está lucrando de verdade.",
  };

  if (regime === "mei") {
    alertas[data.tipo] =
      "Seu imposto no MEI costuma ser previsivel e fixo. O ponto de atencao fica em preco, custo e rotina de caixa.";
  }

  const dicas: Record<string, string> = {
    comercio:  "Revisar o CMV e aumentar o preço médio em 5–8% pode elevar seu lucro em até 60% sem vender mais.",
    servico:   "Cobrar por entrega (e não por hora) costuma aumentar margem em 15–30% no setor de serviços.",
    industria: "Mapear os 3 maiores custos fixos e questionar cada um deles é o passo inicial mais rentável.",
    outro:     "Separar as contas pessoais das empresariais é o primeiro passo para enxergar o lucro real.",
  };

  return {
    faturamentoMedio: fat,
    impostosEstimados: impostos,
    margemMin: mMin,
    margemMax: mMax,
    lucroMin,
    lucroMax,
    cmvIdeal,
    alertaPrincipal: alertas[data.tipo] ?? alertas.outro,
    dicaPrincipal:   dicas[data.tipo]   ?? dicas.outro,
    regimeLabel:     regimeLabelMap[regime] ?? "Simples Nacional",
    impostoLabel:    taxInfo.label,
  };
}

// ── Context ─────────────────────────────────────────────────────────────────

interface OnboardingContextType {
  data: OnboardingData;
  diagnostico: Diagnostico | null;
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  concluir: () => void;
  resetar: () => void;
}

const businessTypeMap: Record<Exclude<TipoNegocio, "">, string> = {
  comercio: "Comercio",
  servico: "Servico",
  industria: "Industria",
  outro: "Outro",
};

const monthlyRevenueMap: Record<Exclude<FaixaFaturamento, "">, string> = {
  ate20: "Ate R$ 20 mil",
  "20a50": "R$ 20 mil a R$ 50 mil",
  "50a100": "R$ 50 mil a R$ 100 mil",
  "100mais": "Acima de R$ 100 mil",
};

const employeesMap: Record<Exclude<QtdFuncionarios, "">, string> = {
  nenhum: "So eu",
  "1a3": "1 a 3",
  "4a10": "4 a 10",
  mais10: "Mais de 10",
};

const knowsProfitMap: Record<Exclude<ConheceLucro, "">, string> = {
  sim: "Sim, sei com precisao",
  mais_ou_menos: "Tenho uma ideia",
  nao: "Nao sei",
};

function saveBusinessProfile(data: OnboardingData) {
  if (!data.tipo || !data.faturamento || !data.funcionarios) {
    return;
  }

  const diagnosis = calcularDiagnostico(data);

  localStorage.setItem(
    BUSINESS_PROFILE_STORAGE_KEY,
    JSON.stringify({
      businessType: businessTypeMap[data.tipo],
      monthlyRevenue: monthlyRevenueMap[data.faturamento],
      employees: employeesMap[data.funcionarios],
      knowsProfit: data.conheceLucro ? knowsProfitMap[data.conheceLucro] : "Nao sei",
      knowsMainCost: "Nao sei",
      taxRegime: regimeLabelMap[data.regime || "nao_sei"],
      diagnosis: {
        level: data.conheceLucro === "nao" ? "alert" : "primary",
        title: "Diagnostico inicial",
        summary:
          diagnosis?.alertaPrincipal ??
          "Estimativa inicial criada a partir do seu perfil.",
      },
    }),
  );
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);

  // Carrega do localStorage na montagem
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) setData(JSON.parse(salvo));
    } catch {}
  }, []);

  // Salva no localStorage a cada mudança
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const setField = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const concluir = () => {
    saveBusinessProfile(data);
    setData(prev => ({ ...prev, concluido: true }));
  };
  const resetar  = () => { setData(defaultData); localStorage.removeItem(STORAGE_KEY); };

  const diagnostico = calcularDiagnostico(data);

  return (
    <OnboardingContext.Provider value={{ data, diagnostico, setField, concluir, resetar }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding deve ser usado dentro de OnboardingProvider");
  return ctx;
}
