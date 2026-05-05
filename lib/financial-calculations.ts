export type BusinessType = "Comercio" | "Servico" | "Industria" | "Outro";

export type BusinessProfile = {
  businessType?: string;
  monthlyRevenue?: string;
  employees?: string;
  knowsProfit?: string;
  knowsMainCost?: string;
  diagnosis?: {
    level?: string;
    title?: string;
    summary?: string;
  };
};

export type FinancialRules = {
  directCost: number;
  fixedExpenses: number;
  taxes: number;
  idealDirectCost: number;
};

export const financialRulesByBusinessType: Record<BusinessType, FinancialRules> = {
  Comercio: {
    directCost: 0.55,
    fixedExpenses: 0.18,
    taxes: 0.08,
    idealDirectCost: 0.45,
  },
  Servico: {
    directCost: 0.25,
    fixedExpenses: 0.22,
    taxes: 0.1,
    idealDirectCost: 0.2,
  },
  Industria: {
    directCost: 0.5,
    fixedExpenses: 0.2,
    taxes: 0.09,
    idealDirectCost: 0.42,
  },
  Outro: {
    directCost: 0.4,
    fixedExpenses: 0.2,
    taxes: 0.09,
    idealDirectCost: 0.35,
  },
};

export function normalizeText(value?: string) {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeBusinessType(value?: string): BusinessType {
  const normalized = normalizeText(value);

  if (normalized === "comercio") {
    return "Comercio";
  }

  if (normalized === "servico") {
    return "Servico";
  }

  if (normalized === "industria") {
    return "Industria";
  }

  return "Outro";
}

export function getEstimatedRevenue(monthlyRevenue?: string) {
  const normalized = normalizeText(monthlyRevenue);

  if (normalized === "ate r$ 20 mil") {
    return 15000;
  }

  if (normalized === "r$ 20 mil a r$ 50 mil") {
    return 35000;
  }

  if (normalized === "r$ 50 mil a r$ 100 mil") {
    return 75000;
  }

  if (normalized === "acima de r$ 100 mil") {
    return 150000;
  }

  return 15000;
}

export function getFinancialRules(businessType?: string) {
  return financialRulesByBusinessType[normalizeBusinessType(businessType)];
}

export function calculateMargin(amount: number, revenue: number) {
  if (revenue === 0) {
    return 0;
  }

  return amount / revenue;
}

export function calculateMissedMoney(revenue: number, directCost: number, idealRate: number) {
  return Math.max(directCost - revenue * idealRate, 0);
}

export function calculateDre(profile: BusinessProfile) {
  const businessType = normalizeBusinessType(profile.businessType);
  const rules = financialRulesByBusinessType[businessType];
  const revenue = getEstimatedRevenue(profile.monthlyRevenue);
  const directCost = revenue * rules.directCost;
  const fixedExpenses = revenue * rules.fixedExpenses;
  const taxes = revenue * rules.taxes;
  const profit = revenue - directCost - fixedExpenses - taxes;
  const netMargin = calculateMargin(profit, revenue);
  const directCostPercent = calculateMargin(directCost, revenue);
  const missedMoney = calculateMissedMoney(revenue, directCost, rules.idealDirectCost);

  return {
    businessType,
    revenue,
    directCost,
    fixedExpenses,
    taxes,
    profit,
    netMargin,
    directCostPercent,
    missedMoney,
    rules,
  };
}

export function hasEmployees(employees?: string) {
  const normalized = normalizeText(employees);
  return normalized !== undefined && normalized !== "so eu";
}

export function calculatePayrollEstimate(revenue: number, employees?: string) {
  return hasEmployees(employees) ? revenue * 0.12 : 0;
}
