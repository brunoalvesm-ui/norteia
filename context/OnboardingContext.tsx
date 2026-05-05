"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

const aliquotaMap: Record<string, number> = {
  mei:              0.05,
  simples:          0.0725,
  lucro_presumido:  0.115,
  nao_sei:          0.0725,
};

const regimeLabelMap: Record<string, string> = {
  mei:             "MEI",
  simples:         "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  nao_sei:         "Simples Nacional (estimativa)",
};

export function calcularDiagnostico(data: OnboardingData): Diagnostico | null {
  if (!data.faturamento || !data.tipo) return null;

  const fat    = faturamentoMap[data.faturamento] ?? 35000;
  const regime = data.regime || "nao_sei";
  const aliq   = aliquotaMap[regime] ?? 0.0725;
  const impostos = Math.round(fat * aliq);

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

  const concluir = () => setData(prev => ({ ...prev, concluido: true }));
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
